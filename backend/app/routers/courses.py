from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.course import Course, Module, Lesson, LessonProgress, LessonStatus
from app.schemas import CourseWithProgress, CourseOut, ModuleWithProgress, LessonWithProgress

router = APIRouter()


@router.get("", response_model=list[CourseOut])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).where(Course.is_active == True))
    return result.scalars().all()


@router.get("/{course_id}/progress", response_model=CourseWithProgress)
async def course_with_progress(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns course structure with each lesson's status for the current student."""
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
        .where(Course.id == course_id, Course.is_active == True)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Load all progress records for this student
    prog_result = await db.execute(
        select(LessonProgress).where(LessonProgress.student_id == current_user.id)
    )
    progress_map = {p.lesson_id: p for p in prog_result.scalars()}

    total = 0
    completed = 0
    modules_out = []

    for mod in course.modules:
        lessons_out = []
        mod_done = 0
        for lesson in mod.lessons:
            p = progress_map.get(lesson.id)
            status = p.status if p else LessonStatus.LOCKED
            lw = LessonWithProgress(
                id=lesson.id, title=lesson.title, description=lesson.description,
                video_url=lesson.video_url, miro_url=lesson.miro_url,
                zoom_url=lesson.zoom_url, order=lesson.order, duration_min=lesson.duration_min,
                status=status, completed_at=p.completed_at if p else None,
            )
            lessons_out.append(lw)
            total += 1
            if status == LessonStatus.COMPLETED:
                completed += 1
                mod_done += 1

        mod_pct = (mod_done / len(mod.lessons) * 100) if mod.lessons else 0
        modules_out.append(ModuleWithProgress(
            id=mod.id, title=mod.title, description=mod.description,
            order=mod.order, lessons=lessons_out, progress_pct=round(mod_pct, 1),
        ))

    return CourseWithProgress(
        id=course.id, title=course.title, description=course.description,
        language=course.language, level=course.level, is_active=course.is_active,
        modules=modules_out,
        progress_pct=round(completed / total * 100, 1) if total else 0,
        total_lessons=total,
        completed_lessons=completed,
    )


@router.post("/{course_id}/lessons/{lesson_id}/complete", status_code=200)
async def complete_lesson(
    course_id: int,
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a lesson as completed and unlock the next one."""
    from datetime import datetime

    # Get or create progress record
    result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.student_id == current_user.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    prog = result.scalar_one_or_none()
    if not prog:
        prog = LessonProgress(student_id=current_user.id, lesson_id=lesson_id)
        db.add(prog)

    prog.status = LessonStatus.COMPLETED
    prog.completed_at = datetime.utcnow()
    await db.flush()

    # Unlock the next lesson in this module
    lesson_result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.module).selectinload(Module.lessons))
        .where(Lesson.id == lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    if lesson:
        sorted_lessons = sorted(lesson.module.lessons, key=lambda l: l.order)
        for i, l in enumerate(sorted_lessons):
            if l.id == lesson_id and i + 1 < len(sorted_lessons):
                next_lesson = sorted_lessons[i + 1]
                next_result = await db.execute(
                    select(LessonProgress).where(
                        LessonProgress.student_id == current_user.id,
                        LessonProgress.lesson_id == next_lesson.id,
                    )
                )
                next_prog = next_result.scalar_one_or_none()
                if not next_prog:
                    db.add(LessonProgress(
                        student_id=current_user.id,
                        lesson_id=next_lesson.id,
                        status=LessonStatus.IN_PROGRESS,
                    ))
                elif next_prog.status == LessonStatus.LOCKED:
                    next_prog.status = LessonStatus.IN_PROGRESS
                break

    return {"ok": True}
