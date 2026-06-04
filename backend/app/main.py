from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.database import init_db
from app.core.config import settings
from app.routers import auth, users, courses, lessons, homework, schedule, sync, admin, student_optimate, admin_optimate, teacher_optimate


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

app.include_router(auth.router,     prefix="/api/auth",     tags=["auth"])
app.include_router(users.router,    prefix="/api/users",    tags=["users"])
app.include_router(courses.router,  prefix="/api/courses",  tags=["courses"])
app.include_router(lessons.router,  prefix="/api/lessons",  tags=["lessons"])
app.include_router(homework.router, prefix="/api/homework", tags=["homework"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(student_optimate.router, prefix="/api/student/optimate", tags=["student-optimate"])
app.include_router(teacher_optimate.router, prefix="/api/teacher/optimate", tags=["teacher-optimate"])
app.include_router(sync.router,     prefix="/api/sync",     tags=["sync"])
app.include_router(admin.router,    prefix="/api/admin",    tags=["admin"])
app.include_router(admin_optimate.router, prefix="/api/admin/optimate", tags=["admin-optimate"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
