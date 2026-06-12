"""Shared helpers for Optimate API routers."""

from datetime import datetime, timezone

from fastapi import HTTPException

from app.schemas.optimate import CacheMeta
from app.services.optimate import get_optimate_client


def cache_meta(cached_at: float, from_cache: bool) -> CacheMeta:
    return CacheMeta(
        cached=from_cache,
        synced_at=datetime.fromtimestamp(cached_at, tz=timezone.utc),
    )


def ensure_optimate_configured() -> None:
    if not get_optimate_client().is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")
