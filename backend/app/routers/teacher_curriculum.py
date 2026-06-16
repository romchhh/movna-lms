from fastapi import APIRouter, Depends

from app.core.security import require_role
from app.models.user import User, UserRole
from app.schemas.curriculum import CurriculumListOut
from app.services.curriculum_sheets import get_curriculum_programs

router = APIRouter()


@router.get("", response_model=CurriculumListOut)
async def list_curriculum_programs(
    _teacher: User = Depends(require_role(UserRole.TEACHER, UserRole.ADMIN)),
):
    data, _, _ = await get_curriculum_programs(force_refresh=False)
    return data
