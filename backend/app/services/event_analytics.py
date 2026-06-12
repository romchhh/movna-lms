"""Shared helpers for lesson/event statistics."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

from app.services.optimate_parsers import schedule_class_from_product_type

KYIV = ZoneInfo("Europe/Kyiv")
UK_DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]
UK_MONTH_LABELS = [
    "січень", "лютий", "березень", "квітень", "травень", "червень",
    "липень", "серпень", "вересень", "жовтень", "листопад", "грудень",
]


def kyiv_today() -> date:
    return datetime.now(KYIV).date()


def month_label_for(d: date) -> str:
    return f"{UK_MONTH_LABELS[d.month - 1]} {d.year}"


def month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


def local_date_from_iso(starts_at: str) -> Optional[date]:
    if not starts_at:
        return None
    raw = starts_at.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(KYIV).date()


def event_schedule_class(item: dict[str, Any]) -> str:
    products = item.get("products") if isinstance(item.get("products"), list) else []
    product = products[0] if products and isinstance(products[0], dict) else {}
    product_type = product.get("type") or product.get("productType") or item.get("productType")
    try:
        product_type_int = int(product_type) if product_type is not None else None
    except (TypeError, ValueError):
        product_type_int = None
    students = item.get("students") or []
    student_count = len(students) if isinstance(students, list) else 0
    return schedule_class_from_product_type(product_type_int, student_count=student_count)


def completion_state(item: dict[str, Any]) -> str:
    val = item.get("isCompleted")
    if val is True:
        return "completed"
    if val is False:
        return "cancelled"
    return "planned"


def empty_format_breakdown() -> dict[str, int]:
    return {"individual": 0, "group": 0, "pair": 0, "speaking_club": 0}


def aggregate_school_month_events(
    items: list[dict[str, Any]],
    *,
    month_start: date,
    month_end: date,
) -> dict[str, Any]:
    """month_end — exclusive (перший день наступного місяця)."""
    completed = 0
    planned = 0
    cancelled = 0
    completed_today = 0
    hours_completed = 0.0
    formats = empty_format_breakdown()
    teacher_counts: dict[str, dict[str, Any]] = defaultdict(lambda: {"count": 0, "name": ""})
    today = kyiv_today()

    for item in items:
        local_d = local_date_from_iso(str(item.get("startsAt") or ""))
        if local_d is None or local_d < month_start or local_d >= month_end:
            continue

        state = completion_state(item)
        fmt = event_schedule_class(item)

        if state == "completed":
            completed += 1
            if local_d == today:
                completed_today += 1
            formats[fmt] = formats.get(fmt, 0) + 1
            hours_completed += max(int(item.get("duration") or 0), 0) / 60.0
            for tid, tname in _teacher_pairs(item):
                teacher_counts[tid]["count"] += 1
                if tname:
                    teacher_counts[tid]["name"] = tname
        elif state == "cancelled":
            cancelled += 1
        else:
            planned += 1

    top_teachers = sorted(
        (
            {"id": tid, "full_name": data["name"] or f"Викладач {tid}", "lessons": data["count"]}
            for tid, data in teacher_counts.items()
            if data["count"] > 0
        ),
        key=lambda x: x["lessons"],
        reverse=True,
    )[:5]

    return {
        "completed_this_month": completed,
        "planned_this_month": planned,
        "cancelled_this_month": cancelled,
        "completed_today": completed_today,
        "hours_completed_month": round(hours_completed, 1),
        "format_breakdown": formats,
        "top_teachers_month": top_teachers,
    }


def aggregate_week_activity(
    items: list[dict[str, Any]],
    *,
    week_start: date,
) -> list[dict[str, Any]]:
    day_counts: dict[str, dict[str, int]] = {}
    for i in range(7):
        d = week_start + timedelta(days=i)
        key = d.isoformat()
        day_counts[key] = {"total": 0, "completed": 0, "planned": 0}

    for item in items:
        local_d = local_date_from_iso(str(item.get("startsAt") or ""))
        if local_d is None:
            continue
        key = local_d.isoformat()
        if key not in day_counts:
            continue
        state = completion_state(item)
        if state == "completed":
            day_counts[key]["completed"] += 1
            day_counts[key]["total"] += 1
        elif state == "planned":
            day_counts[key]["planned"] += 1
            day_counts[key]["total"] += 1

    return [
        {
            "day": (week_start + timedelta(days=i)).isoformat(),
            "label": UK_DAY_LABELS[i],
            "count": day_counts[(week_start + timedelta(days=i)).isoformat()]["total"],
            "completed": day_counts[(week_start + timedelta(days=i)).isoformat()]["completed"],
            "planned": day_counts[(week_start + timedelta(days=i)).isoformat()]["planned"],
        }
        for i in range(7)
    ]


def _teacher_pairs(item: dict[str, Any]) -> list[tuple[str, str]]:
    from app.services.optimate_parsers import collect_event_teacher_pairs
    return collect_event_teacher_pairs(item)
