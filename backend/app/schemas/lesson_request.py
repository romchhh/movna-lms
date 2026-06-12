from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.models.lesson_request import LessonRequestStatus, LessonRequestType

ResolveStatus = Literal["approved", "rejected"]


class LessonRequestCreate(BaseModel):
    optimate_event_id: str
    request_type: LessonRequestType
    event_title: str = ""
    event_starts_at: datetime
    event_ends_at: datetime
    teacher_name: str = ""
    teacher_optimate_id: str = ""
    requested_starts_at: Optional[datetime] = None
    requested_ends_at: Optional[datetime] = None
    student_comment: str = Field(default="", max_length=2000)


class LessonRequestResolve(BaseModel):
    status: ResolveStatus
    admin_note: str = Field(default="", max_length=2000)


class LessonRequestOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    optimate_event_id: str
    request_type: LessonRequestType
    status: LessonRequestStatus
    event_title: str
    event_starts_at: datetime
    event_ends_at: datetime
    teacher_name: str
    teacher_optimate_id: str
    requested_starts_at: Optional[datetime] = None
    requested_ends_at: Optional[datetime] = None
    student_comment: str
    admin_note: str
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PendingCountOut(BaseModel):
    count: int
