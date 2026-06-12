"""Профіль студента / викладача для налаштувань порталу."""
from __future__ import annotations

from typing import Any, Optional

from app.schemas.optimate import (
    BirthDateOut,
    StudentProfileOut,
    StudentProfileUpdate,
    TeacherProfileOut,
    TeacherProfileUpdate,
)
from app.services.optimate_parsers import parse_student_list_item, parse_teacher_list_item


def _parse_birth_date(raw: Any) -> Optional[BirthDateOut]:
    if not isinstance(raw, dict):
        return None
    day, month, year = raw.get("day"), raw.get("month"), raw.get("year")
    if day is None or month is None or year is None:
        return None
    try:
        return BirthDateOut(day=int(day), month=int(month), year=int(year))
    except (TypeError, ValueError):
        return None


def student_profile_out(raw: dict[str, Any]) -> StudentProfileOut:
    parsed = parse_student_list_item(raw)
    return StudentProfileOut(
        id=parsed["id"],
        first_name=parsed["first_name"],
        last_name=parsed["last_name"],
        full_name=parsed["full_name"],
        email=parsed.get("email"),
        phone=parsed.get("phone"),
        chat_url=parsed.get("chat_url"),
        birth_date=_parse_birth_date(raw.get("birthDate")),
    )


def teacher_profile_out(raw: dict[str, Any]) -> TeacherProfileOut:
    parsed = parse_teacher_list_item(raw)
    return TeacherProfileOut(
        id=parsed["id"],
        first_name=parsed["first_name"],
        last_name=parsed["last_name"],
        full_name=parsed["full_name"],
        email=parsed.get("email"),
        phone=parsed.get("phone"),
        description=parsed.get("description"),
    )


def build_student_patch(body: StudentProfileUpdate) -> dict[str, Any]:
    """Map portal fields → Optimate PATCH /api/v1/students/{id} body."""
    payload: dict[str, Any] = {}
    fields_set = body.model_fields_set

    if body.first_name is not None:
        payload["firstName"] = body.first_name.strip()
    if body.last_name is not None:
        payload["lastName"] = body.last_name.strip()
    if body.chat_url is not None:
        value = body.chat_url.strip()
        payload["chatUrl"] = value or None
    if "birth_date" in fields_set:
        if body.birth_date is None:
            payload["birthDate"] = None
        else:
            payload["birthDate"] = {
                "day": body.birth_date.day,
                "month": body.birth_date.month,
                "year": body.birth_date.year,
            }
    return payload


def build_teacher_patch(body: TeacherProfileUpdate) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if body.first_name is not None:
        payload["firstName"] = body.first_name.strip()
    if body.last_name is not None:
        payload["lastName"] = body.last_name.strip()
    if body.description is not None:
        payload["description"] = body.description
    return payload
