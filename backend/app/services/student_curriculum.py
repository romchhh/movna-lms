"""Student curriculum assignment, event mapping, and progress."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.student_curriculum import (
    CurriculumSource,
    EnrollmentStatus,
    SlotStatus,
    StudentCurriculumEnrollment,
    StudentCurriculumSlot,
    new_split_group_key,
)
from app.models.teacher_curriculum import TeacherCurriculum
from app.models.user import User
from app.schemas.curriculum import CurriculumProgramOut
from app.schemas.student_curriculum import (
    AssignCurriculumIn,
    EnrollmentDetailOut,
    EnrollmentSummaryOut,
    EventTopicOut,
    FlatLessonRef,
    ModuleProgressOut,
    SlotOut,
    StudentCurriculumOverviewOut,
    SyncEventsOut,
    TeacherStudentCurriculumOut,
)
from app.schemas.teacher_curriculum import TeacherCurriculumOut
from app.services.curriculum_sheets import get_curriculum_program_by_slug
from app.services.optimate_cache import get_cached_teacher_events, _teacher_can_access_student
from app.services.teacher_curriculum import get_teacher_curriculum


def _display_topic(slot: StudentCurriculumSlot) -> str:
    topic = (slot.topic or "").strip()
    if slot.split_total > 1:
        suffix = f" (ч. {slot.split_part}/{slot.split_total})"
        if suffix not in topic:
            return f"{topic}{suffix}"
    return topic


def _slot_out(slot: StudentCurriculumSlot) -> SlotOut:
    return SlotOut(
        id=slot.id,
        sequence_index=slot.sequence_index,
        module_index=slot.module_index,
        module_title=slot.module_title,
        lesson_number=slot.lesson_number,
        lesson_type=slot.lesson_type,
        topic=slot.topic,
        student_activities=slot.student_activities,
        split_part=slot.split_part,
        split_total=slot.split_total,
        split_group_key=slot.split_group_key,
        optimate_event_id=slot.optimate_event_id,
        event_starts_at=slot.event_starts_at,
        status=slot.status.value,
        completed_at=slot.completed_at,
        display_topic=_display_topic(slot),
    )


def _count_progress(slots: list[StudentCurriculumSlot]) -> tuple[int, int, int, int]:
    total = len(slots)
    completed = sum(1 for s in slots if s.status == SlotStatus.COMPLETED)
    scheduled = sum(
        1 for s in slots
        if s.status in (SlotStatus.SCHEDULED, SlotStatus.COMPLETED) and s.optimate_event_id
    )
    pct = round(completed / total * 100) if total else 0
    return total, completed, scheduled, pct


def _group_modules(slots: list[StudentCurriculumSlot]) -> list[ModuleProgressOut]:
    by_module: dict[int, list[StudentCurriculumSlot]] = {}
    titles: dict[int, str] = {}
    for slot in slots:
        by_module.setdefault(slot.module_index, []).append(slot)
        titles[slot.module_index] = slot.module_title

    modules: list[ModuleProgressOut] = []
    for mod_idx in sorted(by_module.keys()):
        mod_slots = sorted(by_module[mod_idx], key=lambda s: s.sequence_index)
        completed = sum(1 for s in mod_slots if s.status == SlotStatus.COMPLETED)
        modules.append(
            ModuleProgressOut(
                module_index=mod_idx,
                module_title=titles.get(mod_idx, ""),
                total_slots=len(mod_slots),
                completed_slots=completed,
                slots=[_slot_out(s) for s in mod_slots],
            )
        )
    return modules


def _summary_out(enrollment: StudentCurriculumEnrollment) -> EnrollmentSummaryOut:
    total, completed, scheduled, pct = _count_progress(enrollment.slots or [])
    return EnrollmentSummaryOut(
        id=enrollment.id,
        program_title=enrollment.program_title,
        curriculum_source=enrollment.curriculum_source.value,
        movna_program_slug=enrollment.movna_program_slug,
        teacher_curriculum_id=enrollment.teacher_curriculum_id,
        status=enrollment.status.value,
        teacher_name=enrollment.teacher_name,
        assigned_at=enrollment.assigned_at,
        ended_at=enrollment.ended_at,
        total_slots=total,
        completed_slots=completed,
        scheduled_slots=scheduled,
        progress_pct=pct,
    )


def _detail_out(enrollment: StudentCurriculumEnrollment) -> EnrollmentDetailOut:
    slots = sorted(enrollment.slots or [], key=lambda s: s.sequence_index)
    total, completed, scheduled, pct = _count_progress(slots)
    return EnrollmentDetailOut(
        id=enrollment.id,
        program_title=enrollment.program_title,
        curriculum_source=enrollment.curriculum_source.value,
        movna_program_slug=enrollment.movna_program_slug,
        teacher_curriculum_id=enrollment.teacher_curriculum_id,
        status=enrollment.status.value,
        teacher_name=enrollment.teacher_name,
        assigned_at=enrollment.assigned_at,
        ended_at=enrollment.ended_at,
        total_slots=total,
        completed_slots=completed,
        scheduled_slots=scheduled,
        progress_pct=pct,
        student_optimate_id=enrollment.student_optimate_id,
        student_name=enrollment.student_name,
        teacher_optimate_id=enrollment.teacher_optimate_id,
        start_sequence_index=enrollment.start_sequence_index,
        modules=_group_modules(slots),
        slots=[_slot_out(s) for s in slots],
    )


def _flatten_movna(program: CurriculumProgramOut) -> list[FlatLessonRef]:
    flat: list[FlatLessonRef] = []
    for mod_idx, module in enumerate(program.modules):
        for les_idx, lesson in enumerate(module.lessons):
            flat.append(
                FlatLessonRef(
                    module_index=mod_idx,
                    module_title=module.name,
                    lesson_index=les_idx,
                    number=lesson.number,
                    lesson_type=lesson.lesson_type,
                    topic=lesson.topic,
                    student_activities=lesson.student_activities,
                )
            )
    return flat


def _flatten_custom(program: TeacherCurriculumOut) -> list[FlatLessonRef]:
    flat: list[FlatLessonRef] = []
    for mod_idx, module in enumerate(program.modules):
        for les_idx, lesson in enumerate(module.lessons):
            flat.append(
                FlatLessonRef(
                    module_index=mod_idx,
                    module_title=module.title,
                    lesson_index=les_idx,
                    number=lesson.number,
                    lesson_type=lesson.lesson_type,
                    topic=lesson.topic,
                    student_activities=lesson.student_activities,
                    source_lesson_id=lesson.id,
                )
            )
    return flat


def _find_start_index(flat: list[FlatLessonRef], module_index: int, lesson_index: int) -> int:
    for i, item in enumerate(flat):
        if item.module_index == module_index and item.lesson_index == lesson_index:
            return i
    for i, item in enumerate(flat):
        if item.module_index >= module_index:
            return i
    return 0


def _build_slots(
    flat: list[FlatLessonRef],
    start_index: int,
) -> list[StudentCurriculumSlot]:
    slots: list[StudentCurriculumSlot] = []
    for seq, item in enumerate(flat[start_index:], start=0):
        slots.append(
            StudentCurriculumSlot(
                sequence_index=seq,
                module_index=item.module_index,
                module_title=item.module_title,
                lesson_number=item.number,
                lesson_type=item.lesson_type,
                topic=item.topic,
                student_activities=item.student_activities,
                source_lesson_id=item.source_lesson_id,
                status=SlotStatus.PENDING,
            )
        )
    return slots


async def _load_movna_flat(slug: str) -> tuple[str, list[FlatLessonRef]]:
    program = await get_curriculum_program_by_slug(slug)
    if not program:
        raise HTTPException(status_code=404, detail="Програму Movna не знайдено")
    flat = _flatten_movna(program)
    if not flat:
        raise HTTPException(status_code=400, detail="Програма не містить уроків")
    return program.name, flat


async def _load_custom_flat(db: AsyncSession, curriculum_id: int, viewer: User) -> tuple[str, list[FlatLessonRef]]:
    program = await get_teacher_curriculum(db, curriculum_id, viewer)
    flat = _flatten_custom(program)
    if not flat:
        raise HTTPException(status_code=400, detail="Програма не містить уроків")
    return program.title, flat


async def _get_active_enrollment(
    db: AsyncSession,
    student_optimate_id: str,
) -> StudentCurriculumEnrollment | None:
    result = await db.execute(
        select(StudentCurriculumEnrollment)
        .where(
            StudentCurriculumEnrollment.student_optimate_id == student_optimate_id,
            StudentCurriculumEnrollment.status == EnrollmentStatus.ACTIVE,
        )
        .options(selectinload(StudentCurriculumEnrollment.slots))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_enrollment(
    db: AsyncSession,
    enrollment_id: int,
) -> StudentCurriculumEnrollment:
    result = await db.execute(
        select(StudentCurriculumEnrollment)
        .where(StudentCurriculumEnrollment.id == enrollment_id)
        .options(selectinload(StudentCurriculumEnrollment.slots))
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Програму не знайдено")
    return enrollment


def _student_in_event(event, student_id: str) -> bool:
    ids = getattr(event, "student_ids", None) or []
    return str(student_id) in {str(x) for x in ids}


def _is_cancelled(event) -> bool:
    label = (getattr(event, "completion_label", None) or "").lower()
    return "скас" in label or "cancel" in label


async def _collect_student_events(
    teacher_optimate_id: str,
    student_optimate_id: str,
) -> list:
    (events, _, _, _), _, _ = await get_cached_teacher_events(
        teacher_optimate_id,
        days_back=30,
        days_forward=180,
    )
    filtered = [
        e for e in events
        if _student_in_event(e, student_optimate_id) and not _is_cancelled(e)
    ]
    filtered.sort(key=lambda e: e.starts_at or "")
    return filtered


async def sync_enrollment_events(
    db: AsyncSession,
    enrollment: StudentCurriculumEnrollment,
    teacher_optimate_id: str,
) -> int:
    events = await _collect_student_events(teacher_optimate_id, enrollment.student_optimate_id)
    slots = sorted(enrollment.slots or [], key=lambda s: s.sequence_index)

    used_event_ids = {s.optimate_event_id for s in slots if s.optimate_event_id}
    unmapped_slots = [s for s in slots if not s.optimate_event_id and s.status == SlotStatus.PENDING]
    available_events = [e for e in events if str(e.id) not in used_event_ids]

    mapped = 0
    for slot, event in zip(unmapped_slots, available_events):
        slot.optimate_event_id = str(event.id)
        slot.event_starts_at = event.starts_at or ""
        slot.status = SlotStatus.SCHEDULED
        if event.is_completed:
            slot.status = SlotStatus.COMPLETED
            slot.completed_at = datetime.utcnow()
        mapped += 1

    await db.flush()
    return mapped


async def assign_curriculum(
    db: AsyncSession,
    teacher: User,
    teacher_optimate_id: str,
    payload: AssignCurriculumIn,
    *,
    replace: bool = False,
) -> EnrollmentDetailOut:
    if not await _teacher_can_access_student(teacher_optimate_id, payload.student_optimate_id):
        raise HTTPException(status_code=403, detail="Немає доступу до цього учня")

    old_active = await _get_active_enrollment(db, payload.student_optimate_id)
    if old_active and not replace:
        raise HTTPException(
            status_code=400,
            detail="У учня вже є активна програма. Замініть її на нову.",
        )

    if payload.curriculum_source == "movna":
        if not payload.movna_program_slug:
            raise HTTPException(status_code=400, detail="Вкажіть slug програми Movna")
        title, flat = await _load_movna_flat(payload.movna_program_slug)
        source = CurriculumSource.MOVNA
        movna_slug = payload.movna_program_slug
        custom_id = None
    else:
        if not payload.teacher_curriculum_id:
            raise HTTPException(status_code=400, detail="Вкажіть id власної програми")
        title, flat = await _load_custom_flat(db, payload.teacher_curriculum_id, teacher)
        source = CurriculumSource.CUSTOM
        movna_slug = ""
        custom_id = payload.teacher_curriculum_id

    start_index = _find_start_index(flat, payload.start_module_index, payload.start_lesson_index)
    slots = _build_slots(flat, start_index)

    enrollment = StudentCurriculumEnrollment(
        student_optimate_id=payload.student_optimate_id,
        student_name=payload.student_name,
        teacher_user_id=teacher.id,
        teacher_optimate_id=teacher_optimate_id,
        teacher_name=teacher.full_name,
        curriculum_source=source,
        program_title=title,
        movna_program_slug=movna_slug or "",
        teacher_curriculum_id=custom_id,
        status=EnrollmentStatus.ACTIVE,
        start_sequence_index=start_index,
        slots=slots,
    )
    db.add(enrollment)
    await db.flush()

    if old_active and replace:
        old_active.status = EnrollmentStatus.REPLACED
        old_active.ended_at = datetime.utcnow()
        old_active.replaced_by_id = enrollment.id

    if payload.sync_events:
        await sync_enrollment_events(db, enrollment, teacher_optimate_id)

    await db.refresh(enrollment, attribute_names=["slots"])
    return _detail_out(enrollment)


async def split_slot(
    db: AsyncSession,
    slot_id: int,
    teacher_optimate_id: str,
) -> EnrollmentDetailOut:
    result = await db.execute(
        select(StudentCurriculumSlot)
        .where(StudentCurriculumSlot.id == slot_id)
        .options(selectinload(StudentCurriculumSlot.enrollment).selectinload(StudentCurriculumEnrollment.slots))
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Урок не знайдено")

    enrollment = slot.enrollment
    if enrollment.status != EnrollmentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Програма не активна")

    if slot.split_total > 1:
        raise HTTPException(status_code=400, detail="Тему вже розділено")

    group_key = new_split_group_key()
    slot.split_group_key = group_key
    slot.split_part = 1
    slot.split_total = 2

    insert_at = slot.sequence_index + 1
    for s in enrollment.slots or []:
        if s.sequence_index >= insert_at:
            s.sequence_index += 1
            if s.optimate_event_id:
                s.optimate_event_id = ""
                s.event_starts_at = ""
                if s.status == SlotStatus.SCHEDULED:
                    s.status = SlotStatus.PENDING

    new_slot = StudentCurriculumSlot(
        enrollment_id=enrollment.id,
        sequence_index=insert_at,
        module_index=slot.module_index,
        module_title=slot.module_title,
        lesson_number=slot.lesson_number,
        lesson_type=slot.lesson_type,
        topic=slot.topic,
        student_activities=slot.student_activities,
        source_lesson_id=slot.source_lesson_id,
        split_group_key=group_key,
        split_part=2,
        split_total=2,
        status=SlotStatus.PENDING,
    )
    db.add(new_slot)
    await db.flush()
    await sync_enrollment_events(db, enrollment, teacher_optimate_id)
    await db.refresh(enrollment, attribute_names=["slots"])
    return _detail_out(enrollment)


async def mark_slot_completed(db: AsyncSession, slot_id: int) -> SlotOut:
    result = await db.execute(
        select(StudentCurriculumSlot).where(StudentCurriculumSlot.id == slot_id)
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Урок не знайдено")
    slot.status = SlotStatus.COMPLETED
    slot.completed_at = datetime.utcnow()
    await db.flush()
    return _slot_out(slot)


async def get_teacher_student_curriculum(
    db: AsyncSession,
    teacher_optimate_id: str,
    student_optimate_id: str,
) -> TeacherStudentCurriculumOut:
    if not await _teacher_can_access_student(teacher_optimate_id, student_optimate_id):
        raise HTTPException(status_code=403, detail="Немає доступу до цього учня")

    result = await db.execute(
        select(StudentCurriculumEnrollment)
        .where(StudentCurriculumEnrollment.student_optimate_id == student_optimate_id)
        .options(selectinload(StudentCurriculumEnrollment.slots))
        .order_by(StudentCurriculumEnrollment.assigned_at.desc())
    )
    enrollments = list(result.scalars().all())
    active = next((e for e in enrollments if e.status == EnrollmentStatus.ACTIVE), None)
    history = [
        _summary_out(e) for e in enrollments
        if e.status != EnrollmentStatus.ACTIVE
    ]

    student_name = active.student_name if active else (enrollments[0].student_name if enrollments else "")

    return TeacherStudentCurriculumOut(
        student_optimate_id=student_optimate_id,
        student_name=student_name,
        active=_detail_out(active) if active else None,
        history=history,
    )


async def get_student_overview(
    db: AsyncSession,
    student_optimate_id: str,
) -> StudentCurriculumOverviewOut:
    result = await db.execute(
        select(StudentCurriculumEnrollment)
        .where(StudentCurriculumEnrollment.student_optimate_id == student_optimate_id)
        .options(selectinload(StudentCurriculumEnrollment.slots))
        .order_by(StudentCurriculumEnrollment.assigned_at.desc())
    )
    enrollments = list(result.scalars().all())
    active = next((e for e in enrollments if e.status == EnrollmentStatus.ACTIVE), None)
    history = [
        _summary_out(e) for e in enrollments
        if e.status != EnrollmentStatus.ACTIVE
    ]
    return StudentCurriculumOverviewOut(
        active=_detail_out(active) if active else None,
        history=history,
    )


async def get_enrollment_detail(
    db: AsyncSession,
    enrollment_id: int,
    student_optimate_id: str | None = None,
) -> EnrollmentDetailOut:
    enrollment = await _get_enrollment(db, enrollment_id)
    if student_optimate_id and enrollment.student_optimate_id != student_optimate_id:
        raise HTTPException(status_code=403, detail="Немає доступу")
    return _detail_out(enrollment)


async def sync_events_for_enrollment(
    db: AsyncSession,
    enrollment_id: int,
    teacher_optimate_id: str,
) -> SyncEventsOut:
    enrollment = await _get_enrollment(db, enrollment_id)
    if enrollment.status != EnrollmentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Програма не активна")
    mapped = await sync_enrollment_events(db, enrollment, teacher_optimate_id)
    await db.refresh(enrollment, attribute_names=["slots"])
    return SyncEventsOut(mapped_count=mapped, enrollment=_detail_out(enrollment))


async def get_event_topic(
    db: AsyncSession,
    event_id: str,
    student_optimate_id: str | None = None,
) -> EventTopicOut:
    query = (
        select(StudentCurriculumSlot)
        .join(StudentCurriculumEnrollment)
        .where(StudentCurriculumSlot.optimate_event_id == event_id)
        .options(selectinload(StudentCurriculumSlot.enrollment))
        .order_by(StudentCurriculumEnrollment.assigned_at.desc())
    )
    if student_optimate_id:
        query = query.where(StudentCurriculumEnrollment.student_optimate_id == student_optimate_id)

    result = await db.execute(query)
    slot = result.scalars().first()
    if not slot:
        return EventTopicOut(optimate_event_id=event_id)

    return EventTopicOut(
        optimate_event_id=event_id,
        program_title=slot.enrollment.program_title,
        topic=slot.topic,
        module_title=slot.module_title,
        lesson_type=slot.lesson_type,
        lesson_number=slot.lesson_number,
        slot_id=slot.id,
        enrollment_id=slot.enrollment_id,
        status=slot.status.value,
        display_topic=_display_topic(slot),
    )
