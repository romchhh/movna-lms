"""Парсери відповідей Optimate для admin-інтерфейсу."""
from __future__ import annotations

import html
import re
from typing import Any, Optional

from app.services.optimate import OptimateClient
from app.services.optimate_admin_labels import (
    AUTH_STATUS_LABELS,
    GROUP_STATUS_LABELS,
    NOTE_TYPE_LABELS,
    SKILL_LEVEL_LABELS,
    STUDENT_STATUS_LABELS,
    TEACHER_STATUS_LABELS,
)
from app.services.optimate_labels import (
    COMPLETION_LABELS,
    EVENT_TYPE_LABELS,
    PRODUCT_TYPE_LABELS,
    SCHEDULE_DAY_LABELS,
    SCHEDULE_DAY_SHORT,
)


def extract_contacts(contacts: Any) -> tuple[Optional[str], Optional[str], list[dict[str, str]]]:
    email: Optional[str] = None
    phone: Optional[str] = None
    all_contacts: list[dict[str, str]] = []

    if not isinstance(contacts, list):
        return email, phone, all_contacts

    for item in contacts:
        if not isinstance(item, dict):
            continue
        contact_type = str(item.get("type") or "").lower()
        value = str(item.get("value") or "").strip()
        if not value:
            continue
        all_contacts.append({"type": contact_type or "other", "value": value})
        if contact_type in ("email", "mail") and not email:
            email = value
        elif contact_type == "phone" and not phone:
            phone = value

    return email, phone, all_contacts


def _strip_html(text: str | None) -> str:
    if not text:
        return ""
    normalized = (
        str(text)
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
    )
    normalized = re.sub(r"</p\s*>", "\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"<[^>]+>", " ", normalized)
    normalized = html.unescape(normalized)
    lines = [re.sub(r"\s+", " ", line).strip() for line in normalized.splitlines()]
    return "\n".join(line for line in lines if line).strip()


def _note_author(item: dict[str, Any]) -> str | None:
    for key in ("authorName", "author", "createdByName"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    created_by = item.get("createdBy")
    if isinstance(created_by, dict):
        first = (created_by.get("firstName") or "").strip()
        last = (created_by.get("lastName") or "").strip()
        name = f"{first} {last}".strip()
        if name:
            return name
    return None


def parse_student_note(item: dict[str, Any]) -> dict[str, Any]:
    note_type = int(item.get("type") or 0)
    body_raw = item.get("body") or item.get("text") or item.get("content") or ""
    return {
        "id": str(item.get("id") or ""),
        "type": note_type,
        "type_label": NOTE_TYPE_LABELS.get(
            note_type,
            f"Тип {note_type}" if note_type else "Нотатка",
        ),
        "body": _strip_html(str(body_raw)),
        "created_at": item.get("createdAt") or item.get("updatedAt"),
        "author_name": _note_author(item),
    }


def parse_student_notes(notes: Any) -> list[dict[str, Any]]:
    if not isinstance(notes, list):
        return []
    parsed: list[dict[str, Any]] = []
    for item in notes:
        if isinstance(item, dict):
            note = parse_student_note(item)
            if note["body"] or note["type"]:
                parsed.append(note)
    return parsed


def _sum_remaining_lessons(products: Any) -> float:
    if not isinstance(products, list):
        return 0.0
    total = 0.0
    for product in products:
        if not isinstance(product, dict):
            continue
        financial = product.get("financial") or {}
        if isinstance(financial, dict):
            for key in ("lessonsRemaining", "remainingLessons", "remaining", "balance"):
                val = financial.get(key)
                if val is not None:
                    try:
                        total += float(val)
                        break
                    except (TypeError, ValueError):
                        continue
        direct = product.get("remainingLessonCount")
        if direct is not None:
            try:
                total += float(direct)
            except (TypeError, ValueError):
                pass
    return total


def person_display_name(person: dict[str, Any]) -> str:
    for key in ("name", "fullName", "full_name", "displayName"):
        val = person.get(key)
        if isinstance(val, str):
            text = val.strip()
            if text and not text.isdigit():
                return text
    first_name = (person.get("firstName") or "").strip()
    last_name = (person.get("lastName") or "").strip()
    return f"{first_name} {last_name}".strip()


def collect_student_teacher_pairs(
    item: dict[str, Any],
    name_map: dict[str, str] | None = None,
) -> list[tuple[str, str]]:
    """Пари (id, name) викладачів учня з teachers[] та products[].teachers[]."""
    by_key: dict[str, str] = {}
    order: list[str] = []

    def add(teacher: Any) -> None:
        if not isinstance(teacher, dict):
            return
        teacher_id = str(teacher.get("id") or "").strip()
        name = person_display_name(teacher)
        if not name and name_map and teacher_id:
            name = name_map.get(teacher_id, "")
        if not teacher_id and not name:
            return
        key = teacher_id or f"__name__:{name}"
        if key not in by_key:
            order.append(key)
            by_key[key] = name
        elif name and not by_key[key]:
            by_key[key] = name

    for teacher in item.get("teachers") or []:
        add(teacher)

    for product in item.get("products") or []:
        if not isinstance(product, dict):
            continue
        for teacher in product.get("teachers") or []:
            add(teacher)

    pairs: list[tuple[str, str]] = []
    for key in order:
        teacher_id = "" if key.startswith("__name__:") else key
        pairs.append((teacher_id, by_key[key]))
    return pairs


def _teacher_names_from_student(
    item: dict[str, Any],
    name_map: dict[str, str] | None = None,
) -> list[str]:
    return [name for _, name in collect_student_teacher_pairs(item, name_map) if name]


def _products_summary(products: Any) -> list[dict[str, Any]]:
    if not isinstance(products, list):
        return []

    result: list[dict[str, Any]] = []
    for product in products:
        if not isinstance(product, dict):
            continue
        financial = product.get("financial") if isinstance(product.get("financial"), dict) else {}
        remaining = OptimateClient._first_number(
            financial,
            "lessonsRemaining",
            "remainingLessons",
            "remaining",
            "balance",
        )
        total = OptimateClient._first_number(
            financial,
            "lessonsPurchased",
            "totalLessons",
            "purchasedLessons",
            "purchased",
        )
        used = OptimateClient._first_number(financial, "lessonsUsed", "usedLessons", "used")
        result.append({
            "product_id": str(product.get("productId") or product.get("id") or ""),
            "product_name": product.get("productName") or product.get("name") or "—",
            "product_type": product.get("productType"),
            "lessons_remaining": remaining,
            "lessons_total": total,
            "lessons_used": used,
        })
    return result


def parse_student_list_item(item: dict[str, Any]) -> dict[str, Any]:
    first_name = (item.get("firstName") or "").strip()
    last_name = (item.get("lastName") or "").strip()
    email, phone, contacts = extract_contacts(item.get("contacts"))
    status = int(item.get("status") or 0)
    skill = item.get("avgSkillLevel")

    remaining = item.get("remainingLessonCount")
    if remaining is None:
        remaining = _sum_remaining_lessons(item.get("products"))

    teacher_pairs = collect_student_teacher_pairs(item)

    return {
        "id": str(item.get("id") or ""),
        "first_name": first_name,
        "last_name": last_name,
        "full_name": f"{first_name} {last_name}".strip() or "—",
        "status": status,
        "status_label": STUDENT_STATUS_LABELS.get(status, f"Статус {status}"),
        "email": email,
        "phone": phone,
        "contacts": contacts,
        "is_child": bool(item.get("isChild")),
        "skill_level": int(skill) if skill is not None else None,
        "skill_level_label": SKILL_LEVEL_LABELS.get(int(skill), None) if skill is not None else None,
        "product_count": int(item.get("productCount") or len(item.get("products") or [])),
        "remaining_lessons": float(remaining or 0),
        "planned_lessons": float(item.get("plannedLessonCount") or 0),
        "completed_lessons": float(item.get("completedLessonCount") or 0),
        "teacher_ids": [tid for tid, _ in teacher_pairs],
        "teacher_names": [name for _, name in teacher_pairs],
        "products_summary": _products_summary(item.get("products")),
        "chat_url": item.get("chatUrl"),
        "created_at": item.get("createdAt"),
        "updated_at": item.get("updatedAt"),
    }


def parse_teacher_student_item(item: dict[str, Any]) -> dict[str, Any]:
    first_name = (item.get("firstName") or "").strip()
    last_name = (item.get("lastName") or "").strip()
    email, phone, _contacts = extract_contacts(item.get("contacts"))
    status = int(item.get("status") or 0)
    skill = item.get("avgSkillLevel")

    remaining = item.get("remainingLessonCount")
    if remaining is None:
        remaining = _sum_remaining_lessons(item.get("products"))

    products_summary = _products_summary(item.get("products"))
    product_names = [p["product_name"] for p in products_summary if p.get("product_name")]

    return {
        "id": str(item.get("id") or ""),
        "first_name": first_name,
        "last_name": last_name,
        "full_name": f"{first_name} {last_name}".strip() or "—",
        "status": status,
        "status_label": STUDENT_STATUS_LABELS.get(status, f"Статус {status}"),
        "email": email,
        "phone": phone,
        "skill_level_label": SKILL_LEVEL_LABELS.get(int(skill), None) if skill else None,
        "remaining_lessons": float(remaining or 0),
        "planned_lessons": float(item.get("plannedLessonCount") or 0),
        "completed_lessons": float(item.get("completedLessonCount") or 0),
        "product_names": product_names,
        "products_summary": products_summary,
    }


def student_belongs_to_teacher(student: dict[str, Any], teacher_id: str) -> bool:
    tid = str(teacher_id)
    for teacher in student.get("teachers") or []:
        if isinstance(teacher, dict) and str(teacher.get("id") or "") == tid:
            return True
    for product in student.get("products") or []:
        if not isinstance(product, dict):
            continue
        for teacher in product.get("teachers") or []:
            if isinstance(teacher, dict) and str(teacher.get("id") or "") == tid:
                return True
    return False


def enrich_teacher_student_detail(raw: dict[str, Any]) -> dict[str, Any]:
    email, phone, contacts = extract_contacts(raw.get("contacts"))
    base = parse_teacher_student_item(raw)
    skill = raw.get("avgSkillLevel")
    teacher_pairs = collect_student_teacher_pairs(raw)
    return {
        **base,
        "email": email,
        "phone": phone,
        "contacts": contacts,
        "is_child": bool(raw.get("isChild")),
        "skill_level": int(skill) if skill is not None else None,
        "skill_level_label": SKILL_LEVEL_LABELS.get(int(skill), None) if skill else None,
        "teacher_ids": [pair[0] for pair in teacher_pairs],
        "teacher_names": [pair[1] for pair in teacher_pairs],
        "chat_url": raw.get("chatUrl"),
    }


def ensure_viewing_teacher_on_student(
    detail: dict[str, Any],
    teacher_id: str,
    *,
    teacher_name: str | None = None,
) -> dict[str, Any]:
    """Якщо Optimate не повернув викладачів, додаємо поточного (хто переглядає картку)."""
    teacher_ids = list(detail.get("teacher_ids") or [])
    teacher_names = list(detail.get("teacher_names") or [])
    if teacher_ids or teacher_names:
        return detail
    tid = str(teacher_id).strip()
    if not tid:
        return detail
    name = (teacher_name or "").strip() or "Викладач"
    return {**detail, "teacher_ids": [tid], "teacher_names": [name]}


def parse_teacher_list_item(item: dict[str, Any]) -> dict[str, Any]:
    first_name = (item.get("firstName") or "").strip()
    last_name = (item.get("lastName") or "").strip()
    email, phone, contacts = extract_contacts(item.get("contacts"))
    status = int(item.get("status") or 0)
    stats = item.get("stats") if isinstance(item.get("stats"), dict) else {}

    return {
        "id": str(item.get("id") or ""),
        "first_name": first_name,
        "last_name": last_name,
        "full_name": f"{first_name} {last_name}".strip() or "—",
        "status": status,
        "status_label": TEACHER_STATUS_LABELS.get(status, f"Статус {status}"),
        "email": email,
        "phone": phone,
        "contacts": contacts,
        "description": item.get("description"),
        "photo_path": item.get("photoPath"),
        "students_count": stats.get("studentsCount") or item.get("studentsCount"),
        "product_count": stats.get("productCount") or item.get("productCount") or len(item.get("products") or []),
        "unmarked_lesson_count": stats.get("unmarkedLessonCount") or item.get("unmarkedLessonCount"),
        "products_summary": _products_summary(item.get("products")),
        "created_at": item.get("createdAt"),
        "updated_at": item.get("updatedAt"),
    }


def enrich_student_detail(raw: dict[str, Any]) -> dict[str, Any]:
    base = parse_student_list_item(raw)
    return {
        **base,
        "birth_date": raw.get("birthDate"),
        "external_references": raw.get("externalReferences"),
        "notes": parse_student_notes(raw.get("notes")),
        "products": raw.get("products") if isinstance(raw.get("products"), list) else [],
        "teachers": raw.get("teachers") if isinstance(raw.get("teachers"), list) else [],
        "raw": raw,
    }


def enrich_teacher_detail(raw: dict[str, Any]) -> dict[str, Any]:
    base = parse_teacher_list_item(raw)
    stats = raw.get("stats") if isinstance(raw.get("stats"), dict) else {}
    access = raw.get("teacherAccess") if isinstance(raw.get("teacherAccess"), dict) else {}
    auth_status = access.get("authStatus") or stats.get("authStatus")
    auth_int = int(auth_status) if auth_status is not None else None

    return {
        **base,
        "birth_date": raw.get("birthDate"),
        "stats": stats,
        "teacher_access": access,
        "auth_status": auth_int,
        "auth_status_label": AUTH_STATUS_LABELS.get(auth_int, None) if auth_int else None,
        "products": raw.get("products") if isinstance(raw.get("products"), list) else [],
        "raw": raw,
    }


def _completion_label(is_completed: Any) -> str:
    if is_completed is True:
        return COMPLETION_LABELS["completed"]
    if is_completed is False:
        return COMPLETION_LABELS["cancelled"]
    return COMPLETION_LABELS["planned"]


def collect_event_teacher_pairs(item: dict[str, Any]) -> list[tuple[str, str]]:
    """Повертає пари (id, name); name може бути порожнім — Optimate часто віддає лише id."""
    by_id: dict[str, str] = {}
    order: list[str] = []

    def add(entity: Any) -> None:
        if isinstance(entity, dict):
            teacher_id = str(entity.get("id") or "").strip()
            name = person_display_name(entity)
        elif entity is not None and str(entity).strip():
            teacher_id = str(entity).strip()
            name = ""
        else:
            return
        if not teacher_id:
            return
        if teacher_id not in by_id:
            order.append(teacher_id)
            by_id[teacher_id] = name
        elif name and not by_id[teacher_id]:
            by_id[teacher_id] = name

    for teacher in item.get("teachers") or []:
        add(teacher)

    teacher = item.get("teacher")
    if isinstance(teacher, dict):
        add(teacher)

    teacher_id = item.get("teacherId")
    if teacher_id is not None:
        add(teacher_id)

    for product in item.get("products") or []:
        if not isinstance(product, dict):
            continue
        for teacher in product.get("teachers") or []:
            add(teacher)

    product = item.get("product")
    if isinstance(product, dict):
        for teacher in product.get("teachers") or []:
            add(teacher)

    return [(tid, by_id[tid]) for tid in order]


def enrich_event_teacher_names(
    teacher_ids: list[str],
    teacher_names: list[str],
    name_map: dict[str, str],
) -> list[str]:
    enriched: list[str] = []
    for index, teacher_id in enumerate(teacher_ids):
        name = teacher_names[index].strip() if index < len(teacher_names) else ""
        if not name:
            name = name_map.get(teacher_id, "")
        enriched.append(name)
    return enriched


def enrich_admin_event_dict(event: dict[str, Any], name_map: dict[str, str]) -> dict[str, Any]:
    teacher_ids = list(event.get("teacher_ids") or [])
    if not teacher_ids:
        return event
    teacher_names = enrich_event_teacher_names(
        teacher_ids,
        list(event.get("teacher_names") or []),
        name_map,
    )
    return {**event, "teacher_names": teacher_names}


def parse_admin_event(item: dict[str, Any]) -> dict[str, Any]:
    is_completed = item.get("isCompleted")
    event_type = int(item.get("eventType") or 1)

    products = item.get("products") if isinstance(item.get("products"), list) else []
    product = products[0] if products and isinstance(products[0], dict) else {}
    product_type = product.get("type") or product.get("productType") or item.get("productType")
    product_type_int = int(product_type) if product_type is not None else None

    student_names: list[str] = []
    student_ids: list[str] = []
    for student in item.get("students") or []:
        if not isinstance(student, dict):
            continue
        sid = str(student.get("id") or "")
        if sid:
            student_ids.append(sid)
        name = (student.get("name") or "").strip()
        if not name:
            fn = (student.get("firstName") or "").strip()
            ln = (student.get("lastName") or "").strip()
            name = f"{fn} {ln}".strip()
        if name:
            student_names.append(name)

    teacher_pairs = collect_event_teacher_pairs(item)
    teacher_ids = [pair[0] for pair in teacher_pairs]
    teacher_names = [pair[1] for pair in teacher_pairs]

    return {
        "id": str(item.get("id") or ""),
        "event_type": event_type,
        "event_type_label": EVENT_TYPE_LABELS.get(event_type, "Подія"),
        "starts_at": str(item.get("startsAt") or ""),
        "ends_at": str(item.get("endsAt") or ""),
        "duration": int(item.get("duration") or 0),
        "is_trial": bool(item.get("isTrial")),
        "is_completed": is_completed if isinstance(is_completed, bool) else None,
        "completion_label": _completion_label(is_completed),
        "product_id": str(product.get("id") or product.get("productId") or "") or None,
        "product_name": product.get("name") or product.get("productName") or item.get("productName"),
        "product_type": product_type_int,
        "product_type_label": PRODUCT_TYPE_LABELS.get(product_type_int, "Урок") if product_type_int else "Урок",
        "student_names": student_names,
        "student_ids": student_ids,
        "teacher_names": teacher_names,
        "teacher_ids": teacher_ids,
    }


def parse_teacher_schedule(item: dict[str, Any]) -> dict[str, Any]:
    days_out: list[dict[str, Any]] = []
    for day in item.get("days") or []:
        if not isinstance(day, dict):
            continue
        day_num = int(day.get("day") or 0)
        slots: list[dict[str, str]] = []
        for slot in day.get("slots") or []:
            if not isinstance(slot, dict):
                continue
            start = slot.get("startTime")
            end = slot.get("endTime")
            if start and end:
                slots.append({"start_time": str(start), "end_time": str(end)})
        days_out.append({
            "day": day_num,
            "day_label": SCHEDULE_DAY_LABELS.get(day_num, f"День {day_num}"),
            "day_short": SCHEDULE_DAY_SHORT.get(day_num, str(day_num)),
            "slots": slots,
        })

    days_out.sort(key=lambda d: d["day"])

    return {
        "id": str(item.get("id") or ""),
        "start_date": item.get("startDate"),
        "timezone": item.get("timezone") or "Europe/Kyiv",
        "days": days_out,
    }


def _format_group_schedule(schedules: Any) -> str:
    if not isinstance(schedules, list) or not schedules:
        return "—"
    parts: list[str] = []
    for entry in schedules:
        if not isinstance(entry, dict):
            continue
        day_num = int(entry.get("day") or 0)
        start = entry.get("startTime")
        if not day_num or not start:
            continue
        day_short = SCHEDULE_DAY_SHORT.get(day_num, str(day_num))
        parts.append(f"{day_short} {str(start)[:5]}")
    return ", ".join(parts) if parts else "—"


def _format_group_level(levels: Any) -> Optional[str]:
    if not isinstance(levels, dict):
        return None
    min_level = levels.get("minLevel")
    max_level = levels.get("maxLevel")
    min_label = SKILL_LEVEL_LABELS.get(int(min_level)) if min_level is not None else None
    max_label = SKILL_LEVEL_LABELS.get(int(max_level)) if max_level is not None else None
    if min_label and max_label and min_label != max_label:
        return f"{min_label}→{max_label}"
    return min_label or max_label


def parse_teacher_group_item(item: dict[str, Any]) -> dict[str, Any]:
    products = item.get("products") if isinstance(item.get("products"), list) else []
    product = products[0] if products and isinstance(products[0], dict) else {}
    product_type = product.get("type")
    stats = item.get("stats") if isinstance(item.get("stats"), dict) else {}
    status = int(item.get("status") or 0)
    product_type_int = int(product_type) if product_type is not None else None

    return {
        "id": str(item.get("id") or ""),
        "name": (item.get("name") or "").strip() or "—",
        "status": status,
        "status_label": GROUP_STATUS_LABELS.get(status, f"Статус {status}"),
        "duration": int(item.get("duration") or 0),
        "max_student_count": int(item.get("maxStudentCount") or 0),
        "student_count": int(item.get("studentCount") or 0),
        "schedule_label": _format_group_schedule(item.get("schedules")),
        "level_label": _format_group_level(item.get("levels")),
        "product_name": product.get("name"),
        "product_type": product_type_int,
        "product_type_label": (
            PRODUCT_TYPE_LABELS.get(product_type_int, "Група") if product_type_int else "Група"
        ),
        "chat_url": item.get("chatUrl"),
        "start_date": item.get("startDate"),
        "end_date": item.get("endDate"),
        "planned_lessons": int(stats.get("plannedLessonCount") or 0),
        "completed_lessons": int(stats.get("completedLessonCount") or 0),
        "attendance_percentage": float(stats.get("attendancePercentage") or 0),
    }


def parse_group_student_item(item: dict[str, Any]) -> dict[str, Any]:
    email, phone, _contacts = extract_contacts(item.get("contacts"))
    status = int(item.get("status") or 0)
    return {
        "id": str(item.get("id") or ""),
        "full_name": person_display_name(item) or "—",
        "status": status,
        "status_label": STUDENT_STATUS_LABELS.get(status, f"Статус {status}"),
        "email": email,
        "phone": phone,
    }


def group_belongs_to_teacher(group: dict[str, Any], teacher_id: str) -> bool:
    tid = str(teacher_id)
    for teacher in group.get("teachers") or []:
        if isinstance(teacher, dict) and str(teacher.get("id") or "") == tid:
            return True
    return False
