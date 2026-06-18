"""LMS profile: avatars and teacher about-me."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user_profile import LmsProfileMeOut, LmsProfilePublicOut


def _full_name(user: User) -> str:
    return user.full_name or user.email


def profile_me_out(user: User) -> LmsProfileMeOut:
    return LmsProfileMeOut(
        optimate_id=user.optimeit_id or "",
        full_name=_full_name(user),
        avatar_url=user.avatar_url or "",
        about_me=user.about_me or "",
        role=user.role.value if user.role else "",
    )


def profile_public_out(user: User) -> LmsProfilePublicOut:
    return LmsProfilePublicOut(
        optimate_id=user.optimeit_id or "",
        full_name=_full_name(user),
        avatar_url=user.avatar_url or "",
        about_me=user.about_me or "",
        role=user.role.value if user.role else "",
    )


async def lookup_profiles_by_optimate_ids(
    db: AsyncSession,
    optimate_ids: list[str],
) -> dict[str, LmsProfilePublicOut]:
    ids = [str(i).strip() for i in optimate_ids if str(i).strip()]
    if not ids:
        return {}

    result = await db.execute(
        select(User).where(User.optimeit_id.in_(ids))
    )
    users = result.scalars().all()
    by_id = {u.optimeit_id: u for u in users if u.optimeit_id}

    out: dict[str, LmsProfilePublicOut] = {}
    for oid in ids:
        user = by_id.get(oid)
        if user:
            out[oid] = profile_public_out(user)
    return out
