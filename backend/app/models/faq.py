import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FaqAudience(str, enum.Enum):
    ALL = "all"
    STUDENT = "student"
    TEACHER = "teacher"


class FaqItem(Base):
    __tablename__ = "faq_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(String(500))
    answer_md: Mapped[str] = mapped_column(Text, default="")
    audience: Mapped[FaqAudience] = mapped_column(Enum(FaqAudience), default=FaqAudience.ALL)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
