from pydantic import BaseModel, Field


class StudentLinkOut(BaseModel):
    id: int
    link_type: str
    url: str
    label: str = ""
    sort_order: int = 0


class TeacherStudentLinksOut(BaseModel):
    student_optimate_id: str
    lesson_link: StudentLinkOut | None = None
    miro_link: StudentLinkOut | None = None
    custom_links: list[StudentLinkOut] = []


class StudentLinkCreateIn(BaseModel):
    student_optimate_id: str = Field(..., min_length=1, max_length=64)
    link_type: str = Field(..., pattern="^(lesson|miro|custom)$")
    url: str = Field(..., min_length=1, max_length=500)
    label: str = Field(default="", max_length=255)


class StudentLinkUpdateIn(BaseModel):
    url: str | None = Field(default=None, max_length=500)
    label: str | None = Field(default=None, max_length=255)


class StudentCustomLinkOut(BaseModel):
    id: int
    url: str
    label: str = ""


class StudentTeacherResourcesOut(BaseModel):
    teacher_optimate_id: str
    teacher_name: str
    lesson_url: str = ""
    miro_url: str = ""
    custom_links: list[StudentCustomLinkOut] = []


class StudentLearningResourcesOut(BaseModel):
    groups: list[StudentTeacherResourcesOut] = []
