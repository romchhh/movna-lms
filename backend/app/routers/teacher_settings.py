from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.teacher_settings import MeetingLinksOut, MeetingLinksUpdate
from app.schemas.teacher_settings import (
    NotificationPreferencesOut,
    NotificationPreferencesUpdate,
)
from app.services.lesson_alert import meeting_links_out, update_meeting_links
from app.services.notification_preferences import (
    notification_preferences_out,
    update_notification_preferences,
)

router = APIRouter()


@router.get("/meeting-links", response_model=MeetingLinksOut)
async def get_meeting_links(
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return meeting_links_out(current_user)


@router.put("/meeting-links", response_model=MeetingLinksOut)
async def put_meeting_links(
    payload: MeetingLinksUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await update_meeting_links(
        db,
        current_user,
        payload.zoom_url,
        payload.miro_url,
    )


@router.get("/notifications", response_model=NotificationPreferencesOut)
async def get_notification_preferences(
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return notification_preferences_out(current_user)


@router.put("/notifications", response_model=NotificationPreferencesOut)
async def put_notification_preferences(
    payload: NotificationPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    return await update_notification_preferences(db, current_user, payload)
