from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.user_profile import (
    LmsProfileLookupIn,
    LmsProfileLookupOut,
    LmsProfileMeOut,
    LmsProfileMeUpdate,
)
from app.services.file_storage import (
    avatar_stored_name_from_url,
    delete_avatar_file,
    guess_media_type,
    resolve_avatar_file,
    save_avatar_upload,
)
from app.services.user_profile import lookup_profiles_by_optimate_ids, profile_me_out

router = APIRouter()


@router.get("/me", response_model=LmsProfileMeOut)
async def get_my_lms_profile(
    current_user: User = Depends(get_current_user),
):
    return profile_me_out(current_user)


@router.put("/me", response_model=LmsProfileMeOut)
async def update_my_lms_profile(
    body: LmsProfileMeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    if body.about_me is not None:
        current_user.about_me = body.about_me.strip()
    await db.flush()
    return profile_me_out(current_user)


@router.post("/avatar", response_model=LmsProfileMeOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved = await save_avatar_upload(file)
    old_stored = avatar_stored_name_from_url(current_user.avatar_url or "")
    current_user.avatar_url = saved["url"]
    await db.flush()
    if old_stored and old_stored != saved["stored_name"]:
        delete_avatar_file(old_stored)
    return profile_me_out(current_user)


@router.delete("/avatar", response_model=LmsProfileMeOut)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    old_stored = avatar_stored_name_from_url(current_user.avatar_url or "")
    current_user.avatar_url = ""
    await db.flush()
    if old_stored:
        delete_avatar_file(old_stored)
    return profile_me_out(current_user)


@router.post("/lookup", response_model=LmsProfileLookupOut)
async def lookup_lms_profiles(
    body: LmsProfileLookupIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profiles = await lookup_profiles_by_optimate_ids(db, body.optimate_ids)
    return LmsProfileLookupOut(profiles=profiles)


@router.get("/files/{stored_name}")
async def get_avatar_file(stored_name: str):
    """Public read — filename is an unguessable UUID prefix."""
    path = resolve_avatar_file(stored_name)
    return FileResponse(
        path,
        media_type=guess_media_type(path),
        headers={"Cache-Control": "public, max-age=86400"},
    )
