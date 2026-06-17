import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CurriculumSource(str, enum.Enum):
    MOVNA = "movna"
    CUSTOM = "custom"


class EnrollmentStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    REPLACED = "replaced"


class SlotStatus(str, enum.Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class StudentCurriculumEnrollment(Base):
    """Період навчання за однією програмою (зберігається при зміні викладача)."""
    __tablename__ = "student_curriculum_enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_optimate_id: Mapped[str] = mapped_column(String(64), index=True)
    student_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    student_name: Mapped[str] = mapped_column(String(255), default="")

    teacher_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    teacher_optimate_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    teacher_name: Mapped[str] = mapped_column(String(255), default="")

    curriculum_source: Mapped[CurriculumSource] = mapped_column(Enum(CurriculumSource))
    program_title: Mapped[str] = mapped_column(String(255), default="")
    movna_program_slug: Mapped[str] = mapped_column(String(128), default="", index=True)
    teacher_curriculum_id: Mapped[int | None] = mapped_column(
        ForeignKey("teacher_curricula.id"),
        nullable=True,
        index=True,
    )

    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus),
        default=EnrollmentStatus.ACTIVE,
        index=True,
    )
    start_sequence_index: Mapped[int] = mapped_column(Integer, default=0)
    replaced_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("student_curriculum_enrollments.id"),
        nullable=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    slots: Mapped[list["StudentCurriculumSlot"]] = relationship(
        back_populates="enrollment",
        lazy="selectin",
        order_by="StudentCurriculumSlot.sequence_index",
        cascade="all, delete-orphan",
    )


class StudentCurriculumSlot(Base):
    """Один урок/тема в послідовності програми для учня."""
    __tablename__ = "student_curriculum_slots"
    __table_args__ = (
        UniqueConstraint("enrollment_id", "sequence_index", name="uq_slot_enrollment_seq"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enrollment_id: Mapped[int] = mapped_column(
        ForeignKey("student_curriculum_enrollments.id", ondelete="CASCADE"),
        index=True,
    )

    sequence_index: Mapped[int] = mapped_column(Integer, default=0)
    module_index: Mapped[int] = mapped_column(Integer, default=0)
    module_title: Mapped[str] = mapped_column(String(255), default="")
    lesson_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lesson_type: Mapped[str] = mapped_column(String(64), default="")
    topic: Mapped[str] = mapped_column(String(500), default="")
    student_activities: Mapped[str] = mapped_column(Text, default="")

    source_lesson_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    split_group_key: Mapped[str] = mapped_column(String(36), default="")
    split_part: Mapped[int] = mapped_column(Integer, default=1)
    split_total: Mapped[int] = mapped_column(Integer, default=1)

    optimate_event_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    event_starts_at: Mapped[str] = mapped_column(String(64), default="")

    status: Mapped[SlotStatus] = mapped_column(Enum(SlotStatus), default=SlotStatus.PENDING, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    enrollment: Mapped[StudentCurriculumEnrollment] = relationship(back_populates="slots")


def new_split_group_key() -> str:
    return str(uuid.uuid4())
