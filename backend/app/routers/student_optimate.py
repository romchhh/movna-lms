from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.optimate import (
    BalancesResponse,
    CacheMeta,
    EventOut,
    PaginatedEventsOut,
    PaginatedTransactionsOut,
    ProductBalanceOut,
    StudentOverviewOut,
    StudentProfileOut,
    StudentProfileUpdate,
    TransactionOut,
)
from app.services.optimate import get_optimate_client
from app.services.optimate_admin_labels import PROFILE_INCLUDE
from app.services.optimate_cache import (
    get_cached_balances,
    get_cached_events,
    get_cached_transactions,
    invalidate_admin_student_detail,
    invalidate_student_cache,
)
from app.routers.optimate_router_helpers import cache_meta, ensure_optimate_configured
from app.services.optimate_profile import (
    build_student_patch,
    student_profile_out,
)

router = APIRouter()


async def _resolve_student_id(user: User, db: AsyncSession) -> str:
    if user.optimeit_id:
        return str(user.optimeit_id)

    client = get_optimate_client()
    contact = await client.find_student_by_contacts(email=user.email, phone=user.phone or None)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Студента не знайдено в Optimate",
        )

    user.optimeit_id = str(contact.id)
    await db.flush()
    return str(contact.id)


def _balance_out(item) -> ProductBalanceOut:
    return ProductBalanceOut(
        product_id=item.product_id,
        product_name=item.product_name,
        product_type=item.product_type,
        product_type_label=item.product_type_label,
        lessons_remaining=item.lessons_remaining,
        lessons_total=item.lessons_total,
        lessons_used=item.lessons_used,
        price_per_lesson=item.price_per_lesson,
    )


def _transaction_out(item) -> TransactionOut:
    return TransactionOut(
        id=item.id,
        type=item.type,
        type_label=item.type_label,
        amount=item.amount,
        lesson_count=item.lesson_count,
        description=item.description,
        transaction_date=item.transaction_date,
        created_at=item.created_at,
        product_id=item.product_id,
        product_name=item.product_name,
        product_type=item.product_type,
        is_credit=item.is_credit,
    )


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
        student_names=list(getattr(item, "student_names", []) or []),
        student_ids=list(getattr(item, "student_ids", []) or []),
        teacher_names=list(getattr(item, "teacher_names", []) or []),
        teacher_ids=list(getattr(item, "teacher_ids", []) or []),
    )


@router.get("/profile", response_model=StudentProfileOut)
async def student_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    ensure_optimate_configured()
    student_id = await _resolve_student_id(current_user, db)
    client = get_optimate_client()
    raw = await client.get_student_by_id(student_id, include=PROFILE_INCLUDE)
    if not raw:
        raise HTTPException(status_code=404, detail="Профіль не знайдено в Optimate")
    return student_profile_out(raw)


@router.patch("/profile", response_model=StudentProfileOut)
async def update_student_profile(
    body: StudentProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    ensure_optimate_configured()
    payload = build_student_patch(body)
    if not payload:
        raise HTTPException(status_code=400, detail="Немає полів для оновлення")

    student_id = await _resolve_student_id(current_user, db)
    client = get_optimate_client()
    _updated, status = await client.update_student(student_id, payload)
    if status == 404:
        raise HTTPException(status_code=404, detail="Профіль не знайдено в Optimate")
    if status >= 400:
        raise HTTPException(status_code=502, detail="Не вдалося оновити профіль в Optimate")

    raw = await client.get_student_by_id(student_id, include=PROFILE_INCLUDE)
    if not raw:
        raise HTTPException(status_code=502, detail="Профіль оновлено, але не вдалося завантажити дані")

    if body.first_name is not None:
        current_user.first_name = body.first_name.strip()
    if body.last_name is not None:
        current_user.last_name = body.last_name.strip()
    await db.flush()

    invalidate_student_cache(student_id)
    invalidate_admin_student_detail(student_id)
    return student_profile_out(raw)


@router.post("/refresh", status_code=204)
async def refresh_student_cache(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    """Примусово скидає кеш Optimate для поточного учня."""
    student_id = await _resolve_student_id(current_user, db)
    invalidate_student_cache(student_id)


@router.get("/overview", response_model=StudentOverviewOut)
async def student_overview(
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    ensure_optimate_configured()
    student_id = await _resolve_student_id(current_user, db)

    balances, bal_at, bal_cached = await get_cached_balances(
        student_id, force_refresh=refresh,
    )
    (transactions, _), tx_at, tx_cached = await get_cached_transactions(
        student_id, page=1, page_size=5, force_refresh=refresh,
    )
    (events, _, _, _), ev_at, ev_cached = await get_cached_events(
        student_id, days_back=7, days_forward=30, force_refresh=refresh,
    )

    upcoming = [e for e in events if e.is_completed is not False]
    upcoming.sort(key=lambda e: e.starts_at)

    synced_at = datetime.fromtimestamp(min(bal_at, tx_at, ev_at), tz=timezone.utc)
    from_cache = bal_cached and tx_cached and ev_cached

    return StudentOverviewOut(
        balances=[_balance_out(b) for b in balances],
        upcoming_events=[_event_out(e) for e in upcoming[:5]],
        recent_transactions=[_transaction_out(t) for t in transactions],
        total_lessons_remaining=sum(b.lessons_remaining for b in balances),
        synced_at=synced_at,
        cache=CacheMeta(cached=from_cache, synced_at=synced_at),
    )


@router.get("/balances", response_model=BalancesResponse)
async def student_balances(
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    ensure_optimate_configured()
    student_id = await _resolve_student_id(current_user, db)
    balances, cached_at, from_cache = await get_cached_balances(
        student_id, force_refresh=refresh,
    )
    meta = cache_meta(cached_at, from_cache)
    return BalancesResponse(
        data=[_balance_out(b) for b in balances],
        cache=meta,
    )


@router.get("/transactions", response_model=PaginatedTransactionsOut)
async def student_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    ensure_optimate_configured()
    student_id = await _resolve_student_id(current_user, db)
    (items, total), cached_at, from_cache = await get_cached_transactions(
        student_id,
        page=page,
        page_size=page_size,
        force_refresh=refresh,
    )
    return PaginatedTransactionsOut(
        data=[_transaction_out(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
        cache=cache_meta(cached_at, from_cache),
    )


@router.get("/events", response_model=PaginatedEventsOut)
async def student_events(
    days_back: int = Query(7, ge=0, le=90),
    days_forward: int = Query(30, ge=1, le=180),
    refresh: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    ensure_optimate_configured()
    student_id = await _resolve_student_id(current_user, db)
    (items, total, date_from, date_to), cached_at, from_cache = await get_cached_events(
        student_id,
        days_back=days_back,
        days_forward=days_forward,
        force_refresh=refresh,
    )
    return PaginatedEventsOut(
        data=[_event_out(e) for e in items],
        total=total,
        date_from=date_from,
        date_to=date_to,
        cache=cache_meta(cached_at, from_cache),
    )
