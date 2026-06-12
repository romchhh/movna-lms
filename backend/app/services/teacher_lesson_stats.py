"""Aggregate teacher lesson metrics from Optimate events."""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from app.services.event_analytics import KYIV, UK_DAY_LABELS, local_date_from_iso, month_label_for
from app.services.optimate import ParsedEvent, get_optimate_client

DEFAULT_DAYS_BACK = 365
DEFAULT_DAYS_FORWARD = 90
MAX_EVENT_PAGES = 25
EVENT_PAGE_SIZE = 200


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def _week_bounds_monday(anchor: date) -> tuple[date, date]:
    start = anchor - timedelta(days=anchor.weekday())
    return start, start + timedelta(days=6)


async def fetch_all_teacher_events(
    teacher_id: str,
    days_back: int = DEFAULT_DAYS_BACK,
    days_forward: int = DEFAULT_DAYS_FORWARD,
) -> tuple[list[ParsedEvent], str, str]:
    client = get_optimate_client()
    now = datetime.now(timezone.utc)
    date_from = _iso(now - timedelta(days=days_back))
    date_to = _iso(now + timedelta(days=days_forward))

    all_items: list[ParsedEvent] = []
    total = 0
    page = 1
    while page <= MAX_EVENT_PAGES:
        items, total = await client.list_teacher_events(
            teacher_id,
            date_from=date_from,
            date_to=date_to,
            page_number=page,
            page_size=EVENT_PAGE_SIZE,
        )
        all_items.extend(items)
        if len(all_items) >= total or not items:
            break
        page += 1

    return all_items, date_from, date_to


def compute_teacher_lesson_stats(
    events: list[ParsedEvent],
    *,
    days_back: int = DEFAULT_DAYS_BACK,
    days_forward: int = DEFAULT_DAYS_FORWARD,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    anchor = (now or datetime.now(KYIV)).astimezone(KYIV)
    today = anchor.date()

    this_month_start, this_month_end = _month_bounds(today.year, today.month)
    if today.month == 1:
        last_month_start, last_month_end = _month_bounds(today.year - 1, 12)
    else:
        last_month_start, last_month_end = _month_bounds(today.year, today.month - 1)

    week_start, week_end = _week_bounds_monday(today)

    completed_in_period = 0
    completed_this_month = 0
    completed_last_month = 0
    completed_this_week = 0
    completed_today = 0
    planned_this_month = 0
    planned_this_week = 0
    planned_upcoming = 0
    cancelled_this_month = 0
    hours_this_month = 0.0
    trial_completed_month = 0
    unique_students_month: set[str] = set()
    format_completed_month: dict[str, int] = {
        "individual": 0, "group": 0, "pair": 0, "speaking_club": 0,
    }
    weekday_completed = Counter()

    day_counts: dict[str, dict[str, int]] = {}
    for i in range(7):
        d = week_start + timedelta(days=i)
        key = d.isoformat()
        day_counts[key] = {"total": 0, "completed": 0, "planned": 0}

    for event in events:
        if not event.starts_at:
            continue
        local_d = local_date_from_iso(event.starts_at)
        if local_d is None:
            continue
        key = local_d.isoformat()

        if event.is_completed is True:
            completed_in_period += 1
            if this_month_start <= local_d <= this_month_end:
                completed_this_month += 1
                hours_this_month += max(event.duration, 0) / 60.0
                fmt = event.schedule_class or "individual"
                format_completed_month[fmt] = format_completed_month.get(fmt, 0) + 1
                weekday_completed[local_d.weekday()] += 1
                if event.is_trial:
                    trial_completed_month += 1
                for sid in event.student_ids:
                    if sid:
                        unique_students_month.add(sid)
            if last_month_start <= local_d <= last_month_end:
                completed_last_month += 1
            if week_start <= local_d <= week_end:
                completed_this_week += 1
                if key in day_counts:
                    day_counts[key]["completed"] += 1
                    day_counts[key]["total"] += 1
            if local_d == today:
                completed_today += 1
        elif event.is_completed is False:
            if this_month_start <= local_d <= this_month_end:
                cancelled_this_month += 1
        else:
            if this_month_start <= local_d <= this_month_end:
                planned_this_month += 1
            if week_start <= local_d <= week_end:
                planned_this_week += 1
                if key in day_counts:
                    day_counts[key]["planned"] += 1
                    day_counts[key]["total"] += 1
            if local_d >= today:
                planned_upcoming += 1

    week_activity = [
        {
            "day": (week_start + timedelta(days=i)).isoformat(),
            "label": UK_DAY_LABELS[i],
            "total": day_counts[(week_start + timedelta(days=i)).isoformat()]["total"],
            "completed": day_counts[(week_start + timedelta(days=i)).isoformat()]["completed"],
            "planned": day_counts[(week_start + timedelta(days=i)).isoformat()]["planned"],
        }
        for i in range(7)
    ]

    weeks_in_month = max(1, (today - this_month_start).days // 7 + 1)
    avg_lessons_per_week = round(completed_this_month / weeks_in_month, 1)
    busiest_weekday_label = "—"
    if weekday_completed:
        busiest_weekday_label = UK_DAY_LABELS[weekday_completed.most_common(1)[0][0]]

    month_delta = completed_this_month - completed_last_month
    if completed_last_month > 0:
        month_change_pct = round((month_delta / completed_last_month) * 100)
    elif completed_this_month > 0:
        month_change_pct = 100
    else:
        month_change_pct = 0

    return {
        "month_label": month_label_for(today),
        "days_back": days_back,
        "days_forward": days_forward,
        "completed_in_period": completed_in_period,
        "completed_this_month": completed_this_month,
        "completed_last_month": completed_last_month,
        "completed_this_week": completed_this_week,
        "completed_today": completed_today,
        "planned_this_month": planned_this_month,
        "planned_this_week": planned_this_week,
        "planned_upcoming": planned_upcoming,
        "cancelled_this_month": cancelled_this_month,
        "hours_this_month": round(hours_this_month, 1),
        "month_change_pct": month_change_pct,
        "week_activity": week_activity,
        "unique_students_month": len(unique_students_month),
        "trial_lessons_month": trial_completed_month,
        "format_breakdown_month": format_completed_month,
        "busiest_weekday_label": busiest_weekday_label,
        "avg_lessons_per_week": avg_lessons_per_week,
    }
