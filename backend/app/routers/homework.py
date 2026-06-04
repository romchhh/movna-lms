from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.homework import Homework, HomeworkTask, HomeworkStatus
from app.schemas import HomeworkOut, HomeworkSubmit, HomeworkReview, HomeworkTaskOut

router = APIRouter()


# ── Student ───────────────────────────────────────────────────────────────────
@router.get("/my", response_model=list[HomeworkOut])
async def my_homework(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Homework)
        .options(selectinload(Homework.task))
        .where(Homework.student_id == current_user.id)
        .order_by(Homework.deadline)
    )
    return result.scalars().all()


@router.post("/submit", response_model=HomeworkOut, status_code=201)
async def submit_homework(
    body: HomeworkSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check task exists
    task_result = await db.execute(select(HomeworkTask).where(HomeworkTask.id == body.task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check existing submission
    existing = await db.execute(
        select(Homework).where(
            Homework.task_id == body.task_id,
            Homework.student_id == current_user.id,
        )
    )
    hw = existing.scalar_one_or_none()
    now = datetime.utcnow()

    if hw:
        # Update existing
        hw.text_answer = body.text_answer
        hw.file_url = body.file_url
        hw.audio_url = body.audio_url
        hw.submitted_at = now
        hw.status = HomeworkStatus.LATE if (hw.deadline and now > hw.deadline) else HomeworkStatus.SUBMITTED
    else:
        hw = Homework(
            task_id=body.task_id,
            student_id=current_user.id,
            text_answer=body.text_answer,
            file_url=body.file_url,
            audio_url=body.audio_url,
            submitted_at=now,
            status=HomeworkStatus.SUBMITTED,
        )
        db.add(hw)

    await db.flush()
    await db.refresh(hw)
    return hw


# ── Teacher ───────────────────────────────────────────────────────────────────
@router.get("/to-review", response_model=list[HomeworkOut])
async def homework_to_review(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    """All submitted hw for students in teacher's groups, ordered by urgency."""
    result = await db.execute(
        select(Homework)
        .options(selectinload(Homework.task), selectinload(Homework.student))
        .where(Homework.status.in_([HomeworkStatus.SUBMITTED, HomeworkStatus.LATE]))
        .order_by(Homework.status.desc(), Homework.submitted_at)
    )
    return result.scalars().all()


@router.post("/{hw_id}/review", response_model=HomeworkOut)
async def review_homework(
    hw_id: int,
    body: HomeworkReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    result = await db.execute(select(Homework).where(Homework.id == hw_id))
    hw = result.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=404, detail="Not found")

    hw.score = body.score
    hw.comment = body.comment
    hw.teacher_id = current_user.id
    hw.status = HomeworkStatus.REVIEWED
    hw.reviewed_at = datetime.utcnow()
    await db.flush()
    await db.refresh(hw)
    return hw


# ── Teacher creates tasks ─────────────────────────────────────────────────────
@router.post("/tasks", response_model=HomeworkTaskOut, status_code=201)
async def create_task(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    task = HomeworkTask(
        lesson_id=body["lesson_id"],
        teacher_id=current_user.id,
        title=body["title"],
        description=body.get("description", ""),
        task_type=body.get("task_type", "text"),
        due_days_after=body.get("due_days_after", 7),
        max_score=body.get("max_score", 10.0),
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task
