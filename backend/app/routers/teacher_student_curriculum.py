from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.routers.teacher_optimate import _resolve_teacher_id
from app.schemas.student_curriculum import (
    AssignCurriculumIn,
    EnrollmentDetailOut,
    EventTopicOut,
    SlotOut,
    SyncEventsOut,
    TeacherStudentCurriculumOut,
)
from app.services.student_curriculum import (
    assign_curriculum,
    get_enrollment_detail,
    get_event_topic,
    get_teacher_student_curriculum,
    mark_slot_completed,
    split_slot,
    sync_events_for_enrollment,
)

router = APIRouter()


@router.get("/students/{student_optimate_id}", response_model=TeacherStudentCurriculumOut)
async def teacher_student_curriculum(
    student_optimate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await get_teacher_student_curriculum(db, teacher_id, student_optimate_id)


@router.post("/assign", response_model=EnrollmentDetailOut)
async def assign_student_curriculum(
    payload: AssignCurriculumIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await assign_curriculum(db, current_user, teacher_id, payload, replace=False)


@router.post("/replace", response_model=EnrollmentDetailOut)
async def replace_student_curriculum(
    payload: AssignCurriculumIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await assign_curriculum(db, current_user, teacher_id, payload, replace=True)


@router.get("/enrollments/{enrollment_id}", response_model=EnrollmentDetailOut)
async def teacher_enrollment_detail(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await get_enrollment_detail(db, enrollment_id)


@router.post("/enrollments/{enrollment_id}/sync-events", response_model=SyncEventsOut)
async def teacher_sync_events(
    enrollment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await sync_events_for_enrollment(db, enrollment_id, teacher_id)


@router.post("/slots/{slot_id}/split", response_model=EnrollmentDetailOut)
async def teacher_split_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await split_slot(db, slot_id, teacher_id)


@router.post("/slots/{slot_id}/complete", response_model=SlotOut)
async def teacher_complete_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await mark_slot_completed(db, slot_id)


@router.get("/events/{event_id}/topic", response_model=EventTopicOut)
async def teacher_event_topic(
    event_id: str,
    student_optimate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await get_event_topic(db, event_id, student_optimate_id)
