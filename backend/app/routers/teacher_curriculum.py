from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.curriculum import CurriculumListOut
from app.schemas.teacher_curriculum import (
    TeacherCurriculumListOut,
    TeacherCurriculumOut,
    TeacherCurriculumWrite,
)
from app.services.curriculum_sheets import get_curriculum_programs
from app.services import teacher_curriculum as teacher_curriculum_service

router = APIRouter()


@router.get("", response_model=CurriculumListOut)
async def list_curriculum_programs(
    _teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    data, _, _ = await get_curriculum_programs(force_refresh=False)
    return data


@router.get("/custom", response_model=TeacherCurriculumListOut)
async def list_custom_curricula(
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await teacher_curriculum_service.list_teacher_curricula(db, teacher)


@router.get("/custom/{curriculum_id}", response_model=TeacherCurriculumOut)
async def get_custom_curriculum(
    curriculum_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await teacher_curriculum_service.get_teacher_curriculum(db, curriculum_id, teacher)


@router.post("/custom", response_model=TeacherCurriculumOut, status_code=201)
async def create_custom_curriculum(
    body: TeacherCurriculumWrite,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await teacher_curriculum_service.create_teacher_curriculum(db, teacher, body)


@router.put("/custom/{curriculum_id}", response_model=TeacherCurriculumOut)
async def update_custom_curriculum(
    curriculum_id: int,
    body: TeacherCurriculumWrite,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await teacher_curriculum_service.update_teacher_curriculum(
        db, curriculum_id, teacher, body
    )


@router.delete("/custom/{curriculum_id}", status_code=204)
async def delete_custom_curriculum(
    curriculum_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    await teacher_curriculum_service.delete_teacher_curriculum(db, curriculum_id, teacher)
