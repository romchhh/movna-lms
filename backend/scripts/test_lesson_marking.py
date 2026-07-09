"""
API test for teacher lesson marking (complete / not-held).

Uses seed test teacher teacher@movna.ua — synthetic event IDs only (no real Optimate lessons).

Run from backend/:
  PYTHONPATH=. python scripts/test_lesson_marking.py

Optional:
  API_BASE=http://127.0.0.1:8000 python scripts/test_lesson_marking.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from app.core.database import AsyncSessionLocal, init_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User, UserRole
from app.services.password_vault import encrypt_login_password
from app.services.teacher_event_sync import get_event_marks_map

TEST_TEACHER_EMAIL = "teacher@movna.ua"
TEST_TEACHER_PASSWORD = "teacher123"
TEST_TEACHER_OPTIMATE_ID = "test-teacher-api"
API_BASE = os.getenv("API_BASE", "").rstrip("/")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _ensure_test_teacher(db) -> tuple[User, str | None]:
    """Ensure seed teacher exists and has optimate id for API routes."""
    result = await db.execute(select(User).where(User.email == TEST_TEACHER_EMAIL))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email=TEST_TEACHER_EMAIL,
            hashed_password=hash_password(TEST_TEACHER_PASSWORD),
            login_password_enc=encrypt_login_password(TEST_TEACHER_PASSWORD),
            first_name="Марія",
            last_name="Іваненко",
            role=UserRole.TEACHER,
            is_active=True,
        )
        db.add(user)
        await db.flush()

    previous_optimate_id = user.optimeit_id or None
    if user.optimeit_id != TEST_TEACHER_OPTIMATE_ID:
        user.optimeit_id = TEST_TEACHER_OPTIMATE_ID
        await db.commit()
    else:
        await db.commit()

    return user, previous_optimate_id


async def _restore_optimate_id(user_id: int, previous: str | None) -> None:
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if not user:
            return
        user.optimeit_id = previous or ""
        await db.commit()


async def _client():
    if API_BASE:
        return httpx.AsyncClient(base_url=API_BASE, timeout=60.0)
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test", timeout=60.0)


async def run() -> int:
    await init_db()
    failures: list[str] = []
    passed: list[str] = []

    async with AsyncSessionLocal() as db:
        teacher, previous_optimate_id = await _ensure_test_teacher(db)
        token = create_access_token(teacher.id, teacher.role.value, teacher.optimeit_id)
        print(f"Test teacher: {teacher.email} (id={teacher.id}, optimate={teacher.optimeit_id})")
        print(f"API: {API_BASE or 'ASGI (in-process)'}")

    ts = int(_now().timestamp())
    complete_id = f"test-complete-{ts}"
    not_held_id = f"test-not-held-{ts}"

    try:
        async with await _client() as client:
            # Login endpoint (may fail if Optimate verify on — informational only)
            login = await client.post(
                "/api/auth/login",
                json={"email": TEST_TEACHER_EMAIL, "password": TEST_TEACHER_PASSWORD},
            )
            if login.status_code == 200 and login.json().get("access_token"):
                passed.append("login: teacher@movna.ua / teacher123 OK")
            else:
                passed.append(
                    f"login: skipped ({login.status_code} — using JWT for API test)"
                )

            # 1. not-held-reasons
            r = await client.get(
                "/api/teacher/optimate/not-held-reasons",
                headers=_auth_headers(token),
            )
            if r.status_code != 200:
                failures.append(f"not-held-reasons: HTTP {r.status_code} {r.text}")
            else:
                reasons = r.json()
                expected_codes = {
                    "student_absent",
                    "cancelled_by_teacher",
                    "cancelled_by_student_on_time",
                    "cancelled_by_student_late",
                    "force_majeure",
                }
                codes = {item["code"] for item in reasons}
                labels = {item["label"] for item in reasons}
                if codes != expected_codes:
                    failures.append(f"not-held-reasons: unexpected codes {codes}")
                elif "Студент відсутній" not in labels:
                    failures.append(f"not-held-reasons: missing Ukrainian labels")
                else:
                    passed.append(f"not-held-reasons: {len(reasons)} reasons OK")

            # 2. mark completed (synthetic event)
            r = await client.post(
                f"/api/teacher/optimate/events/{complete_id}/complete",
                headers=_auth_headers(token),
                json={"note": "api autotest"},
            )
            if r.status_code != 200:
                failures.append(f"complete: HTTP {r.status_code} {r.text}")
            else:
                body = r.json()
                if not body.get("ok"):
                    failures.append(f"complete: ok=false {body}")
                else:
                    passed.append(
                        f"POST /complete: {body.get('message')} "
                        f"(optimate_synced={body.get('optimate_synced')})"
                    )

            async with AsyncSessionLocal() as db:
                marks = await get_event_marks_map(db, [complete_id])
                row = marks.get(complete_id)
                if not row or row.outcome != "completed":
                    failures.append(f"LMS complete mark: {row}")
                elif row.teacher_optimate_id != TEST_TEACHER_OPTIMATE_ID:
                    failures.append(f"LMS complete teacher id: {row.teacher_optimate_id}")
                else:
                    passed.append(
                        f"LMS complete: outcome={row.outcome}, note={row.note!r}"
                    )

            r = await client.get(
                f"/api/teacher/optimate/events/{complete_id}/cancellation",
                headers=_auth_headers(token),
            )
            if r.status_code != 200:
                failures.append(f"GET cancellation (complete): HTTP {r.status_code}")
            else:
                data = r.json()
                if data.get("outcome") != "completed":
                    failures.append(f"GET cancellation (complete): {data}")
                else:
                    passed.append(
                        f"GET cancellation (complete): {data.get('reason_label')}"
                    )

            # 3. mark not-held (synthetic event)
            r = await client.post(
                f"/api/teacher/optimate/events/{not_held_id}/not-held",
                headers=_auth_headers(token),
                json={"reason_code": "cancelled_by_teacher", "note": "api autotest"},
            )
            if r.status_code != 200:
                failures.append(f"not-held: HTTP {r.status_code} {r.text}")
            else:
                body = r.json()
                passed.append(
                    f"POST /not-held: {body.get('message')} "
                    f"(optimate_synced={body.get('optimate_synced')})"
                )

            async with AsyncSessionLocal() as db:
                marks = await get_event_marks_map(db, [not_held_id])
                row = marks.get(not_held_id)
                if not row or row.outcome != "not_held":
                    failures.append(f"LMS not-held mark: {row}")
                elif row.reason_code != "cancelled_by_teacher":
                    failures.append(f"LMS not-held reason: {row.reason_code}")
                else:
                    passed.append(
                        f"LMS not-held: {row.reason_label}, note={row.note!r}"
                    )

            # 4. invalid reason → 400
            r = await client.post(
                f"/api/teacher/optimate/events/{not_held_id}/not-held",
                headers=_auth_headers(token),
                json={"reason_code": "invalid_reason"},
            )
            if r.status_code != 400:
                failures.append(f"invalid reason: expected 400, got {r.status_code}")
            else:
                passed.append("invalid reason: rejected with 400")

            # 5. unauthorized without token
            r = await client.get("/api/teacher/optimate/not-held-reasons")
            if r.status_code not in (401, 403):
                failures.append(f"auth guard: expected 401/403, got {r.status_code}")
            else:
                passed.append(f"auth guard: HTTP {r.status_code} without token")

            # 6. update existing mark: complete → not_held on same id
            r = await client.post(
                f"/api/teacher/optimate/events/{complete_id}/not-held",
                headers=_auth_headers(token),
                json={"reason_code": "force_majeure"},
            )
            if r.status_code != 200:
                failures.append(f"mark update: HTTP {r.status_code} {r.text}")
            else:
                async with AsyncSessionLocal() as db:
                    marks = await get_event_marks_map(db, [complete_id])
                    row = marks.get(complete_id)
                    if not row or row.outcome != "not_held" or row.reason_code != "force_majeure":
                        failures.append(f"mark update in DB: {row}")
                    else:
                        passed.append("mark update: completed → not_held (same event id)")

    finally:
        await _restore_optimate_id(teacher.id, previous_optimate_id)

    _report(passed, failures)
    return 1 if failures else 0


def _report(passed: list[str], failures: list[str]) -> None:
    print("\n=== PASSED ===")
    for line in passed:
        print(f"  ✓ {line}")
    if failures:
        print("\n=== FAILED ===")
        for line in failures:
            print(f"  ✗ {line}")
    else:
        print("\nAll API checks passed.")


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
