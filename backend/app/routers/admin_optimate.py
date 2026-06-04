from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.optimate import CacheMeta
from app.schemas.optimate_admin import (
    AdminEventOut,
    AdminOverviewOut,
    PaginatedEventsOut,
    PaginatedStudentsOut,
    PaginatedTeachersOut,
    StudentDetailOut,
    StudentListItemOut,
    StudentAccountOut,
    SetStudentPasswordIn,
    StudentPasswordOut,
    TeacherDetailOut,
    TeacherListItemOut,
)
from app.services.optimate import get_optimate_client
from app.services.optimate_cache import (
    get_cached_admin_events,
    get_cached_admin_overview,
    get_cached_admin_student_detail,
    get_cached_admin_students,
    get_cached_admin_teacher_detail,
    get_cached_admin_teachers,
    get_cached_teacher_name_map,
    invalidate_admin_cache,
)
from app.services.optimate_parsers import (
    enrich_admin_event_dict,
    enrich_student_detail,
    enrich_teacher_detail,
    parse_admin_event,
    parse_student_list_item,
    parse_teacher_list_item,
)
from app.services.student_account import (
    ensure_student_user,
    find_student_user,
    generate_portal_password,
    readable_password as readable_student_password,
    set_student_login_password,
)
from app.services.teacher_account import (
    ensure_teacher_user,
    find_teacher_user,
    readable_password as readable_teacher_password,
    set_teacher_login_password,
)

router = APIRouter()


def _cache_meta(cached_at: float, from_cache: bool) -> CacheMeta:
    return CacheMeta(
        cached=from_cache,
        synced_at=datetime.fromtimestamp(cached_at, tz=timezone.utc),
    )


def _ensure_optimate():
    if not get_optimate_client().is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")


def _student_out(item: dict) -> StudentListItemOut:
    return StudentListItemOut(**parse_student_list_item(item))


def _teacher_out(item: dict) -> TeacherListItemOut:
    return TeacherListItemOut(**parse_teacher_list_item(item))


def _event_out(item: dict, name_map: dict[str, str] | None = None) -> AdminEventOut:
    parsed = parse_admin_event(item)
    if name_map:
        parsed = enrich_admin_event_dict(parsed, name_map)
    return AdminEventOut(**parsed)


def _iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


async def _load_student_profile(student_id: str) -> dict:
    raw, _, _ = await get_cached_admin_student_detail(student_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Учня не знайдено в Optimate")
    return enrich_student_detail(raw)


async def _load_teacher_profile(teacher_id: str) -> dict:
    raw, _, _ = await get_cached_admin_teacher_detail(teacher_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Викладача не знайдено в Optimate")
    return enrich_teacher_detail(raw)


@router.post("/refresh", status_code=204)
async def refresh_admin_optimate_cache(
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    invalidate_admin_cache()


@router.get("/students", response_model=PaginatedStudentsOut)
async def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str = Query(""),
    statuses: str = Query(""),
    refresh: bool = Query(False),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    _ensure_optimate()
    (items, total), cached_at, from_cache = await get_cached_admin_students(
        page,
        page_size,
        search.strip() or None,
        statuses.strip() or None,
        force_refresh=refresh,
    )
    return PaginatedStudentsOut(
        data=[_student_out(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        cache=_cache_meta(cached_at, from_cache),
    )


@router.get("/students/{student_id}", response_model=StudentDetailOut)
async def get_student_detail(
    student_id: str,
    refresh: bool = Query(False),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    _ensure_optimate()
    raw, cached_at, from_cache = await get_cached_admin_student_detail(
        student_id,
        force_refresh=refresh,
    )
    if not raw:
        raise HTTPException(status_code=404, detail="Учня не знайдено в Optimate")
    return StudentDetailOut(
        data=enrich_student_detail(raw),
        cache=_cache_meta(cached_at, from_cache),
    )


@router.get("/students/{student_id}/account", response_model=StudentAccountOut)
async def get_student_account(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    profile = await _load_student_profile(student_id)
    email = (profile.get("email") or "").strip().lower() or None
    user = await find_student_user(db, student_id, email)
    password = readable_student_password(user) if user else None

    return StudentAccountOut(
        optimate_id=student_id,
        user_id=user.id if user else None,
        email=user.email if user else email,
        has_account=user is not None,
        has_password=bool(password),
        password=password,
        is_active=bool(user and user.is_active),
    )


@router.put("/students/{student_id}/password", response_model=StudentPasswordOut)
async def update_student_password(
    student_id: str,
    body: SetStudentPasswordIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    profile = await _load_student_profile(student_id)
    email = (profile.get("email") or "").strip().lower()
    user = await ensure_student_user(
        db,
        optimate_id=student_id,
        email=email,
        first_name=str(profile.get("first_name") or ""),
        last_name=str(profile.get("last_name") or ""),
        phone=str(profile.get("phone") or ""),
    )
    await set_student_login_password(db, user, body.password)
    plain = readable_student_password(user) or body.password.strip()

    return StudentPasswordOut(
        optimate_id=student_id,
        user_id=user.id,
        email=user.email,
        password=plain,
        generated=False,
    )


@router.post("/students/{student_id}/password/generate", response_model=StudentPasswordOut)
async def generate_student_password(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    profile = await _load_student_profile(student_id)
    email = (profile.get("email") or "").strip().lower()
    user = await ensure_student_user(
        db,
        optimate_id=student_id,
        email=email,
        first_name=str(profile.get("first_name") or ""),
        last_name=str(profile.get("last_name") or ""),
        phone=str(profile.get("phone") or ""),
    )
    plain = generate_portal_password()
    await set_student_login_password(db, user, plain)

    return StudentPasswordOut(
        optimate_id=student_id,
        user_id=user.id,
        email=user.email,
        password=plain,
        generated=True,
    )


@router.get("/teachers", response_model=PaginatedTeachersOut)
async def list_teachers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: str = Query(""),
    statuses: str = Query(""),
    refresh: bool = Query(False),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    _ensure_optimate()
    (items, total), cached_at, from_cache = await get_cached_admin_teachers(
        page,
        page_size,
        search.strip() or None,
        statuses.strip() or None,
        force_refresh=refresh,
    )
    return PaginatedTeachersOut(
        data=[_teacher_out(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        cache=_cache_meta(cached_at, from_cache),
    )


@router.get("/teachers/{teacher_id}", response_model=TeacherDetailOut)
async def get_teacher_detail(
    teacher_id: str,
    refresh: bool = Query(False),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    _ensure_optimate()
    raw, cached_at, from_cache = await get_cached_admin_teacher_detail(
        teacher_id,
        force_refresh=refresh,
    )
    if not raw:
        raise HTTPException(status_code=404, detail="Викладача не знайдено в Optimate")
    return TeacherDetailOut(
        data=enrich_teacher_detail(raw),
        cache=_cache_meta(cached_at, from_cache),
    )


@router.get("/teachers/{teacher_id}/account", response_model=StudentAccountOut)
async def get_teacher_account(
    teacher_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    profile = await _load_teacher_profile(teacher_id)
    email = (profile.get("email") or "").strip().lower() or None
    user = await find_teacher_user(db, teacher_id, email)
    password = readable_teacher_password(user) if user else None

    return StudentAccountOut(
        optimate_id=teacher_id,
        user_id=user.id if user else None,
        email=user.email if user else email,
        has_account=user is not None,
        has_password=bool(password),
        password=password,
        is_active=bool(user and user.is_active),
    )


@router.put("/teachers/{teacher_id}/password", response_model=StudentPasswordOut)
async def update_teacher_password(
    teacher_id: str,
    body: SetStudentPasswordIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    profile = await _load_teacher_profile(teacher_id)
    email = (profile.get("email") or "").strip().lower()
    user = await ensure_teacher_user(
        db,
        optimate_id=teacher_id,
        email=email,
        first_name=str(profile.get("first_name") or ""),
        last_name=str(profile.get("last_name") or ""),
        phone=str(profile.get("phone") or ""),
    )
    await set_teacher_login_password(db, user, body.password)
    plain = readable_teacher_password(user) or body.password.strip()

    return StudentPasswordOut(
        optimate_id=teacher_id,
        user_id=user.id,
        email=user.email,
        password=plain,
        generated=False,
    )


@router.post("/teachers/{teacher_id}/password/generate", response_model=StudentPasswordOut)
async def generate_teacher_password(
    teacher_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    profile = await _load_teacher_profile(teacher_id)
    email = (profile.get("email") or "").strip().lower()
    user = await ensure_teacher_user(
        db,
        optimate_id=teacher_id,
        email=email,
        first_name=str(profile.get("first_name") or ""),
        last_name=str(profile.get("last_name") or ""),
        phone=str(profile.get("phone") or ""),
    )
    plain = generate_portal_password()
    await set_teacher_login_password(db, user, plain)

    return StudentPasswordOut(
        optimate_id=teacher_id,
        user_id=user.id,
        email=user.email,
        password=plain,
        generated=True,
    )


@router.get("/overview", response_model=AdminOverviewOut)
async def get_overview(
    refresh: bool = Query(False),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    _ensure_optimate()
    data, cached_at, from_cache = await get_cached_admin_overview(force_refresh=refresh)
    return AdminOverviewOut(**data, cache=_cache_meta(cached_at, from_cache))


@router.get("/events", response_model=PaginatedEventsOut)
async def list_events(
    days_back: int = Query(1, ge=0, le=90),
    days_forward: int = Query(14, ge=1, le=90),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    completion_status: str = Query(""),
    teacher_id: str = Query(""),
    student_id: str = Query(""),
    refresh: bool = Query(False),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    _ensure_optimate()
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    date_from = _iso(today_start - timedelta(days=days_back))
    date_to = _iso(today_start + timedelta(days=days_forward + 1))

    (items, total), cached_at, from_cache = await get_cached_admin_events(
        date_from,
        date_to,
        page,
        page_size,
        completion_status.strip() or None,
        teacher_id.strip() or None,
        student_id.strip() or None,
        force_refresh=refresh,
    )
    name_map, _, _ = await get_cached_teacher_name_map(force_refresh=refresh)
    return PaginatedEventsOut(
        data=[_event_out(item, name_map) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        date_from=date_from,
        date_to=date_to,
        cache=_cache_meta(cached_at, from_cache),
    )
