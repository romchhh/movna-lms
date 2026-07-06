"""Доповнення балансу учнів, коли list API не повертає products.financial."""
from __future__ import annotations

import asyncio
from typing import Any

from app.services.optimate import OptimateClient
from app.services.optimate_parsers import (
    _product_remaining_lessons,
    normalize_lesson_counts,
)

BALANCE_INCLUDE = "products,products.financial"
ENRICH_CONCURRENCY = 10


def _product_has_financial(product: dict[str, Any]) -> bool:
    financial = product.get("financial")
    if not isinstance(financial, dict) or not financial:
        return False
    for key in ("lessonsRemaining", "remainingLessons", "remaining", "availableLessons"):
        if financial.get(key) is not None:
            return True
    return False


def _product_financial_incomplete(product: dict[str, Any]) -> bool:
    if not isinstance(product, dict):
        return False
    if not _product_has_financial(product):
        return True
    financial = product.get("financial") if isinstance(product.get("financial"), dict) else {}
    remaining = _product_remaining_lessons(product)
    total = OptimateClient._first_number(
        financial,
        "lessonsPurchased",
        "totalLessons",
        "purchasedLessons",
        "purchased",
    )
    used = OptimateClient._first_number(financial, "lessonsUsed", "usedLessons", "used")
    _, total_n, used_n = normalize_lesson_counts(remaining, total, used)
    return remaining > 0 and total_n <= 0 and used_n <= 0


def student_needs_balance_enrichment(item: dict[str, Any]) -> bool:
    """List-відповідь без financial або без purchased/used при наявному залишку."""
    products = item.get("products") or []
    if not isinstance(products, list) or not products:
        return False
    return any(_product_financial_incomplete(p) for p in products if isinstance(p, dict))


def merge_student_balance_fields(partial: dict[str, Any], full: dict[str, Any]) -> dict[str, Any]:
    merged = dict(partial)
    full_products = full.get("products")
    if isinstance(full_products, list) and full_products:
        merged["products"] = full_products
    if full.get("remainingLessonCount") is not None:
        merged["remainingLessonCount"] = full.get("remainingLessonCount")
    if full.get("plannedLessonCount") is not None:
        merged["plannedLessonCount"] = full.get("plannedLessonCount")
    if full.get("completedLessonCount") is not None:
        merged["completedLessonCount"] = full.get("completedLessonCount")
    return merged


async def enrich_students_balances(
    client: OptimateClient,
    items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not items:
        return items

    indices = [i for i, item in enumerate(items) if student_needs_balance_enrichment(item)]
    if not indices:
        return items

    sem = asyncio.Semaphore(ENRICH_CONCURRENCY)
    enriched = list(items)

    async def fetch_one(idx: int) -> None:
        item = items[idx]
        student_id = str(item.get("id") or "").strip()
        if not student_id:
            return
        async with sem:
            full = await client.get_student_by_id(student_id, include=BALANCE_INCLUDE)
        if isinstance(full, dict):
            enriched[idx] = merge_student_balance_fields(item, full)

    await asyncio.gather(*(fetch_one(i) for i in indices))
    return enriched
