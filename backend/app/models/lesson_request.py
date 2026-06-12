import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LessonRequestType(str, enum.Enum):
    CANCEL = "cancel"
    RESCHEDULE = "reschedule"


class LessonRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class LessonRequest(Base):
    __tablename__ = "lesson_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    optimate_event_id: Mapped[str] = mapped_column(String(64), index=True)
    request_type: Mapped[LessonRequestType] = mapped_column(Enum(LessonRequestType))
    status: Mapped[LessonRequestStatus] = mapped_column(
        Enum(LessonRequestStatus),
        default=LessonRequestStatus.PENDING,
        index=True,
    )

    event_title: Mapped[str] = mapped_column(String(255), default="")
    event_starts_at: Mapped[datetime] = mapped_column(DateTime)
    event_ends_at: Mapped[datetime] = mapped_column(DateTime)
    teacher_name: Mapped[str] = mapped_column(String(255), default="")
    teacher_optimate_id: Mapped[str] = mapped_column(String(64), default="", index=True)

    requested_starts_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    requested_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    student_comment: Mapped[str] = mapped_column(Text, default="")
    admin_note: Mapped[str] = mapped_column(Text, default="")

    resolved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    student: Mapped["User"] = relationship(foreign_keys=[student_id])  # noqa: F821
    resolved_by: Mapped["User | None"] = relationship(foreign_keys=[resolved_by_id])  # noqa: F821
