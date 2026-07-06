from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.routers.teacher_optimate import _resolve_teacher_id
from app.schemas.teacher_student_links import (
    StudentLinkCreateIn,
    StudentLinkOut,
    StudentLinkUpdateIn,
    TeacherStudentLinksOut,
)
from app.services.teacher_student_links import (
    _ensure_teacher_student_access,
    delete_teacher_student_link,
    get_teacher_student_links,
    update_teacher_student_link,
    upsert_teacher_student_link,
)

router = APIRouter()


@router.get("/students/{student_optimate_id}", response_model=TeacherStudentLinksOut)
async def teacher_student_links(
    student_optimate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    await _ensure_teacher_student_access(teacher_id, student_optimate_id)
    return await get_teacher_student_links(db, current_user, student_optimate_id)


@router.post("", response_model=StudentLinkOut)
async def create_teacher_student_link(
    payload: StudentLinkCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    return await upsert_teacher_student_link(
        db,
        current_user,
        teacher_id,
        payload.student_optimate_id,
        payload.link_type,
        payload.url,
        payload.label,
    )


@router.patch("/{link_id}", response_model=StudentLinkOut)
async def patch_teacher_student_link(
    link_id: int,
    payload: StudentLinkUpdateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await update_teacher_student_link(
        db,
        current_user,
        link_id,
        url=payload.url,
        label=payload.label,
    )


@router.delete("/{link_id}", status_code=204)
async def remove_teacher_student_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    await delete_teacher_student_link(db, current_user, link_id)
