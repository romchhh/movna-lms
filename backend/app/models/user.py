import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
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

    # Teacher meeting links (LMS-only)
    zoom_url: Mapped[str]       = mapped_column(String(500), default="")
    miro_url: Mapped[str]       = mapped_column(String(500), default="")

    # LMS profile (avatar shown across portal; about_me for teachers)
    about_me: Mapped[str]       = mapped_column(Text, default="")

    # Teacher notification preferences (LMS-only)
    notify_homework: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_lesson_reminder: Mapped[bool] = mapped_column(Boolean, default=True)

    # State
    is_active: Mapped[bool]     = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool]   = mapped_column(Boolean, default=False)

    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email
