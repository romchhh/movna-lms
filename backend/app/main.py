from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routers import (
    admin_curriculum,
    admin_faq,
    admin_optimate,
    auth,
    event_homework,
    faq,
    lesson_requests,
    student_curriculum,
    student_learning_resources,
    student_lesson_alert,
    student_optimate,
    teacher_curriculum,
    teacher_lesson_alert,
    teacher_optimate,
    teacher_settings,
    teacher_student_curriculum,
    teacher_student_links,
    user_profile,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="MOVNA LMS API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(user_profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(student_optimate.router, prefix="/api/student/optimate", tags=["student-optimate"])
app.include_router(teacher_optimate.router, prefix="/api/teacher/optimate", tags=["teacher-optimate"])
app.include_router(admin_optimate.router, prefix="/api/admin/optimate", tags=["admin-optimate"])
app.include_router(admin_curriculum.router, prefix="/api/admin/curricula", tags=["admin-curricula"])
app.include_router(admin_faq.router, prefix="/api/admin/faq", tags=["admin-faq"])
app.include_router(faq.router, prefix="/api/faq", tags=["faq"])
app.include_router(teacher_curriculum.router, prefix="/api/teacher/curricula", tags=["teacher-curricula"])
app.include_router(teacher_student_curriculum.router, prefix="/api/teacher/student-curricula", tags=["teacher-student-curricula"])
app.include_router(teacher_student_links.router, prefix="/api/teacher/student-links", tags=["teacher-student-links"])
app.include_router(student_curriculum.router, prefix="/api/student/curriculum", tags=["student-curriculum"])
app.include_router(student_learning_resources.router, prefix="/api/student", tags=["student-learning-resources"])
app.include_router(student_lesson_alert.router, prefix="/api/student", tags=["student-lesson-alert"])
app.include_router(teacher_lesson_alert.router, prefix="/api/teacher", tags=["teacher-lesson-alert"])
app.include_router(teacher_settings.router, prefix="/api/teacher/settings", tags=["teacher-settings"])
app.include_router(lesson_requests.router, prefix="/api/lesson-requests", tags=["lesson-requests"])
app.include_router(event_homework.router, prefix="/api/homework", tags=["homework"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
