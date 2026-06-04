"""Link Optimate teachers to LMS user accounts and manage login passwords."""
from __future__ import annotations

import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.password_vault import decrypt_login_password, encrypt_login_password
from app.services.student_account import generate_portal_password


async def find_teacher_user(db: AsyncSession, optimate_id: str, email: str | None) -> User | None:
    if optimate_id:
        result = await db.execute(
            select(User).where(
                User.optimeit_id == str(optimate_id),
                User.role == UserRole.TEACHER,
            )
        )
        user = result.scalar_one_or_none()
        if user:
            return user

    if email:
        result = await db.execute(
            select(User).where(User.email == email.lower(), User.role == UserRole.TEACHER)
        )
        return result.scalar_one_or_none()

    return None


async def ensure_teacher_user(
    db: AsyncSession,
    *,
    optimate_id: str,
    email: str,
    first_name: str,
    last_name: str,
    phone: str = "",
) -> User:
    email_norm = email.strip().lower()
    if not email_norm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У викладача немає email в Optimate — неможливо створити акаунт для входу",
        )

    user = await find_teacher_user(db, optimate_id, email_norm)
    if user:
        user.optimeit_id = str(optimate_id)
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        if phone and not user.phone:
            user.phone = phone
        user.is_active = True
        return user

    user = User(
        email=email_norm,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        first_name=first_name,
        last_name=last_name,
        phone=phone or "",
        role=UserRole.TEACHER,
        optimeit_id=str(optimate_id),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    return user


async def set_teacher_login_password(db: AsyncSession, user: User, password: str) -> None:
    plain = password.strip()
    if len(plain) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль має містити щонайменше 6 символів",
        )
    user.hashed_password = hash_password(plain)
    user.login_password_enc = encrypt_login_password(plain)
    user.is_active = True


def readable_password(user: User) -> str | None:
    return decrypt_login_password(user.login_password_enc or "")
