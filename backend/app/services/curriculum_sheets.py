"""Fetch and parse curriculum programs from Google Sheets."""

from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from google.oauth2 import service_account
from googleapiclient.discovery import build

from app.core.config import settings
from app.schemas.curriculum import (
    CurriculumLessonOut,
    CurriculumListOut,
    CurriculumModuleOut,
    CurriculumProgramOut,
)
from app.services.ttl_cache import TTLCache

_curriculum_cache = TTLCache(max_entries=8)
_CACHE_KEY = "curriculum:all"
_SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

_MODULE_MARKERS = ("модуль", "module")
_TYPE_MARKERS = ("тип", "type")
_TOPIC_MARKERS = ("тема", "topic", "theme")
_ACTIVITIES_MARKERS = (
    "що роблять",
    "students",
    "student",
    "діяльність",
    "activities",
    "activity",
)
_NUMBER_MARKERS = ("#", "№", "номер", "number", "n", "урок", "lesson")


def _sheet_range(title: str) -> str:
    escaped = title.replace("'", "''")
    return f"'{escaped}'"


def _slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower(), flags=re.UNICODE)
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")
    return slug or "program"


def _norm_header(cell: str) -> str:
    return re.sub(r"\s+", " ", (cell or "").strip().lower())


def _cell(row: list[str], idx: int | None) -> str:
    if idx is None or idx >= len(row):
        return ""
    return str(row[idx] or "").strip()


def _parse_int(value: str) -> int | None:
    raw = (value or "").strip()
    if not raw:
        return None
    match = re.search(r"\d+", raw)
    return int(match.group()) if match else None


def _find_header_row(rows: list[list[str]]) -> tuple[int, dict[str, int | None]] | None:
    for i, row in enumerate(rows[:20]):
        norms = [_norm_header(c) for c in row]
        if not any(norms):
            continue
        has_type = any(any(m in n for m in _TYPE_MARKERS) for n in norms)
        has_topic = any(any(m in n for m in _TOPIC_MARKERS) for n in norms)
        has_number = any(n in _NUMBER_MARKERS or n.replace(".", "") in _NUMBER_MARKERS for n in norms)
        if not (has_type and has_topic):
            continue

        cols: dict[str, int | None] = {
            "module": None,
            "number": None,
            "type": None,
            "topic": None,
            "activities": None,
        }
        for j, n in enumerate(norms):
            if not n:
                continue
            if cols["module"] is None and any(m in n for m in _MODULE_MARKERS):
                cols["module"] = j
            elif cols["number"] is None and (
                n in _NUMBER_MARKERS or n.replace(".", "") in _NUMBER_MARKERS
            ):
                cols["number"] = j
            elif cols["type"] is None and any(m in n for m in _TYPE_MARKERS):
                cols["type"] = j
            elif cols["topic"] is None and any(m in n for m in _TOPIC_MARKERS):
                cols["topic"] = j
            elif cols["activities"] is None and any(m in n for m in _ACTIVITIES_MARKERS):
                cols["activities"] = j

        if cols["topic"] is None:
            continue
        if cols["module"] is None and cols["number"] is not None and cols["number"] > 0:
            cols["module"] = 0
        if cols["number"] is None:
            for j, n in enumerate(norms):
                if n in _NUMBER_MARKERS or n.replace(".", "") in _NUMBER_MARKERS:
                    cols["number"] = j
                    break
        return i, cols
    return None


def _parse_sheet_rows(sheet_name: str, sheet_id: int, rows: list[list[str]]) -> CurriculumProgramOut | None:
    header = _find_header_row(rows)
    if not header:
        return None

    header_idx, cols = header
    modules_map: dict[str, list[CurriculumLessonOut]] = {}
    module_order: list[str] = []
    current_module = ""

    for row in rows[header_idx + 1 :]:
        if not any(str(c or "").strip() for c in row):
            continue

        module_raw = _cell(row, cols["module"])
        if module_raw:
            current_module = module_raw

        topic = _cell(row, cols["topic"])
        lesson_type = _cell(row, cols["type"])
        activities = _cell(row, cols["activities"])
        number = _parse_int(_cell(row, cols["number"]))

        if not topic and not lesson_type and not activities and number is None:
            continue
        if not topic and lesson_type.lower() in ("revision", "ревізія", "повторення"):
            topic = lesson_type
            lesson_type = "Revision"

        module_name = current_module or "Без модуля"
        lesson = CurriculumLessonOut(
            number=number,
            lesson_type=lesson_type,
            topic=topic or "—",
            student_activities=activities,
        )

        if module_name not in modules_map:
            modules_map[module_name] = []
            module_order.append(module_name)
        modules_map[module_name].append(lesson)

    if not module_order:
        return None

    modules = [
        CurriculumModuleOut(name=name, lessons=modules_map[name])
        for name in module_order
    ]
    lesson_count = sum(len(m.lessons) for m in modules)

    return CurriculumProgramOut(
        sheet_id=sheet_id,
        name=sheet_name,
        slug=_slugify(sheet_name),
        modules=modules,
        lesson_count=lesson_count,
        module_count=len(modules),
    )


def _load_credentials_info() -> dict[str, Any]:
    if settings.GOOGLE_SHEETS_CREDENTIALS_JSON.strip():
        try:
            return json.loads(settings.GOOGLE_SHEETS_CREDENTIALS_JSON)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail="Невірний GOOGLE_SHEETS_CREDENTIALS_JSON") from exc

    candidates: list[Path] = []
    if settings.GOOGLE_SHEETS_CREDENTIALS_PATH.strip():
        candidates.append(Path(settings.GOOGLE_SHEETS_CREDENTIALS_PATH))
    backend_dir = Path(__file__).resolve().parents[2]
    candidates.extend([
        backend_dir / "credentials.json",
        backend_dir.parent / "credentials.json",
    ])

    for path in candidates:
        if path.is_file():
            with path.open(encoding="utf-8") as fh:
                return json.load(fh)

    raise HTTPException(
        status_code=503,
        detail="Google Sheets credentials не налаштовано (GOOGLE_SHEETS_CREDENTIALS_JSON або файл credentials.json)",
    )


def _fetch_programs_sync() -> CurriculumListOut:
    spreadsheet_id = settings.GOOGLE_SHEETS_SPREADSHEET_ID.strip()
    if not spreadsheet_id:
        raise HTTPException(status_code=503, detail="GOOGLE_SHEETS_SPREADSHEET_ID не вказано")

    creds_info = _load_credentials_info()
    credentials = service_account.Credentials.from_service_account_info(creds_info, scopes=_SCOPES)
    service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    sheets_meta = spreadsheet.get("sheets", [])

    programs: list[CurriculumProgramOut] = []
    for meta in sheets_meta:
        props = meta.get("properties", {})
        title = str(props.get("title", "")).strip()
        sheet_id = int(props.get("sheetId", 0))
        if not title or title.startswith("_"):
            continue

        result = (
            service.spreadsheets()
            .values()
            .get(
                spreadsheetId=spreadsheet_id,
                range=f"{_sheet_range(title)}!A1:F500",
            )
            .execute()
        )
        rows = result.get("values", [])
        if not rows:
            continue

        program = _parse_sheet_rows(title, sheet_id, rows)
        if program:
            programs.append(program)

    programs.sort(key=lambda p: p.name.lower())
    return CurriculumListOut(spreadsheet_id=spreadsheet_id, programs=programs)


async def get_curriculum_programs(*, force_refresh: bool = False) -> tuple[CurriculumListOut, float, bool]:
    ttl = max(60, settings.SHEETS_SYNC_INTERVAL_MINUTES * 60)

    async def fetch() -> CurriculumListOut:
        return await asyncio.to_thread(_fetch_programs_sync)

    data, cached_at, from_cache = await _curriculum_cache.get_or_fetch(
        _CACHE_KEY,
        ttl_seconds=ttl,
        fetcher=fetch,
        force_refresh=force_refresh,
    )
    data.cached_at = cached_at
    data.from_cache = from_cache
    return data, cached_at, from_cache


async def get_curriculum_program_by_slug(
    slug: str,
    *,
    force_refresh: bool = False,
) -> CurriculumProgramOut | None:
    data, _, _ = await get_curriculum_programs(force_refresh=force_refresh)
    needle = slug.strip().lower()
    for program in data.programs:
        if program.slug.lower() == needle:
            return program
    return None
