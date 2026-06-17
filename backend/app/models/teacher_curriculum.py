from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TeacherCurriculum(Base):
    __tablename__ = "teacher_curricula"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    author: Mapped["User"] = relationship(foreign_keys=[author_id], lazy="select")  # noqa: F821
    modules: Mapped[list["TeacherCurriculumModule"]] = relationship(
        back_populates="curriculum",
        order_by="TeacherCurriculumModule.sort_order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class TeacherCurriculumModule(Base):
    __tablename__ = "teacher_curriculum_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    curriculum_id: Mapped[int] = mapped_column(ForeignKey("teacher_curricula.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    curriculum: Mapped[TeacherCurriculum] = relationship(back_populates="modules")
    lessons: Mapped[list["TeacherCurriculumLesson"]] = relationship(
        back_populates="module",
        order_by="TeacherCurriculumLesson.sort_order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class TeacherCurriculumLesson(Base):
    __tablename__ = "teacher_curriculum_lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_curriculum_modules.id", ondelete="CASCADE")
    )
    number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lesson_type: Mapped[str] = mapped_column(String(120), default="")
    topic: Mapped[str] = mapped_column(String(500), default="")
    student_activities: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    module: Mapped[TeacherCurriculumModule] = relationship(back_populates="lessons")
