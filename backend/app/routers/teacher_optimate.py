from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.optimate import (
    CacheMeta,
    EventOut,
    PaginatedEventsOut,
    PaginatedTeacherStudentsOut,
    ScheduleDayOut,
    ScheduleSlotOut,
    TeacherGroupOut,
    TeacherGroupStudentOut,
    TeacherGroupsResponse,
    TeacherProfileOut,
    TeacherProfileUpdate,
    TeacherScheduleOut,
    TeacherSchedulesResponse,
    TeacherStudentDetailResponse,
    TeacherStudentOut,
)
from app.services.optimate import get_optimate_client
from app.services.optimate_admin_labels import PROFILE_INCLUDE
from app.services.optimate_cache import (
    get_cached_teacher_events,
    get_cached_teacher_groups_with_students,
    get_cached_teacher_schedules,
    get_cached_teacher_student_detail,
    get_cached_teacher_students,
    invalidate_admin_teacher_detail,
    invalidate_teacher_cache,
)
from app.services.optimate_profile import (
    build_teacher_patch,
    teacher_profile_out,
)
from app.services.optimate_parsers import (
    parse_teacher_schedule,
    parse_teacher_student_item,
    ensure_viewing_teacher_on_student,
)

router = APIRouter()


def _cache_meta(cached_at: float, from_cache: bool) -> CacheMeta:
    return CacheMeta(
        cached=from_cache,
        synced_at=datetime.fromtimestamp(cached_at, tz=timezone.utc),
    )


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


def _event_out(item) -> EventOut:
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
        is_completed=item.is_completed,
        completion_label=item.completion_label,
        schedule_class=item.schedule_class,
        student_names=list(item.student_names),
        student_ids=list(getattr(item, "student_ids", []) or []),
        teacher_names=list(getattr(item, "teacher_names", []) or []),
        teacher_ids=list(getattr(item, "teacher_ids", []) or []),
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


def _ensure_optimate() -> None:
    client = get_optimate_client()
    if not client.is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")


@router.get("/profile", response_model=TeacherProfileOut)
async def teacher_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    _ensure_optimate()
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
    _ensure_optimate()
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
        cache=_cache_meta(cached_at, from_cache),
    )


@router.get("/events", response_model=PaginatedEventsOut)
async def teacher_events(
    days_back: int = Query(7, ge=0, le=90),
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
    return PaginatedEventsOut(
        data=[_event_out(e) for e in items],
        total=total,
        date_from=date_from,
        date_to=date_to,
        cache=_cache_meta(cached_at, from_cache),
    )


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
    return PaginatedTeacherStudentsOut(
        data=[TeacherStudentOut(**parse_teacher_student_item(item)) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        cache=_cache_meta(cached_at, from_cache),
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
        cache=_cache_meta(cached_at, from_cache),
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
        cache=_cache_meta(cached_at, from_cache),
    )
