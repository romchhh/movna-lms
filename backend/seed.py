"""
Run: python seed.py
Creates test users, a course with modules/lessons, and sample homework.
"""
import asyncio
from app.core.database import init_db, AsyncSessionLocal
from app.core.security import hash_password
from app.services.password_vault import encrypt_login_password
from app.models.user import User, UserRole
from app.models.course import Course, Module, Lesson, LessonProgress, LessonStatus, GroupEnrollment
from app.models.homework import HomeworkTask, Homework, HomeworkStatus
from app.models.schedule import LessonBalance, ScheduledClass, ClassEnrollment, ClassType
from datetime import datetime, timedelta


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        # ── Users ──────────────────────────────────────────────────────────
        admin = User(
            email="admin@movna.ua", hashed_password=hash_password("admin123"),
            login_password_enc=encrypt_login_password("admin123"),
            first_name="Адміністратор", last_name="", role=UserRole.ADMIN, is_active=True,
        )
        teacher = User(
            email="teacher@movna.ua", hashed_password=hash_password("teacher123"),
            login_password_enc=encrypt_login_password("teacher123"),
            first_name="Марія", last_name="Іваненко", role=UserRole.TEACHER, is_active=True,
        )
        student = User(
            email="student@movna.ua", hashed_password=hash_password("student123"),
            login_password_enc=encrypt_login_password("student123"),
            first_name="Олена", last_name="Коваль", role=UserRole.STUDENT,
            language_level="B1", is_active=True,
        )
        db.add_all([admin, teacher, student])
        await db.flush()

        # ── Course ─────────────────────────────────────────────────────────
        course = Course(
            title="English Speaking B1→B2",
            description="Курс для підвищення рівня розмовної англійської з B1 до B2",
            language="English", level="B1→B2",
        )
        db.add(course)
        await db.flush()

        # ── Modules & Lessons ──────────────────────────────────────────────
        modules_data = [
            ("Вступ та знайомство", [
                "Привітання та самопрезентація",
                "Базові фрази повсякденного спілкування",
                "Знайомство в різних контекстах",
            ]),
            ("Модуль 1: Повсякденне спілкування", [
                "Розмова про хобі та вільний час",
                "Обговорення новин та поточних подій",
                "Телефонні розмови",
                "Вираження думок і почуттів",
                "Підсумок модуля",
            ]),
            ("Модуль 2: Робота і кар'єра", [
                "Інтерв'ю та співбесіда",
                "Ділові переговори",
                "Презентація на роботі",
                "Робочий день та задачі",
                "Підсумок модуля",
            ]),
            ("Модуль 3: Подорожі та культура", [
                "Планування подорожі",
                "Аеропорт та транспорт",
                "Готель та бронювання",
                "Culture Shock: різниця культур",
                "Підсумок модуля",
            ]),
        ]

        lesson_objs: list[Lesson] = []
        for m_order, (m_title, l_titles) in enumerate(modules_data):
            mod = Module(course_id=course.id, title=m_title, order=m_order)
            db.add(mod)
            await db.flush()
            for l_order, l_title in enumerate(l_titles):
                lesson = Lesson(
                    module_id=mod.id, title=l_title, order=l_order,
                    content=f"<p>Матеріал уроку: <strong>{l_title}</strong></p>",
                    duration_min=90,
                )
                db.add(lesson)
                lesson_objs.append(lesson)
        await db.flush()

        # ── Student Progress: complete first 13 lessons, unlock 14th ───────
        for i, lesson in enumerate(lesson_objs[:13]):
            db.add(LessonProgress(
                student_id=student.id, lesson_id=lesson.id,
                status=LessonStatus.COMPLETED,
                completed_at=datetime.utcnow() - timedelta(days=13 - i),
            ))
        if len(lesson_objs) > 13:
            db.add(LessonProgress(
                student_id=student.id, lesson_id=lesson_objs[13].id,
                status=LessonStatus.IN_PROGRESS,
            ))

        # ── Group enrollment ───────────────────────────────────────────────
        db.add(GroupEnrollment(
            student_id=student.id, teacher_id=teacher.id,
            course_id=course.id, group_name="English Speaking B1→B2 · Група 1",
        ))

        # ── Balance ────────────────────────────────────────────────────────
        db.add(LessonBalance(
            student_id=student.id,
            individual_total=10, individual_used=3,
            speaking_club_total=8, speaking_club_used=3,
        ))

        # ── Schedule ───────────────────────────────────────────────────────
        now = datetime.utcnow()
        cls = ScheduledClass(
            teacher_id=teacher.id, course_id=course.id,
            title="English Speaking B1→B2",
            class_type=ClassType.GROUP,
            group_name="Група 1",
            starts_at=now + timedelta(hours=2),
            ends_at=now + timedelta(hours=3, minutes=30),
            zoom_url="https://zoom.us/j/example123",
        )
        db.add(cls)
        await db.flush()
        db.add(ClassEnrollment(scheduled_class_id=cls.id, student_id=student.id))

        # ── Homework task ──────────────────────────────────────────────────
        if lesson_objs:
            task = HomeworkTask(
                lesson_id=lesson_objs[3].id, teacher_id=teacher.id,
                title="Есе: Моя улюблена подорож",
                description="Напишіть есе 200-300 слів про вашу найулюбленішу подорож.",
                task_type="text", due_days_after=7, max_score=10,
            )
            db.add(task)
            await db.flush()
            db.add(Homework(
                task_id=task.id, student_id=student.id,
                status=HomeworkStatus.SUBMITTED,
                text_answer="Моя улюблена подорож — поїздка до Карпат...",
                submitted_at=datetime.utcnow() - timedelta(days=2),
                deadline=datetime.utcnow() - timedelta(days=1),
            ))

        await db.commit()
        print("✅ Seed complete!")
        print("   admin@movna.ua   / admin123")
        print("   teacher@movna.ua / teacher123")
        print("   student@movna.ua / student123")


if __name__ == "__main__":
    asyncio.run(seed())
