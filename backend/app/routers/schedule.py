from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.schedule import ScheduledClass, LessonBalance, ClassEnrollment
from app.schemas import ScheduledClassOut, BalanceOut

router = APIRouter()


@router.get("/my", response_model=list[ScheduledClassOut])
async def my_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if current_user.role == UserRole.TEACHER:
        result = await db.execute(
            select(ScheduledClass)
            .where(
                ScheduledClass.teacher_id == current_user.id,
                ScheduledClass.starts_at >= now - timedelta(days=1),
                ScheduledClass.is_cancelled == False,
            )
            .order_by(ScheduledClass.starts_at)
            .limit(50)
        )
    else:
        # student: find via enrollments
        enroll_result = await db.execute(
            select(ClassEnrollment.scheduled_class_id)
            .where(ClassEnrollment.student_id == current_user.id)
        )
        ids = [r[0] for r in enroll_result]
        result = await db.execute(
            select(ScheduledClass)
            .where(
                ScheduledClass.id.in_(ids),
                ScheduledClass.starts_at >= now - timedelta(days=1),
                ScheduledClass.is_cancelled == False,
            )
            .order_by(ScheduledClass.starts_at)
        )
    return result.scalars().all()


@router.get("/balance", response_model=BalanceOut)
async def my_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LessonBalance).where(LessonBalance.student_id == current_user.id)
    )
    bal = result.scalar_one_or_none()
    if not bal:
        bal = LessonBalance(student_id=current_user.id)
    return BalanceOut(
        individual_total=bal.individual_total,
        individual_used=bal.individual_used,
        individual_remaining=bal.individual_total - bal.individual_used,
        speaking_club_total=bal.speaking_club_total,
        speaking_club_used=bal.speaking_club_used,
        speaking_club_remaining=bal.speaking_club_total - bal.speaking_club_used,
        synced_at=bal.synced_at,
    )
