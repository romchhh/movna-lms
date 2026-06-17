from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.routers.student_optimate import _resolve_student_id
from app.schemas.student_curriculum import (
    EnrollmentDetailOut,
    EventTopicOut,
    StudentCurriculumOverviewOut,
)
from app.services.student_curriculum import (
    get_enrollment_detail,
    get_event_topic,
    get_student_overview,
)

router = APIRouter()


@router.get("", response_model=StudentCurriculumOverviewOut)
async def student_curriculum_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    student_id = await _resolve_student_id(current_user, db)
    return await get_student_overview(db, student_id)


@router.get("/enrollments/{enrollment_id}", response_model=EnrollmentDetailOut)
async def student_enrollment_detail(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    student_id = await _resolve_student_id(current_user, db)
    return await get_enrollment_detail(db, enrollment_id, student_optimate_id=student_id)


@router.get("/events/{event_id}/topic", response_model=EventTopicOut)
async def student_event_topic(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    student_id = await _resolve_student_id(current_user, db)
    return await get_event_topic(db, event_id, student_optimate_id=student_id)
