from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TeacherEventCancellation(Base):
    """Причина скасування уроку — зберігається в LMS (Optimate API не віддає reason)."""

    __tablename__ = "teacher_event_cancellations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    optimate_event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    teacher_optimate_id: Mapped[str] = mapped_column(String(64), index=True)
    reason_code: Mapped[str] = mapped_column(String(64))
    reason_label: Mapped[str] = mapped_column(String(255))
    note: Mapped[str] = mapped_column(Text, default="")
    # cancelled_planned | completed | not_held
    outcome: Mapped[str] = mapped_column(String(32), default="cancelled_planned")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
