import enum
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, Enum, ForeignKey, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class HomeworkStatus(str, enum.Enum):
    PENDING = "pending"         # not submitted
    SUBMITTED = "submitted"     # waiting for review
    REVIEWED = "reviewed"       # teacher reviewed
    LATE = "late"               # submitted after deadline


class HomeworkTask(Base):
    """A homework assignment attached to a lesson (created by teacher/admin)."""
    __tablename__ = "homework_tasks"

    id: Mapped[int]           = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int]    = mapped_column(ForeignKey("lessons.id"))
    teacher_id: Mapped[int]   = mapped_column(ForeignKey("users.id"))
    title: Mapped[str]        = mapped_column(String(255))
    description: Mapped[str]  = mapped_column(Text, default="")
    task_type: Mapped[str]    = mapped_column(String(50), default="text")  # text|file|audio|test
    due_days_after: Mapped[int] = mapped_column(Integer, default=7)        # days after lesson date
    max_score: Mapped[float]  = mapped_column(Float, default=10.0)
    is_active: Mapped[bool]   = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    lesson: Mapped["Lesson"]         = relationship(back_populates="homework_tasks")  # noqa
    submissions: Mapped[list["Homework"]] = relationship(back_populates="task", lazy="select")


class Homework(Base):
    """A student's submission for a homework task."""
    __tablename__ = "homework"

    id: Mapped[int]             = mapped_column(Integer, primary_key=True)
    task_id: Mapped[int]        = mapped_column(ForeignKey("homework_tasks.id"))
    student_id: Mapped[int]     = mapped_column(ForeignKey("users.id"))
    teacher_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Submission
    status: Mapped[HomeworkStatus] = mapped_column(Enum(HomeworkStatus), default=HomeworkStatus.PENDING)
    text_answer: Mapped[str]    = mapped_column(Text, default="")
    file_url: Mapped[str]       = mapped_column(String(500), default="")    # uploaded file
    audio_url: Mapped[str]      = mapped_column(String(500), default="")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deadline: Mapped[datetime | None]     = mapped_column(DateTime, nullable=True)

    # Review
    score: Mapped[float | None]   = mapped_column(Float, nullable=True)
    comment: Mapped[str]          = mapped_column(Text, default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    task: Mapped[HomeworkTask]    = relationship(back_populates="submissions")
    student: Mapped["User"]       = relationship(foreign_keys=[student_id], back_populates="submitted_homeworks")  # noqa
    teacher: Mapped["User | None"] = relationship(foreign_keys=[teacher_id], back_populates="reviewed_homeworks")  # noqa
