from pydantic import BaseModel, Field


class MeetingLinksOut(BaseModel):
    zoom_url: str = ""
    miro_url: str = ""


class MeetingLinksUpdate(BaseModel):
    zoom_url: str = Field(default="", max_length=500)
    miro_url: str = Field(default="", max_length=500)


class NotificationPreferencesOut(BaseModel):
    notify_homework: bool = True
    notify_lesson_reminder: bool = True


class NotificationPreferencesUpdate(BaseModel):
    notify_homework: bool | None = None
    notify_lesson_reminder: bool | None = None


class LessonAlertOut(BaseModel):
    show: bool = False
    phase: str = ""
    event_id: str = ""
    starts_at: str = ""
    ends_at: str = ""
    teacher_name: str = ""
    teacher_id: str = ""
    student_name: str = ""
    student_id: str = ""
    product_name: str = ""
    zoom_url: str = ""
    miro_url: str = ""
    message: str = ""
