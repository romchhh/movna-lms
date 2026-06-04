import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ClassType(str, enum.Enum):
    GROUP = "group"
    INDIVIDUAL = "individual"
    SPEAKING_CLUB = "speaking_club"


class ScheduledClass(Base):
    """A scheduled lesson slot — synced from Optimeite."""
    __tablename__ = "scheduled_classes"

    id: Mapped[int]             = mapped_column(Integer, primary_key=True)
    teacher_id: Mapped[int]     = mapped_column(ForeignKey("users.id"))
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id"), nullable=True)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id"), nullable=True)

    title: Mapped[str]          = mapped_column(String(255), default="")
    class_type: Mapped[ClassType] = mapped_column(Enum(ClassType), default=ClassType.GROUP)
    group_name: Mapped[str]     = mapped_column(String(100), default="")
    optimeit_event_id: Mapped[str] = mapped_column(String(100), default="", index=True)

    starts_at: Mapped[datetime] = mapped_column(DateTime)
    ends_at: Mapped[datetime]   = mapped_column(DateTime)

    zoom_url: Mapped[str]       = mapped_column(String(500), default="")
    is_cancelled: Mapped[bool]  = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher: Mapped["User"] = relationship(foreign_keys=[teacher_id])  # noqa
    enrollments: Mapped[list["ClassEnrollment"]] = relationship(back_populates="scheduled_class", lazy="select")


class ClassEnrollment(Base):
    """Which students are in a scheduled class."""
    __tablename__ = "class_enrollments"

    id: Mapped[int]                  = mapped_column(Integer, primary_key=True)
    scheduled_class_id: Mapped[int]  = mapped_column(ForeignKey("scheduled_classes.id"))
    student_id: Mapped[int]          = mapped_column(ForeignKey("users.id"))
    attended: Mapped[bool | None]    = mapped_column(Boolean, nullable=True)

    scheduled_class: Mapped[ScheduledClass] = relationship(back_populates="enrollments")
    student: Mapped["User"] = relationship(foreign_keys=[student_id])  # noqa


class LessonBalance(Base):
    """Student lesson balance — synced from Optimeite."""
    __tablename__ = "lesson_balances"

    id: Mapped[int]                  = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int]          = mapped_column(ForeignKey("users.id"), unique=True)
    individual_total: Mapped[int]    = mapped_column(Integer, default=0)
    individual_used: Mapped[int]     = mapped_column(Integer, default=0)
    speaking_club_total: Mapped[int] = mapped_column(Integer, default=0)
    speaking_club_used: Mapped[int]  = mapped_column(Integer, default=0)
    synced_at: Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
