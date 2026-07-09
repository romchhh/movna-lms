"""Спільна логіка автентифікації з перевіркою Optimate."""
from __future__ import annotations

import secrets

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.optimate import ParsedContact, get_optimate_client


async def verify_optimate_for_user(user: User) -> ParsedContact | None:
    """
    Перевіряє, що student/teacher існує в Optimate.
    Адмінів не перевіряємо. Якщо Optimate не налаштовано — пропускаємо.
    """
    if user.role == UserRole.ADMIN:
        return None

    if user.role not in (UserRole.STUDENT, UserRole.TEACHER):
        return None

    client = get_optimate_client()
    if not client.is_configured:
        if settings.OPTIMATE_VERIFY_ON_LOGIN:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Optimate API не налаштовано",
            )
        return None

    if user.role == UserRole.STUDENT:
        contact = await client.find_student_by_contacts(email=user.email, phone=user.phone or None)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Студента з таким email не знайдено в Optimate",
            )
        return contact

    contact = await client.find_teacher_by_contacts(email=user.email, phone=user.phone or None)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Викладача з таким email не знайдено в Optimate",
        )
    return contact


def record_user_login(user: User) -> None:
    user.last_login_at = datetime.now(timezone.utc)


async def sync_user_from_optimate(user: User, contact: ParsedContact | None) -> None:
    if not contact:
        return
    user.optimeit_id = str(contact.id)
    if contact.first_name:
        user.first_name = contact.first_name
    if contact.last_name:
        user.last_name = contact.last_name
    if contact.phone and not user.phone:
        user.phone = contact.phone


async def get_or_create_user_from_optimate(
    db: AsyncSession,
    email: str,
    role: UserRole,
    contact: ParsedContact,
) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        if user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Адміністратори входять через пароль",
            )
        user.role = role
        user.is_active = True
    else:
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            first_name=contact.first_name,
            last_name=contact.last_name,
            phone=contact.phone or "",
            role=role,
            is_active=True,
            is_verified=True,
        )
        db.add(user)

    await sync_user_from_optimate(user, contact)
    await db.flush()
    return user
