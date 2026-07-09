"""Teacher meeting links and lesson alerts."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.schemas.teacher_settings import LessonAlertOut, MeetingLinksOut
from app.services.optimate_cache import get_cached_events, get_cached_teacher_events
from app.services.teacher_student_links import resolve_lesson_links_for_student_teacher


def _parse_iso(value: str) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _is_cancelled(completion_label: str) -> bool:
    label = (completion_label or "").lower()
    return "скас" in label or "cancel" in label


def _event_phase(now: datetime, start: datetime, end: datetime) -> str:
    if start <= now <= end:
        return "active"
    if start - timedelta(minutes=15) <= now < start:
        return "15"
    if start - timedelta(minutes=30) <= now < start - timedelta(minutes=15):
        return "30"
    return ""


def _pick_upcoming_event(events: list[object], now: datetime) -> tuple[str, datetime, object] | None:
    scored: list[tuple[int, datetime, str, object]] = []

    for event in events:
        if _is_cancelled(getattr(event, "completion_label", "") or ""):
            continue
        start = _parse_iso(getattr(event, "starts_at", "") or "")
        end = _parse_iso(getattr(event, "ends_at", "") or "")
        if not start or not end:
            continue
        phase = _event_phase(now, start, end)
        if not phase:
            continue
        priority = {"active": 0, "15": 1, "30": 2}[phase]
        scored.append((priority, start, phase, event))

    if not scored:
        return None

    scored.sort(key=lambda x: (x[0], x[1]))
    _, start, phase, event = scored[0]
    return phase, start, event


def _student_names_label(event: object) -> str:
    names = getattr(event, "student_names", None) or ()
    if not names:
        return ""
    if len(names) == 1:
        return str(names[0])
    return ", ".join(str(name) for name in names)


def meeting_links_out(user: User) -> MeetingLinksOut:
    return MeetingLinksOut(zoom_url=user.zoom_url or "", miro_url=user.miro_url or "")


async def update_meeting_links(
    db: AsyncSession,
    user: User,
    zoom_url: str,
    miro_url: str,
) -> MeetingLinksOut:
    user.zoom_url = (zoom_url or "").strip()
    user.miro_url = (miro_url or "").strip()
    await db.flush()
    return meeting_links_out(user)


async def _teacher_links(db: AsyncSession, teacher_optimate_id: str) -> tuple[str, str, str]:
    if not teacher_optimate_id:
        return "", "", ""
    result = await db.execute(
        select(User).where(
            User.optimeit_id == str(teacher_optimate_id),
            User.role == UserRole.TEACHER,
        ).limit(1)
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        return "", "", ""
    return teacher.zoom_url or "", teacher.miro_url or "", teacher.full_name


def _student_alert_message(phase: str, product_name: str, teacher_name: str) -> str:
    base = product_name or "Урок"
    who = f" з {teacher_name}" if teacher_name else ""
    if phase == "active":
        return f"У вас активний урок{who}: {base}"
    if phase == "15":
        return f"Урок{who} через 15 хвилин: {base}"
    if phase == "30":
        return f"Урок{who} через 30 хвилин: {base}"
    return ""


def _teacher_alert_message(phase: str, product_name: str, student_name: str) -> str:
    base = product_name or "Урок"
    who = f" з {student_name}" if student_name else ""
    if phase == "active":
        return f"Зараз у вас урок{who}: {base}"
    if phase == "15":
        return f"Урок{who} через 15 хвилин: {base}"
    if phase == "30":
        return f"Урок{who} через 30 хвилин: {base}"
    return ""


async def get_student_meeting_links_for_teacher(
    db: AsyncSession,
    student_optimate_id: str,
    teacher_optimate_id: str,
) -> MeetingLinksOut:
    """Zoom / Miro для учня щодо конкретного викладача (персональні або глобальні)."""
    teacher_id = str(teacher_optimate_id or "").strip()
    if not teacher_id:
        return MeetingLinksOut()

    zoom_url, miro_url, _ = await _teacher_links(db, teacher_id)
    lesson_url, board_url = await resolve_lesson_links_for_student_teacher(
        db,
        teacher_id,
        student_optimate_id,
        fallback_zoom=zoom_url,
        fallback_miro=miro_url,
    )
    return MeetingLinksOut(zoom_url=lesson_url, miro_url=board_url)


async def get_student_lesson_alert(
    db: AsyncSession,
    student_optimate_id: str,
) -> LessonAlertOut:
    (events, _, _, _), _, _ = await get_cached_events(
        student_optimate_id,
        days_back=0,
        days_forward=2,
    )

    now = datetime.now(timezone.utc)
    picked = _pick_upcoming_event(events, now)
    if not picked:
        return LessonAlertOut(show=False)

    phase, _, event = picked

    teacher_id = ""
    teacher_name_from_event = getattr(event, "teacher_name", "") or ""
    teacher_ids = getattr(event, "teacher_ids", None) or ()
    teacher_names = getattr(event, "teacher_names", None) or ()
    if teacher_ids:
        teacher_id = str(teacher_ids[0])
    if teacher_names:
        teacher_name_from_event = teacher_names[0] or teacher_name_from_event

    zoom_url, miro_url, teacher_db_name = await _teacher_links(db, teacher_id)
    lesson_url, board_url = await resolve_lesson_links_for_student_teacher(
        db,
        teacher_id,
        student_optimate_id,
        fallback_zoom=zoom_url,
        fallback_miro=miro_url,
    )
    teacher_name = teacher_db_name or teacher_name_from_event

    return LessonAlertOut(
        show=True,
        phase=phase,
        event_id=str(getattr(event, "id", "")),
        starts_at=getattr(event, "starts_at", "") or "",
        ends_at=getattr(event, "ends_at", "") or "",
        teacher_name=teacher_name,
        teacher_id=teacher_id,
        product_name=getattr(event, "product_name", "") or getattr(event, "schedule_class", "") or "",
        zoom_url=lesson_url,
        miro_url=board_url,
        message=_student_alert_message(phase, getattr(event, "product_name", "") or "", teacher_name),
    )


async def get_teacher_lesson_alert(
    db: AsyncSession,
    teacher: User,
    teacher_optimate_id: str,
) -> LessonAlertOut:
    if not teacher.notify_lesson_reminder:
        return LessonAlertOut(show=False)

    (events, _, _, _), _, _ = await get_cached_teacher_events(
        teacher_optimate_id,
        days_back=0,
        days_forward=2,
    )

    now = datetime.now(timezone.utc)
    picked = _pick_upcoming_event(events, now)
    if not picked:
        return LessonAlertOut(show=False)

    phase, _, event = picked
    student_name = _student_names_label(event)
    student_ids = getattr(event, "student_ids", None) or ()
    student_id = str(student_ids[0]) if student_ids else ""

    return LessonAlertOut(
        show=True,
        phase=phase,
        event_id=str(getattr(event, "id", "")),
        starts_at=getattr(event, "starts_at", "") or "",
        ends_at=getattr(event, "ends_at", "") or "",
        student_name=student_name,
        student_id=student_id,
        product_name=getattr(event, "product_name", "") or getattr(event, "schedule_class", "") or "",
        zoom_url=teacher.zoom_url or "",
        miro_url=teacher.miro_url or "",
        message=_teacher_alert_message(
            phase,
            getattr(event, "product_name", "") or "",
            student_name,
        ),
    )
