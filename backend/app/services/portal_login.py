"""LMS portal login metadata for Optimate-linked users."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserRole
from app.services.student_account import find_student_user
from app.services.teacher_account import find_teacher_user


def _iso_utc(dt: datetime | None) -> str | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


async def attach_lms_login_info(
    db: AsyncSession,
    data: dict[str, Any],
    role: UserRole,
) -> dict[str, Any]:
    optimate_id = str(data.get("id") or "")
    email = (data.get("email") or "").strip().lower() or None

    if role == UserRole.STUDENT:
        user = await find_student_user(db, optimate_id, email)
    elif role == UserRole.TEACHER:
        user = await find_teacher_user(db, optimate_id, email)
    else:
        user = None

    data["last_login_at"] = _iso_utc(user.last_login_at) if user else None
    return data
