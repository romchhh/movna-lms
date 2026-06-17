from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.teacher_curriculum import (
    TeacherCurriculum,
    TeacherCurriculumLesson,
    TeacherCurriculumModule,
)
from app.models.user import User
from app.schemas.teacher_curriculum import (
    TeacherCurriculumAuthorOut,
    TeacherCurriculumLessonOut,
    TeacherCurriculumListOut,
    TeacherCurriculumModuleOut,
    TeacherCurriculumOut,
    TeacherCurriculumSummaryOut,
    TeacherCurriculumWrite,
)


def _author_out(user: User) -> TeacherCurriculumAuthorOut:
    return TeacherCurriculumAuthorOut(id=user.id, full_name=user.full_name)


def _lesson_out(lesson: TeacherCurriculumLesson) -> TeacherCurriculumLessonOut:
    return TeacherCurriculumLessonOut(
        id=lesson.id,
        number=lesson.number,
        lesson_type=lesson.lesson_type,
        topic=lesson.topic,
        student_activities=lesson.student_activities,
    )


def _module_out(module: TeacherCurriculumModule) -> TeacherCurriculumModuleOut:
    return TeacherCurriculumModuleOut(
        id=module.id,
        title=module.title,
        lessons=[_lesson_out(l) for l in module.lessons],
    )


def _counts(curriculum: TeacherCurriculum) -> tuple[int, int]:
    modules = curriculum.modules or []
    lesson_count = sum(len(m.lessons) for m in modules)
    return len(modules), lesson_count


def _curriculum_out(curriculum: TeacherCurriculum, viewer: User) -> TeacherCurriculumOut:
    module_count, lesson_count = _counts(curriculum)
    is_mine = curriculum.author_id == viewer.id
    return TeacherCurriculumOut(
        id=curriculum.id,
        title=curriculum.title,
        is_public=curriculum.is_public,
        author=_author_out(curriculum.author),
        is_mine=is_mine,
        can_edit=is_mine,
        modules=[_module_out(m) for m in curriculum.modules],
        module_count=module_count,
        lesson_count=lesson_count,
        created_at=curriculum.created_at,
        updated_at=curriculum.updated_at,
    )


def _summary_out(curriculum: TeacherCurriculum, viewer: User) -> TeacherCurriculumSummaryOut:
    module_count, lesson_count = _counts(curriculum)
    is_mine = curriculum.author_id == viewer.id
    return TeacherCurriculumSummaryOut(
        id=curriculum.id,
        title=curriculum.title,
        is_public=curriculum.is_public,
        author=_author_out(curriculum.author),
        is_mine=is_mine,
        can_edit=is_mine,
        module_count=module_count,
        lesson_count=lesson_count,
        updated_at=curriculum.updated_at,
    )


def _apply_modules(curriculum: TeacherCurriculum, data: TeacherCurriculumWrite) -> None:
    curriculum.modules.clear()
    for mod_idx, mod_in in enumerate(data.modules):
        module = TeacherCurriculumModule(
            title=mod_in.title.strip(),
            sort_order=mod_idx,
        )
        for les_idx, les_in in enumerate(mod_in.lessons):
            module.lessons.append(
                TeacherCurriculumLesson(
                    number=les_in.number,
                    lesson_type=(les_in.lesson_type or "").strip(),
                    topic=(les_in.topic or "").strip(),
                    student_activities=(les_in.student_activities or "").strip(),
                    sort_order=les_idx,
                )
            )
        curriculum.modules.append(module)


async def _get_curriculum_or_404(db: AsyncSession, curriculum_id: int) -> TeacherCurriculum:
    result = await db.execute(
        select(TeacherCurriculum)
        .options(
            selectinload(TeacherCurriculum.author),
            selectinload(TeacherCurriculum.modules).selectinload(TeacherCurriculumModule.lessons),
        )
        .where(TeacherCurriculum.id == curriculum_id)
    )
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Програму не знайдено")
    return curriculum


def _ensure_can_view(curriculum: TeacherCurriculum, viewer: User) -> None:
    if curriculum.author_id == viewer.id or curriculum.is_public:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Немає доступу")


def _ensure_can_edit(curriculum: TeacherCurriculum, viewer: User) -> None:
    if curriculum.author_id != viewer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Редагувати може лише автор")


async def list_teacher_curricula(db: AsyncSession, viewer: User) -> TeacherCurriculumListOut:
    result = await db.execute(
        select(TeacherCurriculum)
        .options(
            selectinload(TeacherCurriculum.author),
            selectinload(TeacherCurriculum.modules).selectinload(TeacherCurriculumModule.lessons),
        )
        .where(
            or_(
                TeacherCurriculum.author_id == viewer.id,
                TeacherCurriculum.is_public.is_(True),
            )
        )
        .order_by(TeacherCurriculum.updated_at.desc())
    )
    programs = [_summary_out(c, viewer) for c in result.scalars().all()]
    return TeacherCurriculumListOut(programs=programs)


async def get_teacher_curriculum(
    db: AsyncSession, curriculum_id: int, viewer: User
) -> TeacherCurriculumOut:
    curriculum = await _get_curriculum_or_404(db, curriculum_id)
    _ensure_can_view(curriculum, viewer)
    return _curriculum_out(curriculum, viewer)


async def create_teacher_curriculum(
    db: AsyncSession, viewer: User, data: TeacherCurriculumWrite
) -> TeacherCurriculumOut:
    curriculum = TeacherCurriculum(
        title=data.title.strip(),
        author_id=viewer.id,
        is_public=data.is_public,
    )
    _apply_modules(curriculum, data)
    db.add(curriculum)
    await db.flush()
    curriculum = await _get_curriculum_or_404(db, curriculum.id)
    return _curriculum_out(curriculum, viewer)


async def update_teacher_curriculum(
    db: AsyncSession, curriculum_id: int, viewer: User, data: TeacherCurriculumWrite
) -> TeacherCurriculumOut:
    curriculum = await _get_curriculum_or_404(db, curriculum_id)
    _ensure_can_edit(curriculum, viewer)
    curriculum.title = data.title.strip()
    curriculum.is_public = data.is_public
    _apply_modules(curriculum, data)
    await db.flush()
    curriculum = await _get_curriculum_or_404(db, curriculum.id)
    return _curriculum_out(curriculum, viewer)


async def delete_teacher_curriculum(
    db: AsyncSession, curriculum_id: int, viewer: User
) -> None:
    curriculum = await _get_curriculum_or_404(db, curriculum_id)
    _ensure_can_edit(curriculum, viewer)
    await db.delete(curriculum)
