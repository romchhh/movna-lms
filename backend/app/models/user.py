import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int]             = mapped_column(Integer, primary_key=True)
    email: Mapped[str]          = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    login_password_enc: Mapped[str] = mapped_column(String(512), default="")
    role: Mapped[UserRole]      = mapped_column(Enum(UserRole), default=UserRole.STUDENT)

    # Profile
    first_name: Mapped[str]     = mapped_column(String(100), default="")
    last_name: Mapped[str]      = mapped_column(String(100), default="")
    phone: Mapped[str]          = mapped_column(String(30), default="")
    avatar_url: Mapped[str]     = mapped_column(String(500), default="")
    language_level: Mapped[str] = mapped_column(String(10), default="")   # A1..C2

    # Optimeite sync
    optimeit_id: Mapped[str]    = mapped_column(String(100), default="", index=True)

    # State
    is_active: Mapped[bool]     = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool]   = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lesson_progress: Mapped[list["LessonProgress"]]  = relationship(back_populates="student", lazy="select")  # noqa
    submitted_homeworks: Mapped[list["Homework"]]     = relationship(foreign_keys="Homework.student_id", back_populates="student", lazy="select")  # noqa
    reviewed_homeworks: Mapped[list["Homework"]]      = relationship(foreign_keys="Homework.teacher_id", back_populates="teacher", lazy="select")  # noqa

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email
