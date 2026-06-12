from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.event_homework import EventHomeworkSubmissionStatus


class HomeworkAttachment(BaseModel):
    id: str
    filename: str
    url: str
    size_bytes: int = 0


class HomeworkStudentRef(BaseModel):
    optimate_id: str
    name: str = ""


class HomeworkAssignmentCreate(BaseModel):
    optimate_event_id: str
    title: str = ""
    body_markdown: str = ""
    deadline_at: Optional[datetime] = None
    teacher_attachments: list[HomeworkAttachment] = Field(default_factory=list)
    event_starts_at: str = ""
    event_ends_at: str = ""
    event_title: str = ""
    students: list[HomeworkStudentRef] = Field(default_factory=list)


class HomeworkSubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_optimate_id: str
    student_name: str
    status: EventHomeworkSubmissionStatus
    student_answer_md: str
    student_file_url: str
    viewed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    teacher_review_note: str
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HomeworkAssignmentOut(BaseModel):
    id: int
    optimate_event_id: str
    teacher_user_id: int
    teacher_optimate_id: str
    title: str
    body_markdown: str
    deadline_at: Optional[datetime] = None
    teacher_attachments: list[HomeworkAttachment] = Field(default_factory=list)
    event_starts_at: str
    event_ends_at: str
    event_title: str
    created_at: datetime
    updated_at: datetime
    submissions: list[HomeworkSubmissionOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class HomeworkStudentItemOut(BaseModel):
    submission_id: int
    assignment_id: int
    optimate_event_id: str
    title: str
    body_markdown: str
    deadline_at: Optional[datetime] = None
    teacher_attachments: list[HomeworkAttachment] = Field(default_factory=list)
    event_starts_at: str
    event_ends_at: str
    event_title: str
    teacher_name: str = ""
    status: EventHomeworkSubmissionStatus
    student_answer_md: str
    student_file_url: str
    teacher_review_note: str
    viewed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class HomeworkCompleteIn(BaseModel):
    student_answer_md: str = ""
    student_file_url: str = ""


class HomeworkReviewIn(BaseModel):
    teacher_review_note: str = ""


class HomeworkPendingCountOut(BaseModel):
    count: int
