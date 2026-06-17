from datetime import datetime

from pydantic import BaseModel, Field


class TeacherCurriculumLessonIn(BaseModel):
    number: int | None = None
    lesson_type: str = ""
    topic: str = ""
    student_activities: str = ""


class TeacherCurriculumModuleIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    lessons: list[TeacherCurriculumLessonIn] = Field(default_factory=list)


class TeacherCurriculumWrite(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    is_public: bool = False
    modules: list[TeacherCurriculumModuleIn] = Field(default_factory=list)


class TeacherCurriculumAuthorOut(BaseModel):
    id: int
    full_name: str


class TeacherCurriculumLessonOut(TeacherCurriculumLessonIn):
    id: int


class TeacherCurriculumModuleOut(BaseModel):
    id: int
    title: str
    lessons: list[TeacherCurriculumLessonOut] = Field(default_factory=list)


class TeacherCurriculumOut(BaseModel):
    id: int
    title: str
    is_public: bool
    author: TeacherCurriculumAuthorOut
    is_mine: bool
    can_edit: bool
    modules: list[TeacherCurriculumModuleOut] = Field(default_factory=list)
    module_count: int = 0
    lesson_count: int = 0
    created_at: datetime
    updated_at: datetime


class TeacherCurriculumSummaryOut(BaseModel):
    id: int
    title: str
    is_public: bool
    author: TeacherCurriculumAuthorOut
    is_mine: bool
    can_edit: bool
    module_count: int = 0
    lesson_count: int = 0
    updated_at: datetime


class TeacherCurriculumListOut(BaseModel):
    programs: list[TeacherCurriculumSummaryOut] = Field(default_factory=list)
