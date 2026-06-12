import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.event_homework import (
    EventHomeworkAssignment,
    EventHomeworkSubmission,
    EventHomeworkSubmissionStatus,
)
from app.models.user import User, UserRole
from app.schemas.event_homework import (
    HomeworkAssignmentCreate,
    HomeworkAssignmentOut,
    HomeworkAttachment,
    HomeworkCompleteIn,
    HomeworkPendingCountOut,
    HomeworkReviewIn,
    HomeworkStudentItemOut,
    HomeworkSubmissionOut,
)
from app.services.file_storage import (
    display_filename,
    guess_media_type,
    resolve_homework_file,
    save_homework_upload,
)

router = APIRouter()


def _attachments_from_json(raw: str) -> list[HomeworkAttachment]:
    try:
        data = json.loads(raw or "[]")
        if not isinstance(data, list):
            return []
        return [HomeworkAttachment(**item) for item in data if isinstance(item, dict)]
    except (json.JSONDecodeError, TypeError, ValueError):
        return []


def _attachments_to_json(items: list[HomeworkAttachment]) -> str:
    return json.dumps([a.model_dump() for a in items], ensure_ascii=False)


def _assignment_out(assignment: EventHomeworkAssignment) -> HomeworkAssignmentOut:
    return HomeworkAssignmentOut(
        id=assignment.id,
        optimate_event_id=assignment.optimate_event_id,
        teacher_user_id=assignment.teacher_user_id,
        teacher_optimate_id=assignment.teacher_optimate_id,
        title=assignment.title,
        body_markdown=assignment.body_markdown,
        deadline_at=assignment.deadline_at,
        teacher_attachments=_attachments_from_json(assignment.teacher_attachments_json),
        event_starts_at=assignment.event_starts_at,
        event_ends_at=assignment.event_ends_at,
        event_title=assignment.event_title,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        submissions=[HomeworkSubmissionOut.model_validate(s) for s in assignment.submissions],
    )


def _student_item(
    assignment: EventHomeworkAssignment,
    submission: EventHomeworkSubmission,
    teacher_name: str = "",
) -> HomeworkStudentItemOut:
    return HomeworkStudentItemOut(
        submission_id=submission.id,
        assignment_id=assignment.id,
        optimate_event_id=assignment.optimate_event_id,
        title=assignment.title,
        body_markdown=assignment.body_markdown,
        deadline_at=assignment.deadline_at,
        teacher_attachments=_attachments_from_json(assignment.teacher_attachments_json),
        event_starts_at=assignment.event_starts_at,
        event_ends_at=assignment.event_ends_at,
        event_title=assignment.event_title,
        teacher_name=teacher_name,
        status=submission.status,
        student_answer_md=submission.student_answer_md,
        student_file_url=submission.student_file_url,
        teacher_review_note=submission.teacher_review_note,
        viewed_at=submission.viewed_at,
        completed_at=submission.completed_at,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
        updated_at=assignment.updated_at,
    )


async def _teacher_optimate_id(user: User) -> str:
    oid = (user.optimeit_id or "").strip()
    if not oid:
        raise HTTPException(
            status_code=400,
            detail="Профіль викладача не привʼязаний до Optimate",
        )
    return oid


async def _get_assignment_by_event(
    db: AsyncSession,
    event_id: str,
) -> EventHomeworkAssignment | None:
    result = await db.execute(
        select(EventHomeworkAssignment)
        .options(selectinload(EventHomeworkAssignment.submissions))
        .where(EventHomeworkAssignment.optimate_event_id == event_id)
    )
    return result.scalar_one_or_none()


async def _get_submission_or_404(db: AsyncSession, submission_id: int) -> EventHomeworkSubmission:
    result = await db.execute(
        select(EventHomeworkSubmission)
        .options(selectinload(EventHomeworkSubmission.assignment))
        .where(EventHomeworkSubmission.id == submission_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Запис не знайдено")
    return sub


async def _assert_file_access(
    db: AsyncSession,
    current_user: User,
    stored_name: str,
) -> None:
    if current_user.role == UserRole.ADMIN:
        return

    if current_user.role == UserRole.TEACHER:
        own_attachment = await db.scalar(
            select(func.count())
            .select_from(EventHomeworkAssignment)
            .where(
                EventHomeworkAssignment.teacher_user_id == current_user.id,
                EventHomeworkAssignment.teacher_attachments_json.contains(stored_name),
            )
        )
        student_file = await db.scalar(
            select(func.count())
            .select_from(EventHomeworkSubmission)
            .join(EventHomeworkAssignment)
            .where(
                EventHomeworkAssignment.teacher_user_id == current_user.id,
                EventHomeworkSubmission.student_file_url.contains(stored_name),
            )
        )
        if int(own_attachment or 0) + int(student_file or 0) > 0:
            return
        raise HTTPException(status_code=403, detail="Немає доступу до файлу")

    if current_user.role == UserRole.STUDENT:
        oid = (current_user.optimeit_id or "").strip()
        student_match = [EventHomeworkSubmission.student_user_id == current_user.id]
        if oid:
            student_match.append(EventHomeworkSubmission.student_optimate_id == oid)

        own_file = await db.scalar(
            select(func.count())
            .select_from(EventHomeworkSubmission)
            .where(
                or_(*student_match),
                EventHomeworkSubmission.student_file_url.contains(stored_name),
            )
        )
        teacher_file = await db.scalar(
            select(func.count())
            .select_from(EventHomeworkSubmission)
            .join(EventHomeworkAssignment)
            .where(
                or_(*student_match),
                EventHomeworkAssignment.teacher_attachments_json.contains(stored_name),
            )
        )
        if int(own_file or 0) + int(teacher_file or 0) > 0:
            return
        raise HTTPException(status_code=403, detail="Немає доступу до файлу")

    raise HTTPException(status_code=403, detail="Access denied")


async def _link_student_user(db: AsyncSession, optimate_id: str) -> User | None:
    if not optimate_id:
        return None
    result = await db.execute(
        select(User).where(
            User.optimeit_id == optimate_id,
            User.role == UserRole.STUDENT,
        )
    )
    return result.scalar_one_or_none()


@router.post("/upload")
async def upload_homework_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.STUDENT):
        raise HTTPException(status_code=403, detail="Access denied")
    return await save_homework_upload(file)


@router.get("/files/{stored_name}")
async def download_homework_file(
    stored_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Access denied")
    path = resolve_homework_file(stored_name)
    await _assert_file_access(db, current_user, stored_name)
    return FileResponse(
        path,
        filename=display_filename(stored_name),
        media_type=guess_media_type(path),
    )


@router.get("/pending-count", response_model=HomeworkPendingCountOut)
async def homework_pending_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.STUDENT:
        oid = (current_user.optimeit_id or "").strip()
        student_match = [EventHomeworkSubmission.student_user_id == current_user.id]
        if oid:
            student_match.append(EventHomeworkSubmission.student_optimate_id == oid)
        q = select(func.count()).select_from(EventHomeworkSubmission).where(
            EventHomeworkSubmission.status.in_([
                EventHomeworkSubmissionStatus.ASSIGNED,
                EventHomeworkSubmissionStatus.VIEWED,
            ]),
            or_(*student_match),
        )
    elif current_user.role == UserRole.TEACHER:
        q = (
            select(func.count())
            .select_from(EventHomeworkSubmission)
            .join(EventHomeworkAssignment)
            .where(
                EventHomeworkAssignment.teacher_user_id == current_user.id,
                EventHomeworkSubmission.status == EventHomeworkSubmissionStatus.COMPLETED,
            )
        )
    else:
        return HomeworkPendingCountOut(count=0)

    result = await db.execute(q)
    return HomeworkPendingCountOut(count=int(result.scalar_one() or 0))


@router.get("/by-event/{event_id}", response_model=HomeworkAssignmentOut | None)
async def get_homework_by_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    assignment = await _get_assignment_by_event(db, event_id)
    if not assignment:
        return None
    if assignment.teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Це ДЗ іншого викладача")
    return _assignment_out(assignment)


@router.post("/assignments", response_model=HomeworkAssignmentOut)
async def upsert_homework_assignment(
    body: HomeworkAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    if not body.students:
        raise HTTPException(status_code=400, detail="Додайте хоча б одного учня")

    teacher_oid = await _teacher_optimate_id(current_user)
    assignment = await _get_assignment_by_event(db, body.optimate_event_id)

    if assignment and assignment.teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Це ДЗ іншого викладача")

    attachments_json = _attachments_to_json(body.teacher_attachments)
    title = body.title.strip() or body.event_title.strip() or "Домашнє завдання"

    if not assignment:
        assignment = EventHomeworkAssignment(
            optimate_event_id=body.optimate_event_id,
            teacher_user_id=current_user.id,
            teacher_optimate_id=teacher_oid,
            title=title,
            body_markdown=body.body_markdown,
            deadline_at=body.deadline_at,
            teacher_attachments_json=attachments_json,
            event_starts_at=body.event_starts_at,
            event_ends_at=body.event_ends_at,
            event_title=body.event_title,
        )
        db.add(assignment)
        await db.flush()
        existing_by_student: dict[str, EventHomeworkSubmission] = {}
    else:
        assignment.title = title
        assignment.body_markdown = body.body_markdown
        assignment.deadline_at = body.deadline_at
        assignment.teacher_attachments_json = attachments_json
        assignment.event_starts_at = body.event_starts_at
        assignment.event_ends_at = body.event_ends_at
        assignment.event_title = body.event_title
        assignment.updated_at = datetime.utcnow()
        existing_by_student = {s.student_optimate_id: s for s in assignment.submissions}
    incoming_ids = set()

    for ref in body.students:
        sid = ref.optimate_id.strip()
        if not sid:
            continue
        incoming_ids.add(sid)
        if sid in existing_by_student:
            if ref.name:
                existing_by_student[sid].student_name = ref.name
            continue
        portal_user = await _link_student_user(db, sid)
        db.add(EventHomeworkSubmission(
            assignment_id=assignment.id,
            student_optimate_id=sid,
            student_user_id=portal_user.id if portal_user else None,
            student_name=ref.name.strip() or (portal_user.full_name if portal_user else f"Учень {sid}"),
            status=EventHomeworkSubmissionStatus.ASSIGNED,
        ))

    await db.flush()
    await db.refresh(assignment, ["submissions"])
    return _assignment_out(assignment)


@router.get("/teacher", response_model=list[HomeworkAssignmentOut])
async def list_teacher_homework(
    filter: str = Query("all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(
        select(EventHomeworkAssignment)
        .options(selectinload(EventHomeworkAssignment.submissions))
        .where(EventHomeworkAssignment.teacher_user_id == current_user.id)
        .order_by(EventHomeworkAssignment.event_starts_at.desc())
    )
    assignments = list(result.scalars().all())

    if filter == "to_review":
        assignments = [
            a for a in assignments
            if any(s.status == EventHomeworkSubmissionStatus.COMPLETED for s in a.submissions)
        ]
    elif filter == "reviewed":
        assignments = [
            a for a in assignments
            if a.submissions and all(
                s.status == EventHomeworkSubmissionStatus.REVIEWED for s in a.submissions
            )
        ]

    return [_assignment_out(a) for a in assignments]


@router.get("/my", response_model=list[HomeworkStudentItemOut])
async def list_my_homework(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    oid = (current_user.optimeit_id or "").strip()
    student_match = [EventHomeworkSubmission.student_user_id == current_user.id]
    if oid:
        student_match.append(EventHomeworkSubmission.student_optimate_id == oid)
    result = await db.execute(
        select(EventHomeworkSubmission, EventHomeworkAssignment)
        .join(EventHomeworkAssignment)
        .where(or_(*student_match))
        .order_by(EventHomeworkAssignment.deadline_at.asc().nullslast())
    )
    rows = result.all()
    out: list[HomeworkStudentItemOut] = []
    for submission, assignment in rows:
        teacher = await db.get(User, assignment.teacher_user_id)
        teacher_name = teacher.full_name if teacher else ""
        out.append(_student_item(assignment, submission, teacher_name))
    return out


@router.get("/my/{submission_id}", response_model=HomeworkStudentItemOut)
async def get_my_homework(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    submission = await _get_submission_or_404(db, submission_id)
    assignment = submission.assignment
    oid = (current_user.optimeit_id or "").strip()
    allowed = (
        submission.student_user_id == current_user.id
        or (oid and submission.student_optimate_id == oid)
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied")

    if submission.status == EventHomeworkSubmissionStatus.ASSIGNED:
        submission.status = EventHomeworkSubmissionStatus.VIEWED
        submission.viewed_at = datetime.utcnow()
        if not submission.student_user_id:
            submission.student_user_id = current_user.id

    teacher = await db.get(User, assignment.teacher_user_id)
    return _student_item(assignment, submission, teacher.full_name if teacher else "")


@router.patch("/my/{submission_id}/complete", response_model=HomeworkStudentItemOut)
async def complete_homework(
    submission_id: int,
    body: HomeworkCompleteIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    submission = await _get_submission_or_404(db, submission_id)
    assignment = submission.assignment
    oid = (current_user.optimeit_id or "").strip()
    allowed = (
        submission.student_user_id == current_user.id
        or (oid and submission.student_optimate_id == oid)
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied")

    if submission.status == EventHomeworkSubmissionStatus.REVIEWED:
        raise HTTPException(status_code=400, detail="ДЗ вже перевірено")

    submission.student_answer_md = body.student_answer_md
    submission.student_file_url = body.student_file_url
    submission.status = EventHomeworkSubmissionStatus.COMPLETED
    submission.completed_at = datetime.utcnow()
    if not submission.viewed_at:
        submission.viewed_at = submission.completed_at
    if not submission.student_user_id:
        submission.student_user_id = current_user.id

    teacher = await db.get(User, assignment.teacher_user_id)
    return _student_item(assignment, submission, teacher.full_name if teacher else "")


@router.patch("/submissions/{submission_id}/review", response_model=HomeworkSubmissionOut)
async def review_homework(
    submission_id: int,
    body: HomeworkReviewIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    submission = await _get_submission_or_404(db, submission_id)
    assignment = submission.assignment
    if assignment.teacher_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if submission.status not in (
        EventHomeworkSubmissionStatus.COMPLETED,
        EventHomeworkSubmissionStatus.REVIEWED,
    ):
        raise HTTPException(status_code=400, detail="Учень ще не позначив ДЗ виконаним")

    submission.status = EventHomeworkSubmissionStatus.REVIEWED
    submission.teacher_review_note = body.teacher_review_note
    submission.reviewed_at = datetime.utcnow()
    return HomeworkSubmissionOut.model_validate(submission)
