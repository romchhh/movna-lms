from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from app.schemas.optimate import CacheMeta


class ContactOut(BaseModel):
    type: str
    value: str


class ProductSummaryOut(BaseModel):
    product_id: str
    product_name: str
    product_type: Optional[int] = None
    lessons_remaining: float = 0
    lessons_total: float = 0
    lessons_used: float = 0


class StudentListItemOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    full_name: str
    status: int
    status_label: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contacts: list[ContactOut] = []
    is_child: bool = False
    skill_level: Optional[int] = None
    skill_level_label: Optional[str] = None
    product_count: int = 0
    remaining_lessons: float = 0
    planned_lessons: float = 0
    completed_lessons: float = 0
    teacher_ids: list[str] = []
    teacher_names: list[str] = []
    products_summary: list[ProductSummaryOut] = []
    chat_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TeacherListItemOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    full_name: str
    status: int
    status_label: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contacts: list[ContactOut] = []
    description: Optional[str] = None
    photo_path: Optional[str] = None
    students_count: Optional[int] = None
    product_count: int = 0
    unmarked_lesson_count: Optional[int] = None
    products_summary: list[ProductSummaryOut] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PaginatedStudentsOut(BaseModel):
    data: list[StudentListItemOut]
    total: int
    page: int
    page_size: int
    cache: CacheMeta


class PaginatedTeachersOut(BaseModel):
    data: list[TeacherListItemOut]
    total: int
    page: int
    page_size: int
    cache: CacheMeta


class StudentDetailOut(BaseModel):
    data: dict[str, Any]
    cache: CacheMeta


class TeacherDetailOut(BaseModel):
    data: dict[str, Any]
    cache: CacheMeta


class StudentAccountOut(BaseModel):
    optimate_id: str
    user_id: Optional[int] = None
    email: Optional[str] = None
    has_account: bool
    has_password: bool
    password: Optional[str] = None
    is_active: bool = False


class SetStudentPasswordIn(BaseModel):
    password: str


class StudentPasswordOut(BaseModel):
    optimate_id: str
    user_id: int
    email: str
    password: str
    generated: bool = False


class AdminEventOut(BaseModel):
    id: str
    event_type: int
    event_type_label: str
    starts_at: str
    ends_at: str
    duration: int
    is_trial: bool
    is_completed: Optional[bool] = None
    completion_label: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[int] = None
    product_type_label: Optional[str] = None
    student_names: list[str] = []
    student_ids: list[str] = []
    teacher_names: list[str] = []
    teacher_ids: list[str] = []


class PaginatedEventsOut(BaseModel):
    data: list[AdminEventOut]
    total: int
    page: int
    page_size: int
    date_from: str
    date_to: str
    cache: CacheMeta


class AdminOverviewLowBalance(BaseModel):
    id: str
    full_name: str
    remaining_lessons: float
    product_count: int
    chat_url: Optional[str] = None


class AdminOverviewTeacherLoad(BaseModel):
    id: str
    full_name: str
    students_count: Optional[int] = None
    unmarked_lesson_count: Optional[int] = None


class AdminOverviewDayActivity(BaseModel):
    day: str
    label: str
    count: int


class AdminOverviewOut(BaseModel):
    students_total: int
    teachers_total: int
    events_today: int
    events_week: int
    unmarked_lessons: int
    low_balance_students: list[AdminOverviewLowBalance]
    teacher_load: list[AdminOverviewTeacherLoad]
    upcoming_events: list[AdminEventOut]
    week_activity: list[AdminOverviewDayActivity]
    cache: CacheMeta
