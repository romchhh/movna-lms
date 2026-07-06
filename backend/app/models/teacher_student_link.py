import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TeacherStudentLinkType(str, enum.Enum):
    LESSON = "lesson"
    MIRO = "miro"
    CUSTOM = "custom"


class TeacherStudentLink(Base):
    """Посилання викладача для конкретного учня (урок, Miro, довільні)."""
    __tablename__ = "teacher_student_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    teacher_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    teacher_optimate_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    student_optimate_id: Mapped[str] = mapped_column(String(64), index=True)
    link_type: Mapped[TeacherStudentLinkType] = mapped_column(Enum(TeacherStudentLinkType), index=True)
    url: Mapped[str] = mapped_column(String(500), default="")
    label: Mapped[str] = mapped_column(String(255), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
