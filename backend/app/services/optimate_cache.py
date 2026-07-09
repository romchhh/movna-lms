from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.core.config import settings
from app.services.optimate import (
    ParsedEvent,
    ParsedTeacherTransaction,
    ParsedTransaction,
    ProductBalance,
    get_optimate_client,
)
from app.services.optimate_balance_enrichment import (
    enrich_student_balance_data,
    enrich_students_balances,
    unwrap_student_payload,
)
from app.services.optimate_parsers import (
    enrich_admin_event_dict,
    enrich_event_teacher_names,
    parse_admin_event,
    parse_student_list_item,
    parse_teacher_list_item,
    student_belongs_to_teacher,
)
from app.services.ttl_cache import optimate_cache


def _student_prefix(student_id: str) -> str:
    return f"optimate:student:{student_id}:"


def invalidate_student_cache(student_id: str) -> None:
    optimate_cache.invalidate_prefix(_student_prefix(student_id))


async def get_cached_balances(
    student_id: str,
    *,
    force_refresh: bool = False,
) -> tuple[list[ProductBalance], float, bool]:
    client = get_optimate_client()

    async def fetch() -> list[ProductBalance]:
        raw = await client.get_student(student_id)
        if not raw:
            return []
        data = unwrap_student_payload(raw)
        data = await enrich_student_balance_data(client, student_id, data)
        return client._parse_product_balances(data)

    return await optimate_cache.get_or_fetch(
        f"{_student_prefix(student_id)}balances",
        settings.OPTIMATE_CACHE_BALANCES_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_transactions(
    student_id: str,
    page: int,
    page_size: int,
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[ParsedTransaction], int], float, bool]:
    client = get_optimate_client()

    async def fetch() -> tuple[list[ParsedTransaction], int]:
        return await client.get_student_transactions(
            student_id,
            page_number=page,
            page_size=page_size,
        )

    return await optimate_cache.get_or_fetch(
        f"{_student_prefix(student_id)}transactions:{page}:{page_size}",
        settings.OPTIMATE_CACHE_TRANSACTIONS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_events(
    student_id: str,
    days_back: int,
    days_forward: int,
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[ParsedEvent], int, str, str], float, bool]:
    client = get_optimate_client()
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=days_back)).isoformat().replace("+00:00", "Z")
    date_to = (now + timedelta(days=days_forward)).isoformat().replace("+00:00", "Z")

    async def fetch() -> tuple[list[ParsedEvent], int, str, str]:
        items, total = await client.get_student_events(
            student_id,
            date_from=date_from,
            date_to=date_to,
        )
        return items, total, date_from, date_to

    result, cached_at, from_cache = await optimate_cache.get_or_fetch(
        f"{_student_prefix(student_id)}events:{days_back}:{days_forward}",
        settings.OPTIMATE_CACHE_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )
    events, total, date_from, date_to = result
    events = await _enrich_parsed_events(events, force_refresh=force_refresh)
    return (events, total, date_from, date_to), cached_at, from_cache


def _admin_prefix() -> str:
    return "optimate:admin:"


def invalidate_admin_cache() -> None:
    optimate_cache.invalidate_prefix(_admin_prefix())


def invalidate_admin_student_detail(student_id: str) -> None:
    optimate_cache.invalidate(f"{_admin_prefix()}student:{student_id}")


def invalidate_admin_teacher_detail(teacher_id: str) -> None:
    optimate_cache.invalidate(f"{_admin_prefix()}teacher:{teacher_id}")


async def _fetch_teacher_name_map() -> dict[str, str]:
    client = get_optimate_client()
    name_map: dict[str, str] = {}
    page = 1
    page_size = 200
    while True:
        items, total = await client.list_teachers(page_number=page, page_size=page_size)
        for item in items:
            if not isinstance(item, dict):
                continue
            parsed = parse_teacher_list_item(item)
            teacher_id = parsed["id"]
            if teacher_id:
                name_map[teacher_id] = parsed["full_name"]
        if page * page_size >= total or not items:
            break
        page += 1
    return name_map


async def get_cached_teacher_name_map(
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, str], float, bool]:
    return await optimate_cache.get_or_fetch(
        "optimate:teacher_names",
        settings.OPTIMATE_CACHE_ADMIN_LIST_TTL,
        _fetch_teacher_name_map,
        force_refresh=force_refresh,
    )


def enrich_parsed_event(event: ParsedEvent, name_map: dict[str, str]) -> ParsedEvent:
    teacher_ids = list(event.teacher_ids)
    if not teacher_ids:
        return event
    teacher_names = enrich_event_teacher_names(
        teacher_ids,
        list(event.teacher_names),
        name_map,
    )
    teacher_name = event.teacher_name or next((name for name in teacher_names if name), None)
    return replace(
        event,
        teacher_names=tuple(teacher_names),
        teacher_name=teacher_name,
    )


async def _enrich_parsed_events(
    events: list[ParsedEvent],
    *,
    force_refresh: bool = False,
) -> list[ParsedEvent]:
    if not events:
        return events
    name_map, _, _ = await get_cached_teacher_name_map(force_refresh=force_refresh)
    return [enrich_parsed_event(event, name_map) for event in events]


async def get_cached_admin_students(
    page: int,
    page_size: int,
    search: Optional[str],
    statuses: Optional[str],
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[dict[str, Any]], int], float, bool]:
    client = get_optimate_client()

    async def fetch() -> tuple[list[dict[str, Any]], int]:
        items, total = await client.list_students(
            page_number=page,
            page_size=page_size,
            student_name=search or None,
            statuses=statuses,
        )
        items = await enrich_students_balances(client, items)
        return items, total

    key = f"{_admin_prefix()}students:v2:{page}:{page_size}:{search or ''}:{statuses or ''}"
    return await optimate_cache.get_or_fetch(
        key,
        settings.OPTIMATE_CACHE_ADMIN_LIST_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_admin_student_detail(
    student_id: str,
    *,
    force_refresh: bool = False,
) -> tuple[Optional[dict[str, Any]], float, bool]:
    from app.services.optimate_admin_labels import STUDENT_DETAIL_INCLUDE

    client = get_optimate_client()

    async def fetch() -> Optional[dict[str, Any]]:
        raw = await client.get_student_by_id(student_id, include=STUDENT_DETAIL_INCLUDE)
        if not raw:
            return None
        data = unwrap_student_payload(raw)
        return await enrich_student_balance_data(client, student_id, data)

    return await optimate_cache.get_or_fetch(
        f"{_admin_prefix()}student:{student_id}:v3",
        settings.OPTIMATE_CACHE_ADMIN_DETAIL_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_admin_teachers(
    page: int,
    page_size: int,
    search: Optional[str],
    statuses: Optional[str],
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[dict[str, Any]], int], float, bool]:
    client = get_optimate_client()

    async def fetch() -> tuple[list[dict[str, Any]], int]:
        return await client.list_teachers(
            page_number=page,
            page_size=page_size,
            teacher_name=search or None,
            statuses=statuses,
        )

    key = f"{_admin_prefix()}teachers:{page}:{page_size}:{search or ''}:{statuses or ''}"
    return await optimate_cache.get_or_fetch(
        key,
        settings.OPTIMATE_CACHE_ADMIN_LIST_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_admin_teacher_detail(
    teacher_id: str,
    *,
    force_refresh: bool = False,
) -> tuple[Optional[dict[str, Any]], float, bool]:
    client = get_optimate_client()

    async def fetch() -> Optional[dict[str, Any]]:
        return await client.get_teacher_by_id(teacher_id)

    return await optimate_cache.get_or_fetch(
        f"{_admin_prefix()}teacher:{teacher_id}",
        settings.OPTIMATE_CACHE_ADMIN_DETAIL_TTL,
        fetch,
        force_refresh=force_refresh,
    )


def _iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


async def get_cached_admin_events(
    date_from: str,
    date_to: str,
    page: int,
    page_size: int,
    completion_status: Optional[str] = None,
    teacher_id: Optional[str] = None,
    student_id: Optional[str] = None,
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[dict[str, Any]], int], float, bool]:
    client = get_optimate_client()

    async def fetch() -> tuple[list[dict[str, Any]], int]:
        return await client.list_events(
            date_from=date_from,
            date_to=date_to,
            page_number=page,
            page_size=page_size,
            completion_status=completion_status,
            teacher_ids=teacher_id,
            student_ids=student_id,
        )

    key = (
        f"{_admin_prefix()}events:{date_from}:{date_to}:{page}:{page_size}:"
        f"{completion_status or ''}:{teacher_id or ''}:{student_id or ''}"
    )
    return await optimate_cache.get_or_fetch(
        key,
        settings.OPTIMATE_CACHE_ADMIN_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def _fetch_events_all(
    client,
    date_from: str,
    date_to: str,
    *,
    page_size: int = 200,
    max_pages: int = 15,
) -> list[dict[str, Any]]:
    all_items: list[dict[str, Any]] = []
    total = 0
    for page in range(1, max_pages + 1):
        items, total = await client.list_events(
            date_from=date_from,
            date_to=date_to,
            page_number=page,
            page_size=page_size,
            sort_order="asc",
        )
        all_items.extend(items)
        if len(all_items) >= total or not items:
            break
    return all_items


async def get_cached_admin_overview(
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, Any], float, bool]:
    client = get_optimate_client()

    async def fetch() -> dict[str, Any]:
        from app.services.event_analytics import (
            aggregate_school_month_events,
            aggregate_week_activity,
            kyiv_today,
            month_bounds,
            month_label_for,
        )

        now = datetime.now(timezone.utc)
        today_kyiv = kyiv_today()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start_date = today_kyiv - timedelta(days=6)
        week_start = datetime.combine(week_start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        week_end = today_start + timedelta(days=7)
        date_from_week = _iso(week_start)
        date_to_week = _iso(week_end)
        date_from_today = _iso(today_start)
        date_to_today = _iso(today_start + timedelta(days=1))
        date_from_now = _iso(now)

        month_start_date, month_end_exclusive = month_bounds(today_kyiv.year, today_kyiv.month)
        month_start_dt = datetime.combine(month_start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        month_end_dt = datetime.combine(month_end_exclusive, datetime.min.time()).replace(tzinfo=timezone.utc)
        date_from_month = _iso(month_start_dt)
        date_to_month = _iso(month_end_dt + timedelta(days=45))

        (
            (_, students_total),
            (_, teachers_total),
            (_, active_students),
            (_, new_students),
            (_, paused_students),
            (_, events_week_total),
            (_, events_today_total),
            (low_balance_raw, _),
            (teachers_load_raw, _),
            (teachers_all_raw, _),
            (upcoming_raw, _),
            week_events_raw,
            month_events_raw,
        ) = await asyncio.gather(
            client.list_students(page_number=1, page_size=1),
            client.list_teachers(page_number=1, page_size=1),
            client.list_students(page_number=1, page_size=1, statuses="1"),
            client.list_students(page_number=1, page_size=1, statuses="3"),
            client.list_students(page_number=1, page_size=1, statuses="4"),
            client.list_events(
                date_from=date_from_week,
                date_to=date_to_week,
                page_number=1,
                page_size=1,
            ),
            client.list_events(
                date_from=date_from_today,
                date_to=date_to_today,
                page_number=1,
                page_size=1,
            ),
            client.list_students(
                page_number=1,
                page_size=50,
                sort_by="remainingLessonCount",
                sort_order="asc",
            ),
            client.list_teachers(
                page_number=1,
                page_size=5,
                sort_by="unmarkedLessonCount",
                sort_order="desc",
            ),
            client.list_teachers(page_number=1, page_size=100),
            client.list_events(
                date_from=date_from_now,
                date_to=date_to_week,
                page_number=1,
                page_size=10,
                sort_order="asc",
            ),
            _fetch_events_all(client, date_from_week, date_to_week),
            _fetch_events_all(client, date_from_month, date_to_month),
        )

        low_balance_students: list[dict[str, Any]] = []
        low_balance_count = 0
        for item in low_balance_raw:
            parsed = parse_student_list_item(item)
            if parsed["status"] == 2 or parsed["remaining_lessons"] > 3:
                continue
            low_balance_count += 1
            if len(low_balance_students) < 8:
                low_balance_students.append({
                    "id": parsed["id"],
                    "full_name": parsed["full_name"],
                    "remaining_lessons": parsed["remaining_lessons"],
                    "product_count": parsed["product_count"],
                    "chat_url": parsed.get("chat_url"),
                })

        teacher_load = []
        for item in teachers_load_raw:
            parsed = parse_teacher_list_item(item)
            if parsed["status"] == 2:
                continue
            teacher_load.append({
                "id": parsed["id"],
                "full_name": parsed["full_name"],
                "students_count": parsed.get("students_count"),
                "unmarked_lesson_count": parsed.get("unmarked_lesson_count"),
            })

        unmarked_lessons = 0
        for item in teachers_all_raw:
            parsed = parse_teacher_list_item(item)
            if parsed["status"] == 2:
                continue
            count = parsed.get("unmarked_lesson_count")
            if count:
                unmarked_lessons += int(count)

        week_activity = aggregate_week_activity(week_events_raw, week_start=week_start_date)
        month_stats = aggregate_school_month_events(
            month_events_raw,
            month_start=month_start_date,
            month_end=month_end_exclusive,
        )

        name_map, _, _ = await get_cached_teacher_name_map()

        return {
            "students_total": students_total,
            "teachers_total": teachers_total,
            "active_students": active_students,
            "new_students": new_students,
            "paused_students": paused_students,
            "low_balance_count": low_balance_count,
            "events_today": events_today_total,
            "events_week": events_week_total,
            "unmarked_lessons": unmarked_lessons,
            "month_label": month_label_for(today_kyiv),
            "low_balance_students": low_balance_students,
            "teacher_load": teacher_load,
            "upcoming_events": [
                enrich_admin_event_dict(parse_admin_event(item), name_map)
                for item in upcoming_raw
            ],
            "week_activity": week_activity,
            **month_stats,
        }

    return await optimate_cache.get_or_fetch(
        f"{_admin_prefix()}overview",
        settings.OPTIMATE_CACHE_ADMIN_OVERVIEW_TTL,
        fetch,
        force_refresh=force_refresh,
    )


def _teacher_prefix(teacher_id: str) -> str:
    return f"optimate:teacher:{teacher_id}:"


def invalidate_teacher_cache(teacher_id: str) -> None:
    optimate_cache.invalidate_prefix(_teacher_prefix(teacher_id))


async def get_cached_teacher_transactions(
    teacher_id: str,
    page: int,
    page_size: int,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[ParsedTeacherTransaction], int], float, bool]:
    client = get_optimate_client()

    async def fetch() -> tuple[list[ParsedTeacherTransaction], int]:
        return await client.get_teacher_transactions(
            teacher_id,
            page_number=page,
            page_size=page_size,
            date_from=date_from,
            date_to=date_to,
        )

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}transactions:{page}:{page_size}:{date_from or ''}:{date_to or ''}",
        settings.OPTIMATE_CACHE_TRANSACTIONS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_teacher_transactions_summary(
    teacher_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, Any], float, bool]:
    client = get_optimate_client()

    async def fetch() -> dict[str, Any]:
        earned_total = 0.0
        payout_total = 0.0
        lesson_accrual_count = 0
        payout_count = 0
        page = 1
        page_size = 100
        total = 0
        while page <= 20:
            items, total = await client.get_teacher_transactions(
                teacher_id,
                page_number=page,
                page_size=page_size,
                date_from=date_from,
                date_to=date_to,
            )
            for tx in items:
                if tx.type == 1 and tx.signed_amount > 0:
                    earned_total += tx.signed_amount
                    lesson_accrual_count += 1
                elif tx.type == 2 and tx.signed_amount < 0:
                    payout_total += abs(tx.signed_amount)
                    payout_count += 1
            if page * page_size >= total or not items:
                break
            page += 1
        return {
            "earned_total": round(earned_total, 2),
            "payout_total": round(payout_total, 2),
            "lesson_accrual_count": lesson_accrual_count,
            "payout_count": payout_count,
            "date_from": date_from,
            "date_to": date_to,
        }

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}tx_summary:{date_from or ''}:{date_to or ''}",
        settings.OPTIMATE_CACHE_TRANSACTIONS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_teacher_schedules(
    teacher_id: str,
    date: Optional[str],
    *,
    force_refresh: bool = False,
) -> tuple[list[dict[str, Any]], float, bool]:
    client = get_optimate_client()

    async def fetch() -> list[dict[str, Any]]:
        return await client.get_teacher_schedules(teacher_id, date=date)

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}schedules:{date or 'all'}",
        settings.OPTIMATE_CACHE_TEACHER_SCHEDULE_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_teacher_events(
    teacher_id: str,
    days_back: int,
    days_forward: int,
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[ParsedEvent], int, str, str], float, bool]:
    client = get_optimate_client()
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=days_back)).isoformat().replace("+00:00", "Z")
    date_to = (now + timedelta(days=days_forward)).isoformat().replace("+00:00", "Z")

    async def fetch() -> tuple[list[ParsedEvent], int, str, str]:
        items, total = await client.list_teacher_events(
            teacher_id,
            date_from=date_from,
            date_to=date_to,
            page_size=500,
        )
        return items, total, date_from, date_to

    result, cached_at, from_cache = await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}events:{days_back}:{days_forward}",
        settings.OPTIMATE_CACHE_TEACHER_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )
    events, total, date_from, date_to = result
    events = await _enrich_parsed_events(events, force_refresh=force_refresh)
    return (events, total, date_from, date_to), cached_at, from_cache


async def get_cached_teacher_lesson_stats(
    teacher_id: str,
    days_back: int = 365,
    days_forward: int = 90,
    stats_year: Optional[int] = None,
    stats_month: Optional[int] = None,
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, Any], float, bool]:
    from app.services.teacher_lesson_stats import (
        DEFAULT_DAYS_BACK,
        DEFAULT_DAYS_FORWARD,
        compute_teacher_lesson_stats,
        count_teacher_student_buckets,
        fetch_all_teacher_events,
    )

    back = days_back if days_back > 0 else DEFAULT_DAYS_BACK
    forward = days_forward if days_forward > 0 else DEFAULT_DAYS_FORWARD
    year_key = stats_year if stats_year is not None else 0
    month_key = stats_month if stats_month is not None else 0

    async def fetch() -> dict[str, Any]:
        events, _, _ = await fetch_all_teacher_events(teacher_id, back, forward)
        events = await _enrich_parsed_events(events, force_refresh=False)
        stats = compute_teacher_lesson_stats(
            events,
            days_back=back,
            days_forward=forward,
            stats_year=stats_year,
            stats_month=stats_month,
        )
        buckets = await count_teacher_student_buckets(teacher_id)
        return {**stats, **buckets}

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}lesson_stats:{back}:{forward}:{year_key}:{month_key}",
        settings.OPTIMATE_CACHE_TEACHER_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_teacher_students(
    teacher_id: str,
    page: int,
    page_size: int,
    search: Optional[str],
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[dict[str, Any]], int], float, bool]:
    client = get_optimate_client()

    async def fetch() -> tuple[list[dict[str, Any]], int]:
        items, total = await client.list_teacher_students(
            teacher_id,
            page_number=page,
            page_size=page_size,
            student_name=search or None,
        )
        items = await enrich_students_balances(client, items)
        return items, total

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}students:v2:{page}:{page_size}:{search or ''}",
        settings.OPTIMATE_CACHE_TEACHER_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def _teacher_can_access_student(
    teacher_id: str,
    student_id: str,
) -> bool:
    client = get_optimate_client()
    raw = await client.get_student_by_id(
        student_id,
        include="contacts,products,products.teachers,teachers",
    )
    if raw:
        data = raw.get("data") if isinstance(raw.get("data"), dict) else raw
        if isinstance(data, dict) and student_belongs_to_teacher(data, teacher_id):
            return True

    page = 1
    page_size = 100
    while True:
        items, total = await client.list_teacher_students(
            teacher_id,
            page_number=page,
            page_size=page_size,
        )
        if any(str(item.get("id") or "") == str(student_id) for item in items):
            return True
        if page * page_size >= total or not items:
            break
        page += 1
    return False


async def get_cached_teacher_student_detail(
    teacher_id: str,
    student_id: str,
    *,
    force_refresh: bool = False,
) -> tuple[Optional[dict[str, Any]], float, bool]:
    from app.services.optimate_admin_labels import TEACHER_STUDENT_DETAIL_INCLUDE
    from app.services.optimate_parsers import enrich_teacher_student_detail

    client = get_optimate_client()

    async def fetch() -> Optional[dict[str, Any]]:
        if not await _teacher_can_access_student(teacher_id, student_id):
            return None
        raw = await client.get_student_by_id(
            student_id,
            include=TEACHER_STUDENT_DETAIL_INCLUDE,
        )
        if not raw:
            return None
        data = unwrap_student_payload(raw)
        if not isinstance(data, dict):
            return None
        data = await enrich_student_balance_data(client, student_id, data)
        return enrich_teacher_student_detail(data)

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}student:{student_id}:v3",
        settings.OPTIMATE_CACHE_TEACHER_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )


async def get_cached_teacher_groups_with_students(
    teacher_id: str,
    *,
    force_refresh: bool = False,
) -> tuple[tuple[list[dict[str, Any]], int], float, bool]:
    import asyncio

    from app.services.optimate_parsers import parse_group_student_item, parse_teacher_group_item

    client = get_optimate_client()

    async def fetch() -> tuple[list[dict[str, Any]], int]:
        items, total = await client.list_teacher_groups(teacher_id, page_size=100)
        if not items:
            return [], total

        student_lists = await asyncio.gather(
            *[client.get_group_students(str(group.get("id") or "")) for group in items],
        )
        groups: list[dict[str, Any]] = []
        for group, students in zip(items, student_lists):
            parsed = parse_teacher_group_item(group)
            parsed["students"] = [parse_group_student_item(student) for student in students]
            groups.append(parsed)
        return groups, total

    return await optimate_cache.get_or_fetch(
        f"{_teacher_prefix(teacher_id)}groups:with_students",
        settings.OPTIMATE_CACHE_TEACHER_EVENTS_TTL,
        fetch,
        force_refresh=force_refresh,
    )
