"""Посилання викладача для учня: урок, Miro, довільні."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.teacher_student_link import TeacherStudentLink, TeacherStudentLinkType
from app.models.user import User
from app.schemas.teacher_student_links import (
    StudentCustomLinkOut,
    StudentLinkOut,
    StudentLearningResourcesOut,
    StudentTeacherResourcesOut,
    TeacherStudentLinksOut,
)
from app.services.optimate_cache import _teacher_can_access_student


def _link_out(row: TeacherStudentLink) -> StudentLinkOut:
    return StudentLinkOut(
        id=row.id,
        link_type=row.link_type.value,
        url=row.url,
        label=row.label or "",
        sort_order=row.sort_order,
    )


def _normalize_url(url: str) -> str:
    text = (url or "").strip()
    if text and not text.startswith(("http://", "https://")):
        text = f"https://{text}"
    return text


async def _ensure_teacher_student_access(
    teacher_optimate_id: str,
    student_optimate_id: str,
) -> None:
    from fastapi import HTTPException

    if not await _teacher_can_access_student(teacher_optimate_id, student_optimate_id):
        raise HTTPException(status_code=403, detail="Немає доступу до цього учня")


async def get_teacher_student_links(
    db: AsyncSession,
    teacher: User,
    student_optimate_id: str,
) -> TeacherStudentLinksOut:
    result = await db.execute(
        select(TeacherStudentLink)
        .where(
            TeacherStudentLink.teacher_user_id == teacher.id,
            TeacherStudentLink.student_optimate_id == student_optimate_id,
        )
        .order_by(TeacherStudentLink.sort_order, TeacherStudentLink.id)
    )
    rows = list(result.scalars().all())

    lesson_link = None
    miro_link = None
    custom_links: list[StudentLinkOut] = []

    for row in rows:
        out = _link_out(row)
        if row.link_type == TeacherStudentLinkType.LESSON:
            lesson_link = out
        elif row.link_type == TeacherStudentLinkType.MIRO:
            miro_link = out
        else:
            custom_links.append(out)

    return TeacherStudentLinksOut(
        student_optimate_id=student_optimate_id,
        lesson_link=lesson_link,
        miro_link=miro_link,
        custom_links=custom_links,
    )


async def upsert_teacher_student_link(
    db: AsyncSession,
    teacher: User,
    teacher_optimate_id: str,
    student_optimate_id: str,
    link_type: str,
    url: str,
    label: str = "",
) -> StudentLinkOut:
    await _ensure_teacher_student_access(teacher_optimate_id, student_optimate_id)

    normalized_url = _normalize_url(url)
    if not normalized_url:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Вкажіть посилання")

    try:
        enum_type = TeacherStudentLinkType(link_type)
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Невідомий тип посилання") from exc

    if enum_type == TeacherStudentLinkType.CUSTOM and not (label or "").strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Для довільного посилання вкажіть опис")

    if enum_type in (TeacherStudentLinkType.LESSON, TeacherStudentLinkType.MIRO):
        result = await db.execute(
            select(TeacherStudentLink).where(
                TeacherStudentLink.teacher_user_id == teacher.id,
                TeacherStudentLink.student_optimate_id == student_optimate_id,
                TeacherStudentLink.link_type == enum_type,
            )
        )
        row = result.scalar_one_or_none()
        if row:
            row.url = normalized_url
            row.label = (label or "").strip()
            row.teacher_optimate_id = teacher_optimate_id or row.teacher_optimate_id
            await db.flush()
            return _link_out(row)

        row = TeacherStudentLink(
            teacher_user_id=teacher.id,
            teacher_optimate_id=teacher_optimate_id or "",
            student_optimate_id=student_optimate_id,
            link_type=enum_type,
            url=normalized_url,
            label=(label or "").strip(),
        )
        db.add(row)
        await db.flush()
        return _link_out(row)

    result = await db.execute(
        select(TeacherStudentLink)
        .where(
            TeacherStudentLink.teacher_user_id == teacher.id,
            TeacherStudentLink.student_optimate_id == student_optimate_id,
            TeacherStudentLink.link_type == TeacherStudentLinkType.CUSTOM,
        )
        .order_by(TeacherStudentLink.sort_order.desc(), TeacherStudentLink.id.desc())
    )
    last = result.scalars().first()
    sort_order = (last.sort_order + 1) if last else 0

    row = TeacherStudentLink(
        teacher_user_id=teacher.id,
        teacher_optimate_id=teacher_optimate_id or "",
        student_optimate_id=student_optimate_id,
        link_type=TeacherStudentLinkType.CUSTOM,
        url=normalized_url,
        label=(label or "").strip(),
        sort_order=sort_order,
    )
    db.add(row)
    await db.flush()
    return _link_out(row)


async def update_teacher_student_link(
    db: AsyncSession,
    teacher: User,
    link_id: int,
    *,
    url: str | None = None,
    label: str | None = None,
) -> StudentLinkOut:
    result = await db.execute(
        select(TeacherStudentLink).where(
            TeacherStudentLink.id == link_id,
            TeacherStudentLink.teacher_user_id == teacher.id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Посилання не знайдено")

    if url is not None:
        normalized = _normalize_url(url)
        if not normalized:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Вкажіть посилання")
        row.url = normalized
    if label is not None:
        row.label = label.strip()
        if row.link_type == TeacherStudentLinkType.CUSTOM and not row.label:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Для довільного посилання вкажіть опис")

    await db.flush()
    return _link_out(row)


async def delete_teacher_student_link(
    db: AsyncSession,
    teacher: User,
    link_id: int,
) -> None:
    result = await db.execute(
        select(TeacherStudentLink).where(
            TeacherStudentLink.id == link_id,
            TeacherStudentLink.teacher_user_id == teacher.id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Посилання не знайдено")
    await db.delete(row)
    await db.flush()


async def get_student_learning_resources(
    db: AsyncSession,
    student_optimate_id: str,
) -> StudentLearningResourcesOut:
    result = await db.execute(
        select(TeacherStudentLink)
        .where(TeacherStudentLink.student_optimate_id == student_optimate_id)
        .order_by(TeacherStudentLink.teacher_user_id, TeacherStudentLink.sort_order, TeacherStudentLink.id)
    )
    rows = list(result.scalars().all())
    if not rows:
        return StudentLearningResourcesOut(groups=[])

    teacher_ids = {row.teacher_user_id for row in rows}
    teachers_result = await db.execute(
        select(User).where(User.id.in_(teacher_ids))
    )
    teachers = {u.id: u for u in teachers_result.scalars().all()}

    grouped: dict[int, StudentTeacherResourcesOut] = {}
    for row in rows:
        teacher = teachers.get(row.teacher_user_id)
        teacher_name = teacher.full_name if teacher else "Викладач"
        teacher_opt_id = row.teacher_optimate_id or (teacher.optimeit_id if teacher else "")

        if row.teacher_user_id not in grouped:
            grouped[row.teacher_user_id] = StudentTeacherResourcesOut(
                teacher_optimate_id=teacher_opt_id,
                teacher_name=teacher_name,
            )

        bucket = grouped[row.teacher_user_id]
        if row.link_type == TeacherStudentLinkType.LESSON:
            bucket.lesson_url = row.url
        elif row.link_type == TeacherStudentLinkType.MIRO:
            bucket.miro_url = row.url
        else:
            bucket.custom_links.append(
                StudentCustomLinkOut(id=row.id, url=row.url, label=row.label or "")
            )

    return StudentLearningResourcesOut(groups=list(grouped.values()))


async def resolve_lesson_links_for_student_teacher(
    db: AsyncSession,
    teacher_optimate_id: str,
    student_optimate_id: str,
    fallback_zoom: str = "",
    fallback_miro: str = "",
) -> tuple[str, str]:
    """Персональні посилання учня, інакше — глобальні посилання викладача."""
    if not teacher_optimate_id or not student_optimate_id:
        return fallback_zoom, fallback_miro

    result = await db.execute(
        select(TeacherStudentLink).where(
            TeacherStudentLink.student_optimate_id == student_optimate_id,
            TeacherStudentLink.teacher_optimate_id == str(teacher_optimate_id),
            TeacherStudentLink.link_type.in_([
                TeacherStudentLinkType.LESSON,
                TeacherStudentLinkType.MIRO,
            ]),
        )
    )
    rows = list(result.scalars().all())

    if not rows:
        teacher_result = await db.execute(
            select(User).where(
                User.optimeit_id == str(teacher_optimate_id),
            ).limit(1)
        )
        teacher = teacher_result.scalar_one_or_none()
        if teacher:
            result = await db.execute(
                select(TeacherStudentLink).where(
                    TeacherStudentLink.student_optimate_id == student_optimate_id,
                    TeacherStudentLink.teacher_user_id == teacher.id,
                    TeacherStudentLink.link_type.in_([
                        TeacherStudentLinkType.LESSON,
                        TeacherStudentLinkType.MIRO,
                    ]),
                )
            )
            rows = list(result.scalars().all())

    lesson_url = ""
    miro_url = ""
    for row in rows:
        if row.link_type == TeacherStudentLinkType.LESSON and row.url:
            lesson_url = row.url
        elif row.link_type == TeacherStudentLinkType.MIRO and row.url:
            miro_url = row.url

    return lesson_url or fallback_zoom, miro_url or fallback_miro
