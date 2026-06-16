from fastapi import APIRouter, Depends

from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.curriculum import CurriculumListOut, CurriculumRefreshOut
from app.services.curriculum_sheets import get_curriculum_programs

router = APIRouter()


@router.get("", response_model=CurriculumListOut)
async def list_curriculum_programs(
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    data, _, _ = await get_curriculum_programs(force_refresh=False)
    return data


@router.post("/refresh", response_model=CurriculumRefreshOut)
async def refresh_curriculum_programs(
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    data, _, from_cache = await get_curriculum_programs(force_refresh=True)
    return CurriculumRefreshOut(
        spreadsheet_id=data.spreadsheet_id,
        programs=data.programs,
        cached_at=data.cached_at,
        from_cache=from_cache,
        refreshed=not from_cache,
    )
