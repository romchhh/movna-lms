from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.lesson_request import LessonRequest, LessonRequestStatus, LessonRequestType
from app.models.user import User, UserRole
from app.schemas.lesson_request import (
    LessonRequestCreate,
    LessonRequestOut,
    LessonRequestResolve,
    PendingCountOut,
)

router = APIRouter()


def _to_out(req: LessonRequest, student: User | None = None) -> LessonRequestOut:
    name = ""
    if student:
        name = f"{student.first_name} {student.last_name}".strip() or student.email
    return LessonRequestOut(
        id=req.id,
        student_id=req.student_id,
        student_name=name,
        optimate_event_id=req.optimate_event_id,
        request_type=req.request_type,
        status=req.status,
        event_title=req.event_title,
        event_starts_at=req.event_starts_at,
        event_ends_at=req.event_ends_at,
        teacher_name=req.teacher_name,
        teacher_optimate_id=req.teacher_optimate_id,
        requested_starts_at=req.requested_starts_at,
        requested_ends_at=req.requested_ends_at,
        student_comment=req.student_comment,
        admin_note=req.admin_note,
        resolved_at=req.resolved_at,
        created_at=req.created_at,
    )


async def _get_request_or_404(db: AsyncSession, request_id: int) -> LessonRequest:
    result = await db.execute(select(LessonRequest).where(LessonRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Запит не знайдено")
    return req


@router.post("", response_model=LessonRequestOut, status_code=201)
async def create_lesson_request(
    body: LessonRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    if body.request_type == LessonRequestType.RESCHEDULE:
        if not body.requested_starts_at:
            raise HTTPException(status_code=400, detail="Вкажіть нову дату та час")
        if body.requested_starts_at <= datetime.now(timezone.utc).replace(tzinfo=None):
            raise HTTPException(status_code=400, detail="Нова дата має бути в майбутньому")

    existing = await db.execute(
        select(LessonRequest).where(
            LessonRequest.student_id == current_user.id,
            LessonRequest.optimate_event_id == body.optimate_event_id,
            LessonRequest.status == LessonRequestStatus.PENDING,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Для цього уроку вже є активний запит. Дочекайтесь відповіді.",
        )

    req = LessonRequest(
        student_id=current_user.id,
        optimate_event_id=body.optimate_event_id,
        request_type=body.request_type,
        event_title=body.event_title,
        event_starts_at=body.event_starts_at,
        event_ends_at=body.event_ends_at,
        teacher_name=body.teacher_name,
        teacher_optimate_id=body.teacher_optimate_id or "",
        requested_starts_at=body.requested_starts_at,
        requested_ends_at=body.requested_ends_at,
        student_comment=body.student_comment or "",
    )
    db.add(req)
    await db.flush()
    return _to_out(req, current_user)


@router.get("/my", response_model=list[LessonRequestOut])
async def my_lesson_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    result = await db.execute(
        select(LessonRequest)
        .where(LessonRequest.student_id == current_user.id)
        .order_by(LessonRequest.created_at.desc())
    )
    rows = result.scalars().all()
    return [_to_out(r, current_user) for r in rows]


@router.get("/pending-count", response_model=PendingCountOut)
async def pending_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(func.count()).select_from(LessonRequest).where(
        LessonRequest.status == LessonRequestStatus.PENDING
    )
    if current_user.role == UserRole.TEACHER:
        teacher_id = (current_user.optimeit_id or "").strip()
        if not teacher_id:
            return PendingCountOut(count=0)
        q = q.where(LessonRequest.teacher_optimate_id == teacher_id)
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(q)
    return PendingCountOut(count=int(result.scalar_one() or 0))


@router.get("", response_model=list[LessonRequestOut])
async def list_lesson_requests(
    status: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=403, detail="Access denied")

    q = (
        select(LessonRequest, User)
        .join(User, LessonRequest.student_id == User.id)
        .order_by(LessonRequest.created_at.desc())
    )
    if current_user.role == UserRole.TEACHER:
        teacher_id = (current_user.optimeit_id or "").strip()
        q = q.where(LessonRequest.teacher_optimate_id == teacher_id)

    if status.strip():
        try:
            st = LessonRequestStatus(status.strip())
            q = q.where(LessonRequest.status == st)
        except ValueError:
            raise HTTPException(status_code=400, detail="Невірний статус")

    result = await db.execute(q)
    return [_to_out(req, student) for req, student in result.all()]


@router.patch("/{request_id}", response_model=LessonRequestOut)
async def resolve_lesson_request(
    request_id: int,
    body: LessonRequestResolve,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=403, detail="Access denied")

    req = await _get_request_or_404(db, request_id)

    if current_user.role == UserRole.TEACHER:
        teacher_id = (current_user.optimeit_id or "").strip()
        if req.teacher_optimate_id != teacher_id:
            raise HTTPException(status_code=403, detail="Цей запит не стосується ваших уроків")

    if req.status != LessonRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Запит уже опрацьовано")

    if body.status == LessonRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Оберіть схвалення або відхилення")

    req.status = body.status
    req.admin_note = body.admin_note or ""
    req.resolved_by_id = current_user.id
    req.resolved_at = datetime.utcnow()
    await db.flush()

    student_result = await db.execute(select(User).where(User.id == req.student_id))
    student = student_result.scalar_one_or_none()
    return _to_out(req, student)
