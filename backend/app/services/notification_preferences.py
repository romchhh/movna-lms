"""Teacher notification preferences."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.teacher_settings import NotificationPreferencesOut, NotificationPreferencesUpdate


def notification_preferences_out(user: User) -> NotificationPreferencesOut:
    return NotificationPreferencesOut(
        notify_homework=bool(user.notify_homework),
        notify_lesson_reminder=bool(user.notify_lesson_reminder),
    )


async def update_notification_preferences(
    db: AsyncSession,
    user: User,
    payload: NotificationPreferencesUpdate,
) -> NotificationPreferencesOut:
    if payload.notify_homework is not None:
        user.notify_homework = payload.notify_homework
    if payload.notify_lesson_reminder is not None:
        user.notify_lesson_reminder = payload.notify_lesson_reminder
    await db.flush()
    return notification_preferences_out(user)
