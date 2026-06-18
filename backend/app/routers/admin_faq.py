from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.faq import FaqAudience, FaqItem
from app.models.user import User, UserRole
from app.schemas.faq import (
    FaqAdminListOut,
    FaqItemCreate,
    FaqItemOut,
    FaqItemUpdate,
    FaqReorderIn,
)
from app.services.faq import get_faq_item, list_all_faq, reorder_faq

router = APIRouter()


@router.get("", response_model=FaqAdminListOut)
async def admin_list_faq(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    items = await list_all_faq(db)
    return FaqAdminListOut(items=[FaqItemOut.model_validate(i) for i in items])


@router.post("", response_model=FaqItemOut)
async def admin_create_faq(
    body: FaqItemCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    items = await list_all_faq(db)
    max_order = max((i.sort_order for i in items), default=-1)
    item = FaqItem(
        question=body.question.strip(),
        answer_md=body.answer_md.strip(),
        audience=FaqAudience(body.audience),
        sort_order=max_order + 1,
        is_published=body.is_published,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return FaqItemOut.model_validate(item)


@router.put("/reorder", response_model=FaqAdminListOut)
async def admin_reorder_faq(
    body: FaqReorderIn,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    items = await reorder_faq(db, body.ids)
    return FaqAdminListOut(items=[FaqItemOut.model_validate(i) for i in items])


@router.put("/{item_id}", response_model=FaqItemOut)
async def admin_update_faq(
    item_id: int,
    body: FaqItemUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = await get_faq_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Запис FAQ не знайдено")
    if body.question is not None:
        item.question = body.question.strip()
    if body.answer_md is not None:
        item.answer_md = body.answer_md.strip()
    if body.audience is not None:
        item.audience = FaqAudience(body.audience)
    if body.is_published is not None:
        item.is_published = body.is_published
    if body.sort_order is not None:
        item.sort_order = body.sort_order
    await db.flush()
    await db.refresh(item)
    return FaqItemOut.model_validate(item)


@router.delete("/{item_id}", status_code=204)
async def admin_delete_faq(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role(UserRole.ADMIN)),
):
    item = await get_faq_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Запис FAQ не знайдено")
    await db.delete(item)
    await db.flush()
