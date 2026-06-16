from pydantic import BaseModel, Field


class CurriculumLessonOut(BaseModel):
    number: int | None = None
    lesson_type: str = ""
    topic: str = ""
    student_activities: str = ""


class CurriculumModuleOut(BaseModel):
    name: str
    lessons: list[CurriculumLessonOut] = Field(default_factory=list)


class CurriculumProgramOut(BaseModel):
    sheet_id: int
    name: str
    slug: str
    modules: list[CurriculumModuleOut] = Field(default_factory=list)
    lesson_count: int = 0
    module_count: int = 0


class CurriculumListOut(BaseModel):
    spreadsheet_id: str
    programs: list[CurriculumProgramOut] = Field(default_factory=list)
    cached_at: float | None = None
    from_cache: bool = False


class CurriculumRefreshOut(CurriculumListOut):
    refreshed: bool = True
