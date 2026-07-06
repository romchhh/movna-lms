from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CacheMeta(BaseModel):
    cached: bool
    synced_at: datetime


class ProductBalanceOut(BaseModel):
    product_id: str
    product_name: str
    product_type: int
    product_type_label: str
    lessons_remaining: float
    lessons_total: float
    lessons_used: float
    price_per_lesson: Optional[float] = None


class TransactionOut(BaseModel):
    id: str
    type: int
    type_label: str
    amount: float
    lesson_count: float
    description: Optional[str] = None
    transaction_date: Optional[str] = None
    created_at: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[int] = None
    is_credit: bool


class PaginatedTransactionsOut(BaseModel):
    data: list[TransactionOut]
    total: int
    page: int
    page_size: int
    cache: CacheMeta


class EventOut(BaseModel):
    id: str
    event_type: int
    starts_at: str
    ends_at: str
    duration: int
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[int] = None
    product_type_label: Optional[str] = None
    teacher_name: Optional[str] = None
    is_trial: bool
    is_completed: Optional[bool] = None
    completion_label: str
    schedule_class: str
    student_names: list[str] = []
    student_ids: list[str] = []
    teacher_names: list[str] = []
    teacher_ids: list[str] = []
    cancellation_reason: Optional[str] = None
    cancellation_note: Optional[str] = None


class ScheduleSlotOut(BaseModel):
    start_time: str
    end_time: str


class ScheduleDayOut(BaseModel):
    day: int
    day_label: str
    day_short: str
    slots: list[ScheduleSlotOut]


class TeacherScheduleOut(BaseModel):
    id: str
    start_date: Optional[str] = None
    timezone: str
    days: list[ScheduleDayOut]


class TeacherSchedulesResponse(BaseModel):
    data: list[TeacherScheduleOut]
    cache: CacheMeta


class PaginatedEventsOut(BaseModel):
    data: list[EventOut]
    total: int
    date_from: str
    date_to: str
    cache: CacheMeta


class TeacherStudentOut(BaseModel):
    id: str
    full_name: str
    status: int
    status_label: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skill_level_label: Optional[str] = None
    remaining_lessons: float = 0
    lessons_total: float = 0
    lessons_used: float = 0
    is_speaking_club_only: bool = False
    planned_lessons: float = 0
    completed_lessons: float = 0
    product_names: list[str] = []
    products: list[dict] = []


class TeacherTransactionOut(BaseModel):
    id: str
    type: int
    type_label: str
    amount: float
    signed_amount: float
    description: Optional[str] = None
    transaction_date: Optional[str] = None
    created_at: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[int] = None
    lesson_id: Optional[str] = None
    is_trial: Optional[bool] = None
    period_start_date: Optional[str] = None
    period_end_date: Optional[str] = None
    salary_invoice_id: Optional[str] = None
    student_names: list[str] = []
    is_credit: bool


class TeacherTransactionsSummaryOut(BaseModel):
    earned_total: float = 0
    payout_total: float = 0
    lesson_accrual_count: int = 0
    payout_count: int = 0
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class PaginatedTeacherTransactionsOut(BaseModel):
    data: list[TeacherTransactionOut]
    total: int
    page: int
    page_size: int
    summary: TeacherTransactionsSummaryOut
    cache: CacheMeta


class LessonCancellationReasonOut(BaseModel):
    code: str
    label: str


class TeacherEventCreateIn(BaseModel):
    student_id: str
    product_id: Optional[str] = None
    starts_at: str
    duration: int = 60


class TeacherEventCancelIn(BaseModel):
    reason_code: str
    note: str = ""


class TeacherEventActionOut(BaseModel):
    ok: bool
    event_id: str
    message: str = ""


class EventCancellationOut(BaseModel):
    optimate_event_id: str
    reason_code: str
    reason_label: str
    note: str = ""
    created_at: Optional[str] = None


class PaginatedTeacherStudentsOut(BaseModel):
    data: list[TeacherStudentOut]
    total: int
    page: int
    page_size: int
    cache: CacheMeta


class TeacherStudentDetailResponse(BaseModel):
    data: dict
    cache: CacheMeta


class TeacherGroupStudentOut(BaseModel):
    id: str
    full_name: str
    status: int
    status_label: str
    email: Optional[str] = None
    phone: Optional[str] = None


class TeacherGroupOut(BaseModel):
    id: str
    name: str
    status: int
    status_label: str
    duration: int = 0
    max_student_count: int = 0
    student_count: int = 0
    schedule_label: str = "—"
    level_label: Optional[str] = None
    product_name: Optional[str] = None
    product_type: Optional[int] = None
    product_type_label: str = "Група"
    chat_url: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    planned_lessons: int = 0
    completed_lessons: int = 0
    attendance_percentage: float = 0
    students: list[TeacherGroupStudentOut] = []


class TeacherGroupsResponse(BaseModel):
    data: list[TeacherGroupOut]
    total: int
    cache: CacheMeta


class BalancesResponse(BaseModel):
    data: list[ProductBalanceOut]
    cache: CacheMeta


class StudentOverviewOut(BaseModel):
    balances: list[ProductBalanceOut]
    upcoming_events: list[EventOut]
    recent_transactions: list[TransactionOut]
    total_lessons_remaining: float
    total_lessons_purchased: float = 0
    total_lessons_used: float = 0
    synced_at: datetime
    cache: CacheMeta


class BirthDateOut(BaseModel):
    day: int
    month: int
    year: int


class StudentProfileOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    chat_url: Optional[str] = None
    birth_date: Optional[BirthDateOut] = None


class StudentProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    chat_url: Optional[str] = None
    birth_date: Optional[BirthDateOut] = None


class TeacherProfileOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None


class TeacherProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    description: Optional[str] = None


class TeacherLessonStatsDayActivity(BaseModel):
    day: str
    label: str
    total: int
    completed: int
    planned: int


class LessonFormatBreakdown(BaseModel):
    individual: int = 0
    group: int = 0
    pair: int = 0
    speaking_club: int = 0


class TeacherLessonStatsOut(BaseModel):
    month_label: str
    stats_year: int
    stats_month: int
    is_current_month: bool = True
    days_back: int
    days_forward: int
    completed_in_period: int
    completed_this_month: int
    completed_last_month: int
    completed_this_week: int
    completed_today: int
    planned_this_month: int
    planned_this_week: int
    planned_upcoming: int
    cancelled_this_month: int
    hours_this_month: float
    month_change_pct: int
    week_activity: list[TeacherLessonStatsDayActivity]
    unique_students_month: int = 0
    unique_students_speaking_club_month: int = 0
    trial_lessons_month: int = 0
    format_breakdown_month: LessonFormatBreakdown = LessonFormatBreakdown()
    busiest_weekday_label: str = "—"
    avg_lessons_per_week: float = 0
    total_students: int = 0
    students_speaking_club_only: int = 0
    students_with_regular_lessons: int = 0
    cache: CacheMeta
