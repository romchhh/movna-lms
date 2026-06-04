from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
from app.models.course import LessonStatus
from app.models.homework import HomeworkStatus
from app.models.schedule import ClassType


# ── Auth ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.STUDENT


# ── User ─────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    first_name: str
    last_name: str
    phone: str
    avatar_url: str
    language_level: str
    is_active: bool
    optimeit_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    language_level: Optional[str] = None


# ── Course / Lesson ───────────────────────────────────────────────────────────
class LessonOut(BaseModel):
    id: int
    title: str
    description: str
    video_url: str
    miro_url: str
    zoom_url: str
    order: int
    duration_min: int

    model_config = {"from_attributes": True}


class LessonWithProgress(LessonOut):
    status: LessonStatus = LessonStatus.LOCKED
    completed_at: Optional[datetime] = None


class ModuleOut(BaseModel):
    id: int
    title: str
    description: str
    order: int
    lessons: list[LessonOut] = []

    model_config = {"from_attributes": True}


class ModuleWithProgress(ModuleOut):
    lessons: list[LessonWithProgress] = []
    progress_pct: float = 0.0


class CourseOut(BaseModel):
    id: int
    title: str
    description: str
    language: str
    level: str
    is_active: bool

    model_config = {"from_attributes": True}


class CourseWithModules(CourseOut):
    modules: list[ModuleOut] = []


class CourseWithProgress(CourseOut):
    modules: list[ModuleWithProgress] = []
    progress_pct: float = 0.0
    total_lessons: int = 0
    completed_lessons: int = 0


# ── Homework ──────────────────────────────────────────────────────────────────
class HomeworkTaskOut(BaseModel):
    id: int
    lesson_id: int
    title: str
    description: str
    task_type: str
    max_score: float

    model_config = {"from_attributes": True}


class HomeworkOut(BaseModel):
    id: int
    task_id: int
    student_id: int
    status: HomeworkStatus
    text_answer: str
    file_url: str
    audio_url: str
    submitted_at: Optional[datetime]
    deadline: Optional[datetime]
    score: Optional[float]
    comment: str
    reviewed_at: Optional[datetime]
    task: Optional[HomeworkTaskOut] = None

    model_config = {"from_attributes": True}


class HomeworkSubmit(BaseModel):
    task_id: int
    text_answer: str = ""
    file_url: str = ""
    audio_url: str = ""


class HomeworkReview(BaseModel):
    score: float
    comment: str = ""


# ── Schedule ──────────────────────────────────────────────────────────────────
class ScheduledClassOut(BaseModel):
    id: int
    title: str
    class_type: ClassType
    group_name: str
    starts_at: datetime
    ends_at: datetime
    zoom_url: str
    is_cancelled: bool
    teacher_id: int

    model_config = {"from_attributes": True}


# ── Balance ───────────────────────────────────────────────────────────────────
class BalanceOut(BaseModel):
    individual_total: int
    individual_used: int
    individual_remaining: int
    speaking_club_total: int
    speaking_club_used: int
    speaking_club_remaining: int
    synced_at: datetime

    model_config = {"from_attributes": True}


# ── Admin ─────────────────────────────────────────────────────────────────────
class AdminStats(BaseModel):
    total_students: int
    total_teachers: int
    total_courses: int
    active_students: int
    homework_pending_review: int
