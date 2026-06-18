from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.faq import FaqListOut, FaqPublicItemOut
from app.services.faq import list_faq_for_role

router = APIRouter()


@router.get("", response_model=FaqListOut)
async def get_faq(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await list_faq_for_role(db, current_user.role, published_only=True)
    return FaqListOut(items=[FaqPublicItemOut.model_validate(i) for i in items])
