from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.teacher_event_cancellation import TeacherEventCancellation
from app.services.optimate import OptimateClient, get_optimate_client
from app.services.optimate_labels import (
    LESSON_CANCELLATION_REASONS,
    LESSON_MARK_OUTCOMES,
    LESSON_NOT_HELD_REASONS,
)
from app.services.optimate_parsers import student_belongs_to_teacher


def cancellation_reason_label(code: str) -> str:
    for item in LESSON_CANCELLATION_REASONS:
        if item["code"] == code:
            return item["label"]
    return code


def not_held_reason_label(code: str) -> str:
    for item in LESSON_NOT_HELD_REASONS:
        if item["code"] == code:
            return str(item["label"])
    return code


def not_held_optimate_reason(code: str) -> Optional[int]:
    for item in LESSON_NOT_HELD_REASONS:
        if item["code"] == code:
            return int(item["optimate_reason"])
    return None


async def teacher_can_access_student(
    client: OptimateClient,
    teacher_id: str,
    student_id: str,
) -> bool:
    raw = await client.get_student_by_id(
        student_id,
        include="products,products.teachers,teachers",
    )
    if raw:
        data = raw.get("data") if isinstance(raw.get("data"), dict) else raw
        if isinstance(data, dict) and student_belongs_to_teacher(data, teacher_id):
            return True

    page = 1
    while page <= 5:
        items, total = await client.list_teacher_students(
            teacher_id,
            page_number=page,
            page_size=100,
        )
        if any(str(item.get("id") or "") == str(student_id) for item in items):
            return True
        if page * 100 >= total:
            break
        page += 1
    return False


def resolve_student_product_id(student_raw: dict[str, Any], product_id: Optional[str]) -> Optional[int]:
    products = student_raw.get("products") or []
    if not isinstance(products, list):
        return None

    if product_id:
        for product in products:
            if not isinstance(product, dict):
                continue
            pid = str(product.get("productId") or product.get("id") or "")
            if pid == str(product_id):
                try:
                    return int(pid)
                except (TypeError, ValueError):
                    return None
        return None

    for product in products:
        if not isinstance(product, dict):
            continue
        ptype = int(product.get("productType") or product.get("type") or 0)
        if ptype in (2, 3):
            continue
        pid = product.get("productId") or product.get("id")
        if pid is not None:
            try:
                return int(pid)
            except (TypeError, ValueError):
                continue
    return None


async def save_event_mark(
    db: AsyncSession,
    *,
    event_id: str,
    teacher_id: str,
    outcome: str,
    reason_code: str = "",
    reason_label: str = "",
    note: str = "",
) -> TeacherEventCancellation:
    if outcome not in LESSON_MARK_OUTCOMES:
        raise ValueError(f"Unknown outcome: {outcome}")

    existing = await db.execute(
        select(TeacherEventCancellation).where(
            TeacherEventCancellation.optimate_event_id == event_id,
        )
    )
    row = existing.scalar_one_or_none()
    if row:
        row.outcome = outcome
        row.reason_code = reason_code
        row.reason_label = reason_label
        row.note = note.strip()
        row.teacher_optimate_id = teacher_id
        return row

    row = TeacherEventCancellation(
        optimate_event_id=event_id,
        teacher_optimate_id=teacher_id,
        outcome=outcome,
        reason_code=reason_code,
        reason_label=reason_label,
        note=note.strip(),
    )
    db.add(row)
    await db.flush()
    return row


async def save_event_cancellation(
    db: AsyncSession,
    *,
    event_id: str,
    teacher_id: str,
    reason_code: str,
    note: str = "",
) -> TeacherEventCancellation:
    return await save_event_mark(
        db,
        event_id=event_id,
        teacher_id=teacher_id,
        outcome="cancelled_planned",
        reason_code=reason_code,
        reason_label=cancellation_reason_label(reason_code),
        note=note,
    )


async def get_event_marks_map(
    db: AsyncSession,
    event_ids: list[str],
) -> dict[str, TeacherEventCancellation]:
    if not event_ids:
        return {}
    result = await db.execute(
        select(TeacherEventCancellation).where(
            TeacherEventCancellation.optimate_event_id.in_(event_ids),
        )
    )
    rows = result.scalars().all()
    return {row.optimate_event_id: row for row in rows}


async def get_cancellations_map(
    db: AsyncSession,
    event_ids: list[str],
) -> dict[str, TeacherEventCancellation]:
    return await get_event_marks_map(db, event_ids)


async def sync_event_completed_in_optimate(event_id: str) -> bool:
    client = get_optimate_client()
    _, status = await client.complete_event(event_id)
    return status == 200


async def sync_event_not_held_in_optimate(event_id: str, reason_code: str) -> bool:
    optimate_reason = not_held_optimate_reason(reason_code)
    if optimate_reason is None:
        return False
    client = get_optimate_client()
    _, status = await client.mark_event_not_held(event_id, optimate_reason)
    return status == 200
