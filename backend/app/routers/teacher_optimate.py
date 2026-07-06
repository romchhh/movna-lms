from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.optimate import (
    CacheMeta,
    EventCancellationOut,
    EventOut,
    LessonCancellationReasonOut,
    PaginatedEventsOut,
    PaginatedTeacherStudentsOut,
    PaginatedTeacherTransactionsOut,
    ScheduleDayOut,
    ScheduleSlotOut,
    TeacherEventActionOut,
    TeacherEventCancelIn,
    TeacherEventCreateIn,
    TeacherGroupOut,
    TeacherGroupStudentOut,
    TeacherGroupsResponse,
    TeacherProfileOut,
    TeacherProfileUpdate,
    TeacherScheduleOut,
    TeacherSchedulesResponse,
    TeacherStudentDetailResponse,
    TeacherLessonStatsOut,
    TeacherStudentOut,
    TeacherTransactionOut,
    TeacherTransactionsSummaryOut,
)
from app.services.optimate import get_optimate_client
from app.services.optimate_labels import LESSON_CANCELLATION_REASONS
from app.services.optimate_admin_labels import PROFILE_INCLUDE
from app.services.optimate_cache import (
    get_cached_teacher_events,
    get_cached_teacher_lesson_stats,
    get_cached_teacher_groups_with_students,
    get_cached_teacher_schedules,
    get_cached_teacher_student_detail,
    get_cached_teacher_students,
    get_cached_teacher_transactions,
    get_cached_teacher_transactions_summary,
    invalidate_admin_teacher_detail,
    invalidate_teacher_cache,
)
from app.services.teacher_event_sync import (
    get_cancellations_map,
    resolve_student_product_id,
    save_event_cancellation,
    teacher_can_access_student,
)
from app.services.optimate_profile import (
    build_teacher_patch,
    teacher_profile_out,
)
from app.routers.optimate_router_helpers import cache_meta, ensure_optimate_configured
from app.services.optimate_parsers import (
    parse_teacher_schedule,
    parse_teacher_student_item,
    ensure_viewing_teacher_on_student,
)

router = APIRouter()


async def _resolve_teacher_id(user: User, db: AsyncSession) -> str:
    if user.optimeit_id:
        return str(user.optimeit_id)

    client = get_optimate_client()
    contact = await client.find_teacher_by_contacts(
        email=user.email,
        phone=user.phone or None,
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Викладача не знайдено в Optimate",
        )

    user.optimeit_id = str(contact.id)
    await db.flush()
    return str(contact.id)


def _event_out(item, cancellation=None) -> EventOut:
    completion_label = item.completion_label
    is_completed = item.is_completed
    if cancellation and completion_label == "Заплановано":
        completion_label = "Скасовано"
        is_completed = False

    return EventOut(
        id=item.id,
        event_type=item.event_type,
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        duration=item.duration,
        product_id=item.product_id,
        product_name=item.product_name,
        product_type=item.product_type,
        product_type_label=item.product_type_label,
        teacher_name=item.teacher_name,
        is_trial=item.is_trial,
        is_completed=is_completed,
        completion_label=completion_label,
        schedule_class=item.schedule_class,
        student_names=list(item.student_names),
        student_ids=list(getattr(item, "student_ids", []) or []),
        teacher_names=list(getattr(item, "teacher_names", []) or []),
        teacher_ids=list(getattr(item, "teacher_ids", []) or []),
        cancellation_reason=cancellation.reason_label if cancellation else None,
        cancellation_note=cancellation.note if cancellation else None,
    )


def _teacher_transaction_out(item) -> TeacherTransactionOut:
    return TeacherTransactionOut(
        id=item.id,
        type=item.type,
        type_label=item.type_label,
        amount=item.amount,
        signed_amount=item.signed_amount,
        description=item.description,
        transaction_date=item.transaction_date,
        created_at=item.created_at,
        product_id=item.product_id,
        product_name=item.product_name,
        product_type=item.product_type,
        lesson_id=item.lesson_id,
        is_trial=item.is_trial,
        period_start_date=item.period_start_date,
        period_end_date=item.period_end_date,
        salary_invoice_id=item.salary_invoice_id,
        student_names=list(item.student_names),
        is_credit=item.is_credit,
    )


def _schedule_out(raw: dict) -> TeacherScheduleOut:
    parsed = parse_teacher_schedule(raw)
    return TeacherScheduleOut(
        id=parsed["id"],
        start_date=parsed.get("start_date"),
        timezone=parsed["timezone"],
        days=[
            ScheduleDayOut(
                day=day["day"],
                day_label=day["day_label"],
                day_short=day["day_short"],
                slots=[ScheduleSlotOut(**slot) for slot in day["slots"]],
            )
            for day in parsed["days"]
        ],
    )


@router.get("/profile", response_model=TeacherProfileOut)
async def teacher_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    ensure_optimate_configured()
    teacher_id = await _resolve_teacher_id(current_user, db)
    client = get_optimate_client()
    raw = await client.get_teacher_by_id(teacher_id, include=PROFILE_INCLUDE)
    if not raw:
        raise HTTPException(status_code=404, detail="Профіль не знайдено в Optimate")
    return teacher_profile_out(raw)


@router.patch("/profile", response_model=TeacherProfileOut)
async def update_teacher_profile(
    body: TeacherProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    ensure_optimate_configured()
    payload = build_teacher_patch(body)
    if not payload:
        raise HTTPException(status_code=400, detail="Немає полів для оновлення")

    teacher_id = await _resolve_teacher_id(current_user, db)
    client = get_optimate_client()
    updated, status = await client.update_teacher(teacher_id, payload)
    if status == 404 or not updated:
        raise HTTPException(
            status_code=404 if status == 404 else 502,
            detail="Не вдалося оновити профіль в Optimate",
        )

    if body.first_name is not None:
        current_user.first_name = body.first_name.strip()
    if body.last_name is not None:
        current_user.last_name = body.last_name.strip()
    if body.description is not None:
        current_user.about_me = body.description.strip()
    await db.flush()

    invalidate_teacher_cache(teacher_id)
    invalidate_admin_teacher_detail(teacher_id)
    return teacher_profile_out(updated)


@router.post("/refresh", status_code=204)
async def refresh_teacher_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    teacher_id = await _resolve_teacher_id(current_user, db)
    invalidate_teacher_cache(teacher_id)


@router.get("/schedules", response_model=TeacherSchedulesResponse)
async def teacher_schedules(
    date: str = Query(""),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")

    teacher_id = await _resolve_teacher_id(current_user, db)
    schedule_date = date.strip() or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    items, cached_at, from_cache = await get_cached_teacher_schedules(
        teacher_id,
        schedule_date,
        force_refresh=refresh,
    )
    return TeacherSchedulesResponse(
        data=[_schedule_out(item) for item in items],
        cache=cache_meta(cached_at, from_cache),
    )


@router.get("/events", response_model=PaginatedEventsOut)
async def teacher_events(
    days_back: int = Query(7, ge=0, le=365),
    days_forward: int = Query(30, ge=1, le=180),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")

    teacher_id = await _resolve_teacher_id(current_user, db)
    (items, total, date_from, date_to), cached_at, from_cache = await get_cached_teacher_events(
        teacher_id,
        days_back=days_back,
        days_forward=days_forward,
        force_refresh=refresh,
    )
    cancel_map = await get_cancellations_map(db, [e.id for e in items])
    return PaginatedEventsOut(
        data=[_event_out(e, cancel_map.get(e.id)) for e in items],
        total=total,
        date_from=date_from,
        date_to=date_to,
        cache=cache_meta(cached_at, from_cache),
    )


@router.get("/cancellation-reasons", response_model=list[LessonCancellationReasonOut])
async def lesson_cancellation_reasons(
    _: User = Depends(require_role(UserRole.TEACHER)),
):
    return [LessonCancellationReasonOut(**item) for item in LESSON_CANCELLATION_REASONS]


@router.post("/events", response_model=TeacherEventActionOut, status_code=201)
async def create_teacher_event(
    body: TeacherEventCreateIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    ensure_optimate_configured()
    client = get_optimate_client()
    teacher_id = await _resolve_teacher_id(current_user, db)

    if not await teacher_can_access_student(client, teacher_id, body.student_id):
        raise HTTPException(status_code=404, detail="Учня не знайдено або немає доступу")

    raw = await client.get_student_by_id(
        body.student_id,
        include="products,products.financial",
    )
    student_data = raw.get("data") if isinstance(raw, dict) and isinstance(raw.get("data"), dict) else raw
    if not isinstance(student_data, dict):
        raise HTTPException(status_code=404, detail="Не вдалося завантажити дані учня")

    product_id = resolve_student_product_id(student_data, body.product_id)
    if not product_id:
        raise HTTPException(status_code=400, detail="Не знайдено активний продукт для уроку")

    try:
        student_int = int(body.student_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Невірний ID учня")

    if body.duration < 15 or body.duration > 240:
        raise HTTPException(status_code=400, detail="Тривалість уроку має бути від 15 до 240 хв")

    created, status_code = await client.create_event(
        teacher_id=teacher_id,
        student_ids=[student_int],
        product_id=product_id,
        starts_at=body.starts_at,
        duration=body.duration,
    )
    if status_code >= 400 or not created:
        message = "Не вдалося створити урок в Optimate"
        if isinstance(created, dict):
            message = created.get("message") or message
        raise HTTPException(status_code=502 if status_code >= 500 else 400, detail=message)

    event_data = created.get("data") if isinstance(created.get("data"), dict) else created
    event_id = str(event_data.get("id") or "")
    invalidate_teacher_cache(teacher_id)
    return TeacherEventActionOut(ok=True, event_id=event_id, message="Урок створено в Optimate")


@router.post("/events/{event_id}/cancel", response_model=TeacherEventActionOut)
async def cancel_teacher_event(
    event_id: str,
    body: TeacherEventCancelIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    ensure_optimate_configured()
    if not any(item["code"] == body.reason_code for item in LESSON_CANCELLATION_REASONS):
        raise HTTPException(status_code=400, detail="Невідома причина скасування")

    client = get_optimate_client()
    teacher_id = await _resolve_teacher_id(current_user, db)
    _, status_code = await client.cancel_event(event_id)
    if status_code >= 400:
        raise HTTPException(status_code=502, detail="Не вдалося скасувати урок в Optimate")

    await save_event_cancellation(
        db,
        event_id=event_id,
        teacher_id=teacher_id,
        reason_code=body.reason_code,
        note=body.note,
    )
    invalidate_teacher_cache(teacher_id)
    return TeacherEventActionOut(ok=True, event_id=event_id, message="Урок скасовано")


@router.get("/events/{event_id}/cancellation", response_model=EventCancellationOut)
async def get_event_cancellation(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.TEACHER)),
):
    cancel_map = await get_cancellations_map(db, [event_id])
    row = cancel_map.get(event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Причину скасування не знайдено")
    return EventCancellationOut(
        optimate_event_id=row.optimate_event_id,
        reason_code=row.reason_code,
        reason_label=row.reason_label,
        note=row.note or "",
        created_at=row.created_at.isoformat() if row.created_at else None,
    )


@router.get("/transactions", response_model=PaginatedTeacherTransactionsOut)
async def teacher_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    ensure_optimate_configured()
    teacher_id = await _resolve_teacher_id(current_user, db)
    (items, total), cached_at, from_cache = await get_cached_teacher_transactions(
        teacher_id,
        page=page,
        page_size=page_size,
        date_from=date_from,
        date_to=date_to,
        force_refresh=refresh,
    )
    summary_raw, _, _ = await get_cached_teacher_transactions_summary(
        teacher_id,
        date_from=date_from,
        date_to=date_to,
        force_refresh=refresh,
    )
    return PaginatedTeacherTransactionsOut(
        data=[_teacher_transaction_out(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
        summary=TeacherTransactionsSummaryOut(**summary_raw),
        cache=cache_meta(cached_at, from_cache),
    )


@router.get("/lesson-stats", response_model=TeacherLessonStatsOut)
async def teacher_lesson_stats(
    days_back: int = Query(365, ge=30, le=730),
    days_forward: int = Query(90, ge=7, le=180),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")

    teacher_id = await _resolve_teacher_id(current_user, db)
    stats, cached_at, from_cache = await get_cached_teacher_lesson_stats(
        teacher_id,
        days_back=days_back,
        days_forward=days_forward,
        stats_year=year,
        stats_month=month,
        force_refresh=refresh,
    )
    return TeacherLessonStatsOut(**stats, cache=cache_meta(cached_at, from_cache))


@router.get("/students", response_model=PaginatedTeacherStudentsOut)
async def teacher_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str = Query(""),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")

    teacher_id = await _resolve_teacher_id(current_user, db)
    (items, total), cached_at, from_cache = await get_cached_teacher_students(
        teacher_id,
        page,
        page_size,
        search.strip() or None,
        force_refresh=refresh,
    )
    parsed_items = [parse_teacher_student_item(item) for item in items]
    return PaginatedTeacherStudentsOut(
        data=[
            TeacherStudentOut(**parsed, products=parsed.get("products_summary") or [])
            for parsed in parsed_items
        ],
        total=total,
        page=page,
        page_size=page_size,
        cache=cache_meta(cached_at, from_cache),
    )


@router.get("/students/{student_id}", response_model=TeacherStudentDetailResponse)
async def teacher_student_detail(
    student_id: str,
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")

    teacher_id = await _resolve_teacher_id(current_user, db)
    raw, cached_at, from_cache = await get_cached_teacher_student_detail(
        teacher_id,
        student_id,
        force_refresh=refresh,
    )
    if not raw:
        raise HTTPException(status_code=404, detail="Учня не знайдено або немає доступу")
    teacher_name = f"{current_user.first_name} {current_user.last_name}".strip() or None
    return TeacherStudentDetailResponse(
        data=ensure_viewing_teacher_on_student(raw, teacher_id, teacher_name=teacher_name),
        cache=cache_meta(cached_at, from_cache),
    )


@router.get("/groups", response_model=TeacherGroupsResponse)
async def teacher_groups(
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")

    teacher_id = await _resolve_teacher_id(current_user, db)
    (items, total), cached_at, from_cache = await get_cached_teacher_groups_with_students(
        teacher_id,
        force_refresh=refresh,
    )
    return TeacherGroupsResponse(
        data=[
            TeacherGroupOut(
                **{k: v for k, v in item.items() if k != "students"},
                students=[TeacherGroupStudentOut(**student) for student in item.get("students") or []],
            )
            for item in items
        ],
        total=total,
        cache=cache_meta(cached_at, from_cache),
    )
