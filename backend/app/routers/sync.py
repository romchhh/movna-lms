"""
Sync service — stubs for Optimeite CRM and Google Sheets integration.
Fill in real HTTP calls once API docs are available.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole

router = APIRouter()


@router.post("/optimeite/pull")
async def pull_from_optimeite(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    TODO: Call Optimeite API, sync:
      - students (profile, balance)
      - schedule (classes, zoom links)
      - teachers + groups
    Returns summary of changes.
    """
    return {"synced": 0, "message": "Optimeite API not configured yet"}


@router.post("/sheets/pull")
async def pull_from_sheets(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    TODO: Read Google Sheet rows → upsert Course / Module / Lesson records.
    Sheet columns expected: module_title, lesson_order, lesson_title,
    video_url, miro_url, description, duration_min
    """
    return {"synced": 0, "message": "Google Sheets credentials not configured yet"}
