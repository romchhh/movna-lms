"""Local file storage for homework attachments and profile avatars."""

from __future__ import annotations

import mimetypes
import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import settings

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_AVATAR_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg",
    ".gif", ".webp", ".mp4", ".webm", ".mov", ".m4v",
    ".mp3", ".m4a", ".wav", ".zip", ".ppt", ".pptx",
    ".xls", ".xlsx",
}
AVATAR_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _storage_root() -> Path:
    root = Path(settings.LOCAL_UPLOAD_DIR).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _upload_root() -> Path:
    hw = _storage_root() / "homework"
    hw.mkdir(parents=True, exist_ok=True)
    return hw


def _avatar_root() -> Path:
    av = _storage_root() / "avatars"
    av.mkdir(parents=True, exist_ok=True)
    return av


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


def avatar_public_url(stored_name: str) -> str:
    return f"/api/profile/files/{stored_name}"


def _validate_stored_name(stored_name: str) -> None:
    if ".." in stored_name or "/" in stored_name or "\\" in stored_name:
        raise HTTPException(status_code=400, detail="Невірний шлях")


async def save_avatar_upload(file: UploadFile) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Файл без імені")

    ext = Path(file.filename).suffix.lower()
    if ext not in AVATAR_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Дозволені лише зображення (jpg, png, webp, gif)")

    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Зображення завелике (макс. 5 МБ)")
    if not content:
        raise HTTPException(status_code=400, detail="Порожній файл")

    file_id = uuid.uuid4().hex
    safe = _safe_filename(file.filename)
    stored = f"{file_id}_{safe}"
    path = _avatar_root() / stored
    path.write_bytes(content)

    return {
        "stored_name": stored,
        "url": avatar_public_url(stored),
    }


def resolve_avatar_file(stored_name: str) -> Path:
    _validate_stored_name(stored_name)
    path = _avatar_root() / stored_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    return path


def delete_avatar_file(stored_name: str) -> None:
    if not stored_name:
        return
    try:
        path = resolve_avatar_file(stored_name)
    except HTTPException:
        return
    path.unlink(missing_ok=True)


def avatar_stored_name_from_url(avatar_url: str) -> str:
    if not avatar_url:
        return ""
    path = avatar_url.split("?", 1)[0].split("#", 1)[0]
    prefix = "/api/profile/files/"
    if prefix in path:
        return path.rsplit(prefix, 1)[-1]
    return ""
