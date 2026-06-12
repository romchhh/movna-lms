"""Local file storage for homework attachments."""

from __future__ import annotations

import mimetypes
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg",
    ".gif", ".webp", ".mp4", ".webm", ".mov", ".m4v",
    ".mp3", ".m4a", ".wav", ".zip", ".ppt", ".pptx",
    ".xls", ".xlsx",
}


def _upload_root() -> Path:
    root = Path(settings.LOCAL_UPLOAD_DIR).resolve()
    hw = root / "homework"
    hw.mkdir(parents=True, exist_ok=True)
    return hw


def _safe_filename(name: str) -> str:
    base = Path(name).name
    base = re.sub(r"[^\w.\- ()\u0400-\u04FF]", "_", base)
    return base[:180] or "file"


async def save_homework_upload(file: UploadFile) -> dict[str, str | int]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл без імені")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Тип файлу не дозволено: {ext}")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Файл завеликий (макс. 15 МБ)")
    if not content:
        raise HTTPException(status_code=400, detail="Порожній файл")

    file_id = uuid.uuid4().hex
    safe = _safe_filename(file.filename)
    stored = f"{file_id}_{safe}"
    path = _upload_root() / stored
    path.write_bytes(content)

    return {
        "id": file_id,
        "filename": safe,
        "url": f"/api/homework/files/{stored}",
        "size_bytes": len(content),
    }


def resolve_homework_file(stored_name: str) -> Path:
    if ".." in stored_name or "/" in stored_name or "\\" in stored_name:
        raise HTTPException(status_code=400, detail="Невірний шлях")
    path = _upload_root() / stored_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    return path


def guess_media_type(path: Path) -> str:
    media_type, _ = mimetypes.guess_type(path.name)
    return media_type or "application/octet-stream"


def display_filename(stored_name: str) -> str:
    """Original upload name (strip uuid prefix)."""
    return stored_name.split("_", 1)[-1] if "_" in stored_name else stored_name
