from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.routers.teacher_optimate import _resolve_teacher_id
from app.schemas.teacher_settings import LessonAlertOut
from app.services.lesson_alert import get_teacher_lesson_alert

router = APIRouter()


@router.get("/lesson-alert", response_model=LessonAlertOut)
async def teacher_lesson_alert(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await get_teacher_lesson_alert(db, current_user, teacher_id)
