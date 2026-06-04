from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.course import Lesson, LessonProgress, LessonStatus
from app.schemas import LessonWithProgress

router = APIRouter()


@router.get("/{lesson_id}", response_model=LessonWithProgress)
async def get_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id, Lesson.is_active == True))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    prog_result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.student_id == current_user.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    prog = prog_result.scalar_one_or_none()
    status = prog.status if prog else LessonStatus.LOCKED

    if status == LessonStatus.LOCKED:
        raise HTTPException(status_code=403, detail="Lesson is locked")

    return LessonWithProgress(
        id=lesson.id, title=lesson.title, description=lesson.description,
        video_url=lesson.video_url, miro_url=lesson.miro_url,
        zoom_url=lesson.zoom_url, order=lesson.order, duration_min=lesson.duration_min,
        status=status, completed_at=prog.completed_at if prog else None,
    )
