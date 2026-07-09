from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.routers.student_optimate import _resolve_student_id
from app.schemas.teacher_settings import LessonAlertOut, MeetingLinksOut
from app.services.lesson_alert import (
    get_student_lesson_alert,
    get_student_meeting_links_for_teacher,
)

router = APIRouter()


@router.get("/lesson-alert", response_model=LessonAlertOut)
async def student_lesson_alert(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    student_id = await _resolve_student_id(current_user, db)
    return await get_student_lesson_alert(db, student_id)


@router.get("/meeting-links", response_model=MeetingLinksOut)
async def student_meeting_links(
    teacher_id: str = Query(..., min_length=1, description="Optimate ID викладача"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    teacher_id = teacher_id.strip()
    if not teacher_id:
        raise HTTPException(status_code=400, detail="Невірний ID викладача")
    student_id = await _resolve_student_id(current_user, db)
    return await get_student_meeting_links_for_teacher(db, student_id, teacher_id)
