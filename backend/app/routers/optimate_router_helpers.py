"""Shared helpers for Optimate API routers."""

from datetime import datetime, timezone

from fastapi import HTTPException

from app.schemas.optimate import CacheMeta, TeacherTransactionOut
from app.services.optimate import get_optimate_client


def cache_meta(cached_at: float, from_cache: bool) -> CacheMeta:
    return CacheMeta(
        cached=from_cache,
        synced_at=datetime.fromtimestamp(cached_at, tz=timezone.utc),
    )


def ensure_optimate_configured() -> None:
    if not get_optimate_client().is_configured:
        raise HTTPException(status_code=503, detail="Optimate API не налаштовано")


def teacher_transaction_out(item) -> TeacherTransactionOut:
    return TeacherTransactionOut(
        id=item.id,
        type=item.type,
        type_label=item.type_label,
        amount=item.amount,
        signed_amount=item.signed_amount,
        description=item.description,
        transaction_date=item.transaction_date,
        created_at=item.created_at,
        product_id=item.product_id,
        product_name=item.product_name,
        product_type=item.product_type,
        lesson_id=item.lesson_id,
        is_trial=item.is_trial,
        period_start_date=item.period_start_date,
        period_end_date=item.period_end_date,
        salary_invoice_id=item.salary_invoice_id,
        student_names=list(item.student_names),
        is_credit=item.is_credit,
    )
