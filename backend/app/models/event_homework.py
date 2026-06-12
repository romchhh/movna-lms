import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventHomeworkSubmissionStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    VIEWED = "viewed"
    COMPLETED = "completed"
    REVIEWED = "reviewed"


class EventHomeworkAssignment(Base):
    """ДЗ привʼязане до уроку Optimate (optimate_event_id)."""
    __tablename__ = "event_homework_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    optimate_event_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    teacher_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    teacher_optimate_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    body_markdown: Mapped[str] = mapped_column(Text, default="")
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    teacher_attachments_json: Mapped[str] = mapped_column(Text, default="[]")
    event_starts_at: Mapped[str] = mapped_column(String(64), default="")
    event_ends_at: Mapped[str] = mapped_column(String(64), default="")
    event_title: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow,
    )

    submissions: Mapped[list["EventHomeworkSubmission"]] = relationship(
        back_populates="assignment",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class EventHomeworkSubmission(Base):
    __tablename__ = "event_homework_submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_optimate_id", name="uq_hw_assignment_student"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("event_homework_assignments.id", ondelete="CASCADE"),
        index=True,
    )
    student_optimate_id: Mapped[str] = mapped_column(String(64), index=True)
    student_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    student_name: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[EventHomeworkSubmissionStatus] = mapped_column(
        Enum(EventHomeworkSubmissionStatus),
        default=EventHomeworkSubmissionStatus.ASSIGNED,
    )
    student_answer_md: Mapped[str] = mapped_column(Text, default="")
    student_file_url: Mapped[str] = mapped_column(String(500), default="")
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    teacher_review_note: Mapped[str] = mapped_column(Text, default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assignment: Mapped[EventHomeworkAssignment] = relationship(back_populates="submissions")
