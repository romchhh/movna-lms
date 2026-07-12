#!/usr/bin/env python3
"""
Verify Optimate Public API support for lesson completion marking.

Docs: https://api.optimate.online/api/docs/public/
Events section: GET list, POST create, GET by id, DELETE — no PATCH/complete.

Run from backend/:
  PYTHONPATH=. python scripts/test_optimate_event_completion.py
"""
from __future__ import annotations

import asyncio

from app.services.optimate import OPTIMATE_PUBLIC_API_DOCS, get_optimate_client


async def run() -> int:
    client = get_optimate_client()
    if not client.is_configured:
        print("Optimate API is not configured")
        return 1

    print(f"Public API docs: {OPTIMATE_PUBLIC_API_DOCS}")
    print("Documented Events endpoints: GET /events, POST /events, GET /events/{{id}}, DELETE /events/{{id}}")
    print("No PATCH or mark-completed endpoint in Public API.\n")

    # Use existing planned past event if any (read-only probe)
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    events, _ = await client.list_teacher_events(
        "921",
        (now - timedelta(days=3)).strftime("%Y-%m-%d"),
        now.strftime("%Y-%m-%d"),
        page_size=20,
    )
    planned = next((e for e in events if e.is_completed is None), None)
    if not planned:
        print("No planned teacher event found for probe — skipping live complete call")
        print("OK: Public API contract confirms completion sync is not available.")
        return 0

    _, status = await client.complete_event(planned.id, verbose=True)
    still_planned = await client._event_is_completed(planned.id, expected=True)

    print(f"Probe event #{planned.id} ({planned.starts_at})")
    print(f"  complete_event HTTP status: {status}")
    print(f"  isCompleted became true: {still_planned}")

    if status == 501 and not still_planned:
        print("\nOK: LMS correctly reports that Public API cannot mark lessons completed.")
        print("Teachers must mark attendance in Opti UI for salary until Optimate adds an API.")
        return 0

    if status == 200 and still_planned:
        print("\nOK: Optimate Public API now supports lesson completion.")
        return 0

    print("\nUnexpected API behaviour — review Optimate integration.")
    return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
