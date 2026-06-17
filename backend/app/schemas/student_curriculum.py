from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FlatLessonRef(BaseModel):
    module_index: int
    module_title: str
    lesson_index: int
    number: int | None = None
    lesson_type: str = ""
    topic: str = ""
    student_activities: str = ""
    source_lesson_id: int | None = None


class AssignCurriculumIn(BaseModel):
    student_optimate_id: str
    student_name: str = ""
    curriculum_source: Literal["movna", "custom"]
    movna_program_slug: str | None = None
    teacher_curriculum_id: int | None = None
    start_module_index: int = 0
    start_lesson_index: int = 0
    sync_events: bool = True


class SlotOut(BaseModel):
    id: int
    sequence_index: int
    module_index: int
    module_title: str
    lesson_number: int | None = None
    lesson_type: str = ""
    topic: str = ""
    student_activities: str = ""
    split_part: int = 1
    split_total: int = 1
    split_group_key: str = ""
    optimate_event_id: str = ""
    event_starts_at: str = ""
    status: str
    completed_at: datetime | None = None
    display_topic: str = ""

    model_config = {"from_attributes": True}


class ModuleProgressOut(BaseModel):
    module_index: int
    module_title: str
    total_slots: int
    completed_slots: int
    slots: list[SlotOut] = Field(default_factory=list)


class EnrollmentSummaryOut(BaseModel):
    id: int
    program_title: str
    curriculum_source: str
    movna_program_slug: str = ""
    teacher_curriculum_id: int | None = None
    status: str
    teacher_name: str = ""
    assigned_at: datetime
    ended_at: datetime | None = None
    total_slots: int = 0
    completed_slots: int = 0
    scheduled_slots: int = 0
    progress_pct: int = 0


class EnrollmentDetailOut(EnrollmentSummaryOut):
    student_optimate_id: str
    student_name: str = ""
    teacher_optimate_id: str = ""
    start_sequence_index: int = 0
    modules: list[ModuleProgressOut] = Field(default_factory=list)
    slots: list[SlotOut] = Field(default_factory=list)


class StudentCurriculumOverviewOut(BaseModel):
    active: EnrollmentDetailOut | None = None
    history: list[EnrollmentSummaryOut] = Field(default_factory=list)


class TeacherStudentCurriculumOut(BaseModel):
    student_optimate_id: str
    student_name: str = ""
    active: EnrollmentDetailOut | None = None
    history: list[EnrollmentSummaryOut] = Field(default_factory=list)


class SyncEventsOut(BaseModel):
    mapped_count: int
    enrollment: EnrollmentDetailOut


class EventTopicOut(BaseModel):
    optimate_event_id: str
    program_title: str = ""
    topic: str = ""
    module_title: str = ""
    lesson_type: str = ""
    lesson_number: int | None = None
    slot_id: int | None = None
    enrollment_id: int | None = None
    status: str = ""
    display_topic: str = ""
