from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

FaqAudienceLiteral = Literal["all", "student", "teacher"]


class FaqItemOut(BaseModel):
    id: int
    question: str
    answer_md: str
    audience: FaqAudienceLiteral
    sort_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FaqPublicItemOut(BaseModel):
    id: int
    question: str
    answer_md: str
    audience: FaqAudienceLiteral

    model_config = {"from_attributes": True}


class FaqListOut(BaseModel):
    items: list[FaqPublicItemOut]


class FaqAdminListOut(BaseModel):
    items: list[FaqItemOut]


class FaqItemCreate(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    answer_md: str = ""
    audience: FaqAudienceLiteral = "all"
    is_published: bool = True


class FaqItemUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=1, max_length=500)
    answer_md: str | None = None
    audience: FaqAudienceLiteral | None = None
    is_published: bool | None = None
    sort_order: int | None = None


class FaqReorderIn(BaseModel):
    ids: list[int] = Field(min_length=1)
