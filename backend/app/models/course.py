import enum
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, Enum, ForeignKey, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class LessonStatus(str, enum.Enum):
    LOCKED = "locked"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int]             = mapped_column(Integer, primary_key=True)
    title: Mapped[str]          = mapped_column(String(255))
    description: Mapped[str]    = mapped_column(Text, default="")
    language: Mapped[str]       = mapped_column(String(50), default="English")
    level: Mapped[str]          = mapped_column(String(10), default="B1")   # A1..C2
    sheets_url: Mapped[str]     = mapped_column(String(500), default="")    # Google Sheets source
    is_active: Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    modules: Mapped[list["Module"]] = relationship(back_populates="course", order_by="Module.order", lazy="select")


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int]   = mapped_column(ForeignKey("courses.id"))
    title: Mapped[str]       = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    order: Mapped[int]       = mapped_column(Integer, default=0)

    course: Mapped[Course]          = relationship(back_populates="modules")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="module", order_by="Lesson.order", lazy="select")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int]           = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int]    = mapped_column(ForeignKey("modules.id"))
    title: Mapped[str]        = mapped_column(String(255))
    description: Mapped[str]  = mapped_column(Text, default="")
    content: Mapped[str]      = mapped_column(Text, default="")      # HTML or markdown
    video_url: Mapped[str]    = mapped_column(String(500), default="")
    miro_url: Mapped[str]     = mapped_column(String(500), default="")  # Miro embed
    zoom_url: Mapped[str]     = mapped_column(String(500), default="")
    order: Mapped[int]        = mapped_column(Integer, default=0)
    duration_min: Mapped[int] = mapped_column(Integer, default=60)
    is_active: Mapped[bool]   = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    module: Mapped[Module]             = relationship(back_populates="lessons")
    homework_tasks: Mapped[list["HomeworkTask"]] = relationship(back_populates="lesson", lazy="select")  # noqa
    progress_records: Mapped[list["LessonProgress"]] = relationship(back_populates="lesson", lazy="select")  # noqa


class LessonProgress(Base):
    """Tracks each student's progress per lesson."""
    __tablename__ = "lesson_progress"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int]  = mapped_column(ForeignKey("users.id"))
    lesson_id: Mapped[int]   = mapped_column(ForeignKey("lessons.id"))
    status: Mapped[LessonStatus] = mapped_column(Enum(LessonStatus), default=LessonStatus.LOCKED)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student: Mapped["User"]  = relationship(foreign_keys=[student_id], back_populates="lesson_progress")  # noqa
    lesson: Mapped[Lesson]   = relationship(back_populates="progress_records")


class GroupEnrollment(Base):
    """Student ↔ Teacher group assignment (synced from Optimeite)."""
    __tablename__ = "group_enrollments"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int]  = mapped_column(ForeignKey("users.id"))
    teacher_id: Mapped[int]  = mapped_column(ForeignKey("users.id"))
    course_id: Mapped[int]   = mapped_column(ForeignKey("courses.id"))
    group_name: Mapped[str]  = mapped_column(String(100), default="")
    optimeit_group_id: Mapped[str] = mapped_column(String(100), default="")
    is_active: Mapped[bool]  = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
