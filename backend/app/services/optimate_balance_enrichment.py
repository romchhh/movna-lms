"""Доповнення балансу учнів, коли Optimate не повертає purchased/used у financial."""
from __future__ import annotations

import asyncio
from typing import Any

from app.services.optimate import OptimateClient, ParsedTransaction
from app.services.optimate_labels import TRANSACTION_CREDIT_TYPES, TRANSACTION_DEBIT_TYPES
from app.services.optimate_parsers import _product_remaining_lessons

BALANCE_INCLUDE = "products,products.financial"
ENRICH_CONCURRENCY = 10
MAX_TRANSACTION_PAGES = 50


def unwrap_student_payload(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    data = raw.get("data") if isinstance(raw.get("data"), dict) else raw
    return data if isinstance(data, dict) else {}


def _financial_has_purchased_or_used(financial: dict[str, Any]) -> bool:
    purchased = OptimateClient._first_number(
        financial,
        "lessonsPurchased",
        "totalLessons",
        "purchasedLessons",
        "purchased",
        "initialBalance",
    )
    used = OptimateClient._first_number(
        financial,
        "lessonsUsed",
        "usedLessons",
        "chargedLessons",
        "used",
    )
    return purchased > 0 or used > 0


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
    remaining = _product_remaining_lessons(product)
    if remaining <= 0:
        return False
    financial = product.get("financial") if isinstance(product.get("financial"), dict) else {}
    if not _product_has_financial(product):
        return True
    if not _financial_has_purchased_or_used(financial):
        return True
    purchased = OptimateClient._first_number(
        financial,
        "lessonsPurchased",
        "totalLessons",
        "purchasedLessons",
        "purchased",
    )
    used = OptimateClient._first_number(
        financial,
        "lessonsUsed",
        "usedLessons",
        "chargedLessons",
        "used",
    )
    if purchased > 0 and used <= 0 and abs(purchased - remaining) < 0.001:
        return True
    return False


def student_needs_balance_enrichment(item: dict[str, Any]) -> bool:
    """Потрібне доповнення, якщо є залишок, але немає purchased/used у financial."""
    products = item.get("products") or []
    if not isinstance(products, list) or not products:
        return False
    return any(_product_financial_incomplete(p) for p in products if isinstance(p, dict))


def merge_student_balance_fields(partial: dict[str, Any], full: dict[str, Any]) -> dict[str, Any]:
    merged = dict(partial)
    full_data = unwrap_student_payload(full)
    full_products = full_data.get("products")
    if isinstance(full_products, list) and full_products:
        merged["products"] = full_products
    if full_data.get("remainingLessonCount") is not None:
        merged["remainingLessonCount"] = full_data.get("remainingLessonCount")
    if full_data.get("plannedLessonCount") is not None:
        merged["plannedLessonCount"] = full_data.get("plannedLessonCount")
    if full_data.get("completedLessonCount") is not None:
        merged["completedLessonCount"] = full_data.get("completedLessonCount")
    return merged


async def fetch_all_student_transactions(
    client: OptimateClient,
    student_id: str,
) -> list[ParsedTransaction]:
    all_txs: list[ParsedTransaction] = []
    page = 1
    page_size = 100
    while page <= MAX_TRANSACTION_PAGES:
        items, total = await client.get_student_transactions(
            student_id,
            page_number=page,
            page_size=page_size,
        )
        all_txs.extend(items)
        if not items or page * page_size >= total:
            break
        page += 1
    return all_txs


def aggregate_lessons_by_product(
    transactions: list[ParsedTransaction],
) -> dict[str, dict[str, float]]:
    by_product: dict[str, dict[str, float]] = {}
    for tx in transactions:
        product_id = str(tx.product_id or "").strip()
        if not product_id:
            continue
        bucket = by_product.setdefault(product_id, {"purchased": 0.0, "used": 0.0})
        if tx.type in TRANSACTION_CREDIT_TYPES:
            bucket["purchased"] += tx.lesson_count
        elif tx.type in TRANSACTION_DEBIT_TYPES:
            bucket["used"] += tx.lesson_count
    return by_product


def apply_transaction_lessons_to_student(
    item: dict[str, Any],
    by_product: dict[str, dict[str, float]],
) -> dict[str, Any]:
    if not by_product:
        return item

    merged = dict(item)
    products = merged.get("products")
    if not isinstance(products, list):
        return merged

    new_products: list[Any] = []
    for product in products:
        if not isinstance(product, dict):
            new_products.append(product)
            continue

        updated = dict(product)
        product_id = str(updated.get("productId") or updated.get("id") or "")
        totals = by_product.get(product_id)
        if totals and (totals["purchased"] > 0 or totals["used"] > 0):
            financial = (
                dict(updated.get("financial") or {})
                if isinstance(updated.get("financial"), dict)
                else {}
            )
            if totals["purchased"] > 0:
                financial["lessonsPurchased"] = totals["purchased"]
            if totals["used"] > 0:
                financial["lessonsUsed"] = totals["used"]
            updated["financial"] = financial
        new_products.append(updated)

    merged["products"] = new_products
    return merged


async def enrich_student_from_transactions(
    client: OptimateClient,
    student_id: str,
    item: dict[str, Any],
) -> dict[str, Any]:
    if not student_needs_balance_enrichment(item):
        return item
    transactions = await fetch_all_student_transactions(client, student_id)
    by_product = aggregate_lessons_by_product(transactions)
    return apply_transaction_lessons_to_student(item, by_product)


async def enrich_student_balance_data(
    client: OptimateClient,
    student_id: str,
    item: dict[str, Any],
) -> dict[str, Any]:
    """Повне доповнення балансу: financial з профілю + purchased/used з транзакцій."""
    enriched = item
    if student_needs_balance_enrichment(enriched):
        full = await client.get_student_by_id(student_id, include=BALANCE_INCLUDE)
        if isinstance(full, dict):
            enriched = merge_student_balance_fields(enriched, full)
    if student_needs_balance_enrichment(enriched):
        enriched = await enrich_student_from_transactions(client, student_id, enriched)
    return enriched


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
            enriched[idx] = await enrich_student_balance_data(client, student_id, item)

    await asyncio.gather(*(fetch_one(i) for i in indices))
    return enriched
