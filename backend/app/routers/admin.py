from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.homework import Homework, HomeworkStatus
from app.schemas import AdminStats, UserOut

router = APIRouter()


@router.get("/stats", response_model=AdminStats)
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    total_students = (await db.execute(
        select(func.count()).where(User.role == UserRole.STUDENT)
    )).scalar()

    total_teachers = (await db.execute(
        select(func.count()).where(User.role == UserRole.TEACHER)
    )).scalar()

    total_courses = (await db.execute(
        select(func.count()).select_from(Course).where(Course.is_active == True)
    )).scalar()

    active_students = (await db.execute(
        select(func.count()).where(User.role == UserRole.STUDENT, User.is_active == True)
    )).scalar()

    hw_pending = (await db.execute(
        select(func.count()).select_from(Homework).where(
            Homework.status.in_([HomeworkStatus.SUBMITTED, HomeworkStatus.LATE])
        )
    )).scalar()

    return AdminStats(
        total_students=total_students or 0,
        total_teachers=total_teachers or 0,
        total_courses=total_courses or 0,
        active_students=active_students or 0,
        homework_pending_review=hw_pending or 0,
    )


@router.get("/users", response_model=list[UserOut])
async def list_users(
    role: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    q = select(User)
    if role:
        q = q.where(User.role == role)
    result = await db.execute(q.order_by(User.created_at.desc()).limit(200))
    return result.scalars().all()


@router.patch("/users/{user_id}/toggle-active")
async def toggle_active(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_active = not user.is_active
    return {"is_active": user.is_active if user else None}
