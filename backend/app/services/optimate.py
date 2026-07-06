"""
Optimate CRM API client.

Перевіряє наявність студента / викладача за email або телефоном
через публічні ендпоінти /api/v1/students та /api/v1/teachers.
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.services.optimate_labels import (
    COMPLETION_LABELS,
    PRODUCT_TYPE_LABELS,
    TEACHER_TRANSACTION_TYPE_LABELS,
    TRANSACTION_CREDIT_TYPES,
    TRANSACTION_DEBIT_TYPES,
    TRANSACTION_TYPE_LABELS,
)


@dataclass
class ParsedContact:
    id: int
    full_name: str
    first_name: str
    last_name: str
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    phones_raw: tuple[str, ...]
    emails_raw: tuple[str, ...]


@dataclass
class ProductBalance:
    product_id: str
    product_name: str
    product_type: int
    product_type_label: str
    lessons_remaining: float
    lessons_total: float
    lessons_used: float
    price_per_lesson: Optional[float] = None


@dataclass
class ParsedTransaction:
    id: str
    type: int
    type_label: str
    amount: float
    lesson_count: float
    description: Optional[str]
    transaction_date: Optional[str]
    created_at: Optional[str]
    product_id: Optional[str]
    product_name: Optional[str]
    product_type: Optional[int]
    is_credit: bool


@dataclass
class ParsedTeacherTransaction:
    id: str
    type: int
    type_label: str
    amount: float
    signed_amount: float
    description: Optional[str]
    transaction_date: Optional[str]
    created_at: Optional[str]
    product_id: Optional[str]
    product_name: Optional[str]
    product_type: Optional[int]
    lesson_id: Optional[str]
    is_trial: Optional[bool]
    period_start_date: Optional[str]
    period_end_date: Optional[str]
    salary_invoice_id: Optional[str]
    student_names: tuple[str, ...]
    is_credit: bool


@dataclass
class ParsedEvent:
    id: str
    event_type: int
    starts_at: str
    ends_at: str
    duration: int
    product_id: Optional[str]
    product_name: Optional[str]
    product_type: Optional[int]
    product_type_label: Optional[str]
    teacher_name: Optional[str]
    is_trial: bool
    is_completed: Optional[bool]
    completion_label: str
    schedule_class: str
    student_names: tuple[str, ...] = ()
    student_ids: tuple[str, ...] = ()
    teacher_names: tuple[str, ...] = ()
    teacher_ids: tuple[str, ...] = ()


_TOKEN_CACHE: dict[str, tuple[str, float]] = {}


class OptimateClient:
    """HTTP-клієнт для Public API Optimate (api.optimate.online)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> None:
        self.base_url = (base_url or settings.optimate_public_base_url).rstrip("/")
        self.api_key = api_key or settings.optimate_api_key

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def _fetch_access_token(self) -> Optional[str]:
        url = f"{self.base_url}/api/v1/auth/token"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json={"apiKey": self.api_key},
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, dict):
                    return None
                token = data.get("accessToken")
                if not token:
                    return None
                expires_in = int(data.get("expiresIn") or 3600)
                _TOKEN_CACHE[self.api_key] = (str(token), time.time() + expires_in)
                return str(token)
        except httpx.HTTPError:
            return None

    async def _get_access_token(self, *, force_refresh: bool = False) -> Optional[str]:
        if not force_refresh:
            cached = _TOKEN_CACHE.get(self.api_key)
            if cached and cached[1] > time.time() + 30:
                return cached[0]
        return await self._fetch_access_token()

    async def _auth_headers(self, *, force_refresh: bool = False) -> Optional[dict[str, str]]:
        token = await self._get_access_token(force_refresh=force_refresh)
        if not token:
            return None
        return {
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        }

    async def _get(
        self,
        path: str,
        params: Optional[dict[str, Any]] = None,
        verbose: bool = False,
    ) -> Optional[dict[str, Any]]:
        if not self.is_configured:
            return None

        url = f"{self.base_url}{path}"
        for attempt, force_refresh in enumerate((False, True)):
            headers = await self._auth_headers(force_refresh=force_refresh)
            if not headers:
                return None
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(url, params=params, headers=headers)
                    if response.status_code == 401 and attempt == 0:
                        _TOKEN_CACHE.pop(self.api_key, None)
                        continue
                    response.raise_for_status()
                    data = response.json()
                    return data if isinstance(data, dict) else None
            except httpx.HTTPError as exc:
                if verbose:
                    print(f"[Optimate] GET {path} failed: {exc}")
                return None
        return None

    async def _post(
        self,
        path: str,
        body: dict[str, Any],
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        if not self.is_configured:
            return None, 503

        url = f"{self.base_url}{path}"
        for attempt, force_refresh in enumerate((False, True)):
            headers = await self._auth_headers(force_refresh=force_refresh)
            if not headers:
                return None, 503
            headers["Content-Type"] = "application/json"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=body, headers=headers)
                    if response.status_code == 401 and attempt == 0:
                        _TOKEN_CACHE.pop(self.api_key, None)
                        continue
                    if response.status_code >= 400:
                        if verbose:
                            print(f"[Optimate] POST {path} failed: {response.status_code} {response.text}")
                        try:
                            data = response.json()
                            return (data if isinstance(data, dict) else None), response.status_code
                        except Exception:
                            return None, response.status_code
                    data = response.json()
                    return (data if isinstance(data, dict) else {}), response.status_code
            except httpx.HTTPError as exc:
                if verbose:
                    print(f"[Optimate] POST {path} failed: {exc}")
                return None, 502
        return None, 502

    async def _delete(
        self,
        path: str,
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        if not self.is_configured:
            return None, 503

        url = f"{self.base_url}{path}"
        for attempt, force_refresh in enumerate((False, True)):
            headers = await self._auth_headers(force_refresh=force_refresh)
            if not headers:
                return None, 503
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.delete(url, headers=headers)
                    if response.status_code == 401 and attempt == 0:
                        _TOKEN_CACHE.pop(self.api_key, None)
                        continue
                    if response.status_code >= 400:
                        if verbose:
                            print(f"[Optimate] DELETE {path} failed: {response.status_code} {response.text}")
                        try:
                            data = response.json()
                            return (data if isinstance(data, dict) else None), response.status_code
                        except Exception:
                            return None, response.status_code
                    if response.content:
                        try:
                            data = response.json()
                            return (data if isinstance(data, dict) else {}), response.status_code
                        except Exception:
                            pass
                    return {}, response.status_code
            except httpx.HTTPError as exc:
                if verbose:
                    print(f"[Optimate] DELETE {path} failed: {exc}")
                return None, 502
        return None, 502

    async def _patch(
        self,
        path: str,
        body: dict[str, Any],
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        """PATCH до Optimate. Повертає (json або None, http status)."""
        if not self.is_configured:
            return None, 503

        url = f"{self.base_url}{path}"
        for attempt, force_refresh in enumerate((False, True)):
            headers = await self._auth_headers(force_refresh=force_refresh)
            if not headers:
                return None, 503
            headers["Content-Type"] = "application/json"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.patch(url, json=body, headers=headers)
                    if response.status_code == 401 and attempt == 0:
                        _TOKEN_CACHE.pop(self.api_key, None)
                        continue
                    if response.status_code == 404:
                        return None, 404
                    if response.status_code >= 400:
                        if verbose:
                            print(f"[Optimate] PATCH {path} failed: {response.status_code} {response.text}")
                        return None, response.status_code
                    data = response.json()
                    return (data if isinstance(data, dict) else {}), 200
            except httpx.HTTPError as exc:
                if verbose:
                    print(f"[Optimate] PATCH {path} failed: {exc}")
                return None, 502
        return None, 502

    async def update_student(
        self,
        student_id: str | int,
        payload: dict[str, Any],
        *,
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        return await self._patch(
            f"/api/v1/students/{student_id}",
            payload,
            verbose=verbose,
        )

    async def update_teacher(
        self,
        teacher_id: str | int,
        payload: dict[str, Any],
        *,
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        return await self._patch(
            f"/api/v1/teachers/{teacher_id}",
            payload,
            verbose=verbose,
        )

    @staticmethod
    def _normalize_phone(phone: Optional[str]) -> str:
        if not phone:
            return ""
        digits = re.sub(r"\D", "", phone)
        if digits.startswith("380"):
            return digits
        if digits.startswith("0") and len(digits) == 10:
            return "38" + digits
        if len(digits) == 9:
            return "380" + digits
        return digits

    @staticmethod
    def _normalize_email(email: Optional[str]) -> str:
        return (email or "").strip().lower()

    @staticmethod
    def _contact_matches_phone(contact: ParsedContact, phone_norm: str) -> bool:
        if not phone_norm:
            return False
        for raw in contact.phones_raw:
            if OptimateClient._normalize_phone(raw) == phone_norm:
                return True
        return OptimateClient._normalize_phone(contact.phone) == phone_norm

    @staticmethod
    def _contact_matches_email(contact: ParsedContact, email_norm: str) -> bool:
        if not email_norm:
            return False
        for raw in contact.emails_raw:
            if raw.strip().lower() == email_norm:
                return True
        return (contact.email or "").strip().lower() == email_norm

    def _parse_contacts(self, contacts: Any) -> tuple[list[str], list[str], Optional[str], Optional[str]]:
        phones: list[str] = []
        emails: list[str] = []
        phone_val: Optional[str] = None
        email_val: Optional[str] = None

        if not isinstance(contacts, list):
            return phones, emails, phone_val, email_val

        for contact in contacts:
            if not isinstance(contact, dict):
                continue
            contact_type = str(contact.get("type") or "").lower()
            value = contact.get("value")
            if not value:
                continue
            if contact_type == "phone":
                sv = str(value).strip()
                if sv:
                    phones.append(sv)
                    phone_val = phone_val or sv
            elif contact_type in ("email", "mail"):
                ev = str(value).strip()
                if ev:
                    emails.append(ev)
                    email_val = email_val or ev

        return phones, emails, phone_val, email_val

    def _parse_student_item(self, item: dict[str, Any]) -> ParsedContact:
        contacts = item.get("contacts") or []
        phones, emails, phone_val, email_val = self._parse_contacts(contacts)

        try:
            entity_id = int(item.get("id") or item.get("Id") or 0)
        except (TypeError, ValueError):
            entity_id = 0

        first_name = (item.get("firstName") or "").strip()
        last_name = (item.get("lastName") or "").strip()
        full_name = f"{first_name} {last_name}".strip() or "—"

        return ParsedContact(
            id=entity_id,
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            phone=phone_val,
            email=email_val,
            is_active=item.get("status") == 1,
            phones_raw=tuple(phones),
            emails_raw=tuple(emails),
        )

    def _parse_teacher_item(self, item: dict[str, Any]) -> ParsedContact:
        return self._parse_student_item(item)

    async def _load_students_page(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        page_number: int = 1,
        page_size: int = 50,
        verbose: bool = False,
    ) -> list[ParsedContact]:
        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "include": "contacts",
        }
        contacts_filter: Optional[str] = None
        if phone:
            contacts_filter = phone.strip()
        elif email:
            contacts_filter = email.strip()
        if contacts_filter:
            params["contacts"] = contacts_filter

        raw = await self._get("/api/v1/students", params=params, verbose=verbose)
        if not raw:
            return []

        items = raw.get("data") or []
        if not isinstance(items, list):
            return []

        return [self._parse_student_item(item) for item in items if isinstance(item, dict)]

    async def _load_teachers_page(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        page_number: int = 1,
        page_size: int = 50,
        verbose: bool = False,
    ) -> list[ParsedContact]:
        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "include": "contacts",
        }
        contacts_filter: Optional[str] = None
        if phone:
            contacts_filter = phone.strip()
        elif email:
            contacts_filter = email.strip()
        if contacts_filter:
            params["contacts"] = contacts_filter

        raw = await self._get("/api/v1/teachers", params=params, verbose=verbose)
        if not raw:
            return []

        items = raw.get("data") or []
        if not isinstance(items, list):
            return []

        return [self._parse_teacher_item(item) for item in items if isinstance(item, dict)]

    async def find_student_by_contacts(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        verbose: bool = False,
    ) -> Optional[ParsedContact]:
        """
        Шукає студента за телефоном або email.
        Спочатку перевіряється телефон, потім email.
        """
        phone_norm = self._normalize_phone(phone)
        email_norm = self._normalize_email(email)

        if not phone_norm and not email_norm:
            return None

        if phone_norm:
            by_phone = await self._load_students_page(
                phone=(phone or "").strip(),
                email=None,
                verbose=verbose,
            )
            for student in by_phone:
                if self._contact_matches_phone(student, phone_norm):
                    return student

        if email_norm:
            by_email = await self._load_students_page(
                phone=None,
                email=email_norm,
                verbose=verbose,
            )
            for student in by_email:
                if self._contact_matches_email(student, email_norm):
                    return student

        return None

    async def find_teacher_by_contacts(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        verbose: bool = False,
    ) -> Optional[ParsedContact]:
        """Шукає викладача за телефоном або email."""
        phone_norm = self._normalize_phone(phone)
        email_norm = self._normalize_email(email)

        if not phone_norm and not email_norm:
            return None

        if phone_norm:
            by_phone = await self._load_teachers_page(
                phone=(phone or "").strip(),
                email=None,
                verbose=verbose,
            )
            for teacher in by_phone:
                if self._contact_matches_phone(teacher, phone_norm):
                    return teacher

        if email_norm:
            by_email = await self._load_teachers_page(
                phone=None,
                email=email_norm,
                verbose=verbose,
            )
            for teacher in by_email:
                if self._contact_matches_email(teacher, email_norm):
                    return teacher

        return None

    async def resolve_role_by_email(self, email: str) -> tuple[Optional[str], Optional[ParsedContact]]:
        """
        Визначає роль за email у Optimate.
        Повертає ('student' | 'teacher', contact) або (None, None).
        """
        email_norm = self._normalize_email(email)
        if not email_norm:
            return None, None

        student = await self.find_student_by_contacts(email=email_norm)
        if student:
            return "student", student

        teacher = await self.find_teacher_by_contacts(email=email_norm)
        if teacher:
            return "teacher", teacher

        return None, None

    @staticmethod
    def _first_number(data: dict[str, Any], *keys: str) -> float:
        for key in keys:
            val = data.get(key)
            if val is not None:
                try:
                    return float(val)
                except (TypeError, ValueError):
                    continue
        return 0.0

    def _parse_product_balances(self, student_data: dict[str, Any]) -> list[ProductBalance]:
        products = student_data.get("products") or []
        if not isinstance(products, list):
            return []

        balances: list[ProductBalance] = []
        for product in products:
            if not isinstance(product, dict):
                continue

            financial = product.get("financial") or {}
            if not isinstance(financial, dict):
                financial = {}

            remaining = self._first_number(
                financial,
                "lessonsRemaining",
                "remainingLessons",
                "remaining",
                "balance",
                "availableLessons",
            )
            total = self._first_number(
                financial,
                "lessonsPurchased",
                "totalLessons",
                "purchasedLessons",
                "purchased",
                "initialBalance",
            )
            used = self._first_number(
                financial,
                "lessonsUsed",
                "usedLessons",
                "chargedLessons",
                "used",
            )

            from app.services.optimate_parsers import normalize_lesson_counts
            remaining, total, used = normalize_lesson_counts(remaining, total, used)

            product_type = int(product.get("productType") or product.get("type") or 0)
            product_id = str(product.get("productId") or product.get("id") or "")
            product_name = (
                product.get("productName")
                or product.get("name")
                or PRODUCT_TYPE_LABELS.get(product_type, "Продукт")
            )

            price_raw = financial.get("pricePerLesson", product.get("pricePerLesson"))
            price_per_lesson: Optional[float] = None
            if price_raw is not None:
                try:
                    price_per_lesson = float(price_raw)
                except (TypeError, ValueError):
                    price_per_lesson = None

            balances.append(
                ProductBalance(
                    product_id=product_id,
                    product_name=str(product_name),
                    product_type=product_type,
                    product_type_label=PRODUCT_TYPE_LABELS.get(product_type, "Інше"),
                    lessons_remaining=remaining,
                    lessons_total=total,
                    lessons_used=used,
                    price_per_lesson=price_per_lesson,
                )
            )

        return balances

    def _parse_transaction(self, item: dict[str, Any]) -> ParsedTransaction:
        tx_type = int(item.get("type") or 0)
        lesson_count = self._first_number(item, "lessonCount")
        return ParsedTransaction(
            id=str(item.get("id") or ""),
            type=tx_type,
            type_label=TRANSACTION_TYPE_LABELS.get(tx_type, f"Тип {tx_type}"),
            amount=self._first_number(item, "amount"),
            lesson_count=lesson_count,
            description=item.get("description"),
            transaction_date=item.get("transactionDate"),
            created_at=item.get("createdAt"),
            product_id=str(item.get("productId")) if item.get("productId") is not None else None,
            product_name=item.get("productName"),
            product_type=int(item["productType"]) if item.get("productType") is not None else None,
            is_credit=tx_type not in TRANSACTION_DEBIT_TYPES,
        )

    def _parse_event(self, item: dict[str, Any]) -> ParsedEvent:
        is_completed = item.get("isCompleted")
        if is_completed is True:
            completion_label = COMPLETION_LABELS["completed"]
        elif is_completed is False:
            completion_label = COMPLETION_LABELS["cancelled"]
        else:
            completion_label = COMPLETION_LABELS["planned"]

        product = item.get("product") if isinstance(item.get("product"), dict) else {}
        product_type = item.get("productType") or product.get("productType")
        product_type_int = int(product_type) if product_type is not None else None

        teacher_name: Optional[str] = None
        teacher_names: list[str] = []
        teacher_ids: list[str] = []
        teachers = item.get("teachers")
        if isinstance(teachers, list) and teachers:
            for teacher in teachers:
                if not isinstance(teacher, dict):
                    continue
                tid = str(teacher.get("id") or "")
                if tid:
                    teacher_ids.append(tid)
                fn = (teacher.get("firstName") or "").strip()
                ln = (teacher.get("lastName") or "").strip()
                name = f"{fn} {ln}".strip() or (teacher.get("name") or "").strip()
                if name:
                    teacher_names.append(name)
            if teacher_names and not teacher_name:
                teacher_name = teacher_names[0]
        elif isinstance(item.get("teacher"), dict):
            t = item["teacher"]
            tid = str(t.get("id") or "")
            if tid:
                teacher_ids.append(tid)
            fn = (t.get("firstName") or "").strip()
            ln = (t.get("lastName") or "").strip()
            teacher_name = f"{fn} {ln}".strip()
            if teacher_name:
                teacher_names.append(teacher_name)

        product_name = item.get("productName") or product.get("productName") or product.get("name")

        student_names: list[str] = []
        student_ids: list[str] = []
        for student in item.get("students") or []:
            if not isinstance(student, dict):
                continue
            sid = str(student.get("id") or "")
            if sid:
                student_ids.append(sid)
            name = (student.get("name") or "").strip()
            if not name:
                fn = (student.get("firstName") or "").strip()
                ln = (student.get("lastName") or "").strip()
                name = f"{fn} {ln}".strip()
            if name:
                student_names.append(name)

        schedule_class = "individual"
        if product_type_int == 2:
            schedule_class = "group"
        elif product_type_int == 3:
            schedule_class = "speaking_club"
        elif product_type_int == 4:
            schedule_class = "pair"

        return ParsedEvent(
            id=str(item.get("id") or ""),
            event_type=int(item.get("eventType") or 1),
            starts_at=str(item.get("startsAt") or ""),
            ends_at=str(item.get("endsAt") or ""),
            duration=int(item.get("duration") or 0),
            product_id=str(item.get("productId") or product.get("productId") or "") or None,
            product_name=product_name,
            product_type=product_type_int,
            product_type_label=PRODUCT_TYPE_LABELS.get(product_type_int, "Урок") if product_type_int else "Урок",
            teacher_name=teacher_name,
            is_trial=bool(item.get("isTrial")),
            is_completed=is_completed if isinstance(is_completed, bool) else None,
            completion_label=completion_label,
            schedule_class=schedule_class,
            student_names=tuple(student_names),
            student_ids=tuple(student_ids),
            teacher_names=tuple(teacher_names),
            teacher_ids=tuple(teacher_ids),
        )

    async def get_student(
        self,
        student_id: str | int,
        include: str = "products,products.financial",
        verbose: bool = False,
    ) -> Optional[dict[str, Any]]:
        return await self._get(
            f"/api/v1/students/{student_id}",
            params={"include": include},
            verbose=verbose,
        )

    async def get_student_balances(
        self,
        student_id: str | int,
        verbose: bool = False,
    ) -> list[ProductBalance]:
        raw = await self.get_student(
            student_id,
            include="products,products.financial",
            verbose=verbose,
        )
        if not raw:
            return []
        return self._parse_product_balances(raw)

    async def get_student_transactions(
        self,
        student_id: str | int,
        page_number: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        verbose: bool = False,
    ) -> tuple[list[ParsedTransaction], int]:
        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "sortBy": sort_by,
            "sortOrder": sort_order,
        }
        raw = await self._get(
            f"/api/v1/students/{student_id}/transactions",
            params=params,
            verbose=verbose,
        )
        if not raw:
            return [], 0

        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total

        return [self._parse_transaction(item) for item in items if isinstance(item, dict)], total

    async def get_student_events(
        self,
        student_id: str | int,
        date_from: str,
        date_to: str,
        page_number: int = 1,
        page_size: int = 500,
        include: str = "students,products,teachers,content",
        verbose: bool = False,
    ) -> tuple[list[ParsedEvent], int]:
        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "sortBy": "startsAt",
            "sortOrder": "asc",
            "include": include,
            "dateFrom": date_from,
            "dateTo": date_to,
            "eventTypes": "1",
        }
        raw = await self._get(
            f"/api/v1/students/{student_id}/events",
            params=params,
            verbose=verbose,
        )
        if not raw:
            return [], 0

        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total

        return [self._parse_event(item) for item in items if isinstance(item, dict)], total

    async def list_students(
        self,
        page_number: int = 1,
        page_size: int = 50,
        student_name: Optional[str] = None,
        statuses: Optional[str] = None,
        include: Optional[str] = None,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        verbose: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        from app.services.optimate_admin_labels import STUDENT_LIST_INCLUDE

        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "sortBy": sort_by,
            "sortOrder": sort_order,
            "include": include or STUDENT_LIST_INCLUDE,
        }
        if student_name:
            params["studentName"] = student_name
        if statuses:
            params["statuses"] = statuses

        raw = await self._get("/api/v1/students", params=params, verbose=verbose)
        if not raw:
            return [], 0
        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total
        return [item for item in items if isinstance(item, dict)], total

    async def get_student_by_id(
        self,
        student_id: str | int,
        include: Optional[str] = None,
        verbose: bool = False,
    ) -> Optional[dict[str, Any]]:
        from app.services.optimate_admin_labels import STUDENT_DETAIL_INCLUDE

        return await self._get(
            f"/api/v1/students/{student_id}",
            params={"include": include or STUDENT_DETAIL_INCLUDE},
            verbose=verbose,
        )

    async def list_teachers(
        self,
        page_number: int = 1,
        page_size: int = 50,
        teacher_name: Optional[str] = None,
        statuses: Optional[str] = None,
        include: Optional[str] = None,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        verbose: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        from app.services.optimate_admin_labels import TEACHER_LIST_INCLUDE

        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "sortBy": sort_by,
            "sortOrder": sort_order,
            "include": include or TEACHER_LIST_INCLUDE,
        }
        if teacher_name:
            params["teacherName"] = teacher_name
        if statuses:
            params["statuses"] = statuses

        raw = await self._get("/api/v1/teachers", params=params, verbose=verbose)
        if not raw:
            return [], 0
        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total
        return [item for item in items if isinstance(item, dict)], total

    async def get_teacher_by_id(
        self,
        teacher_id: str | int,
        include: Optional[str] = None,
        verbose: bool = False,
    ) -> Optional[dict[str, Any]]:
        from app.services.optimate_admin_labels import TEACHER_DETAIL_INCLUDE

        return await self._get(
            f"/api/v1/teachers/{teacher_id}",
            params={"include": include or TEACHER_DETAIL_INCLUDE},
            verbose=verbose,
        )

    async def get_teacher_schedules(
        self,
        teacher_id: str | int,
        date: Optional[str] = None,
        verbose: bool = False,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        if date:
            params["date"] = date
        raw = await self._get(
            f"/api/v1/teachers/{teacher_id}/schedules",
            params=params or None,
            verbose=verbose,
        )
        if not raw:
            return []
        items = raw.get("data") or []
        if not isinstance(items, list):
            return []
        return [item for item in items if isinstance(item, dict)]

    async def list_teacher_students(
        self,
        teacher_id: str | int,
        page_number: int = 1,
        page_size: int = 50,
        student_name: Optional[str] = None,
        include: Optional[str] = None,
        verbose: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        from app.services.optimate_admin_labels import TEACHER_STUDENTS_INCLUDE

        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "include": include or TEACHER_STUDENTS_INCLUDE,
        }
        if student_name:
            params["studentName"] = student_name

        raw = await self._get(
            f"/api/v1/teachers/{teacher_id}/students",
            params=params,
            verbose=verbose,
        )
        if not raw:
            return [], 0
        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total
        return [item for item in items if isinstance(item, dict)], total

    async def list_teacher_events(
        self,
        teacher_id: str | int,
        date_from: str,
        date_to: str,
        page_number: int = 1,
        page_size: int = 200,
        sort_order: str = "asc",
        completion_status: Optional[str] = None,
        verbose: bool = False,
    ) -> tuple[list[ParsedEvent], int]:
        items, total = await self.list_events(
            date_from=date_from,
            date_to=date_to,
            page_number=page_number,
            page_size=page_size,
            sort_order=sort_order,
            teacher_ids=str(teacher_id),
            completion_status=completion_status,
            verbose=verbose,
        )
        return [self._parse_event(item) for item in items], total

    async def list_events(
        self,
        date_from: str,
        date_to: str,
        page_number: int = 1,
        page_size: int = 200,
        sort_order: str = "asc",
        event_types: str = "1",
        include: Optional[str] = None,
        completion_status: Optional[str] = None,
        teacher_ids: Optional[str] = None,
        student_ids: Optional[str] = None,
        verbose: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        from app.services.optimate_admin_labels import EVENT_LIST_INCLUDE

        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "sortBy": "startsAt",
            "sortOrder": sort_order,
            "include": include or EVENT_LIST_INCLUDE,
            "eventTypes": event_types,
            "dateFrom": date_from,
            "dateTo": date_to,
        }
        if completion_status:
            params["completionStatus"] = completion_status
        if teacher_ids:
            params["teacherIds"] = teacher_ids
        if student_ids:
            params["studentIds"] = student_ids

        raw = await self._get("/api/v1/events", params=params, verbose=verbose)
        if not raw:
            return [], 0
        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total
        return [item for item in items if isinstance(item, dict)], total

    async def list_teacher_groups(
        self,
        teacher_id: str | int,
        page_number: int = 1,
        page_size: int = 100,
        statuses: Optional[str] = None,
        include: Optional[str] = None,
        verbose: bool = False,
    ) -> tuple[list[dict[str, Any]], int]:
        from app.services.optimate_admin_labels import TEACHER_GROUPS_INCLUDE

        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "teacherIds": str(teacher_id),
            "include": include or TEACHER_GROUPS_INCLUDE,
            "productTypes": "2,3,4",
        }
        if statuses:
            params["statuses"] = statuses

        raw = await self._get("/api/v1/groups", params=params, verbose=verbose)
        if not raw:
            return [], 0
        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total
        return [item for item in items if isinstance(item, dict)], total

    async def get_group_by_id(
        self,
        group_id: str | int,
        include: Optional[str] = None,
        verbose: bool = False,
    ) -> Optional[dict[str, Any]]:
        from app.services.optimate_admin_labels import TEACHER_GROUPS_INCLUDE

        raw = await self._get(
            f"/api/v1/groups/{group_id}",
            params={"include": include or TEACHER_GROUPS_INCLUDE},
            verbose=verbose,
        )
        if not raw:
            return None
        data = raw.get("data") if isinstance(raw.get("data"), dict) else raw
        return data if isinstance(data, dict) else None

    def _parse_teacher_transaction(self, item: dict[str, Any]) -> ParsedTeacherTransaction:
        tx_type = int(item.get("type") or 0)
        signed = self._first_number(item, "signedAmount")
        if not signed:
            signed = self._first_number(item, "amount")
            if tx_type == 2 and signed > 0:
                signed = -signed
        amount = self._first_number(item, "amount")
        student_names: list[str] = []
        for student in item.get("students") or []:
            if not isinstance(student, dict):
                continue
            fn = (student.get("firstName") or "").strip()
            ln = (student.get("lastName") or "").strip()
            name = f"{fn} {ln}".strip() or (student.get("name") or "").strip()
            if name:
                student_names.append(name)

        return ParsedTeacherTransaction(
            id=str(item.get("id") or ""),
            type=tx_type,
            type_label=TEACHER_TRANSACTION_TYPE_LABELS.get(tx_type, f"Тип {tx_type}"),
            amount=amount,
            signed_amount=signed,
            description=item.get("description"),
            transaction_date=item.get("transactionDate"),
            created_at=item.get("createdAt"),
            product_id=str(item.get("productId")) if item.get("productId") is not None else None,
            product_name=item.get("productName"),
            product_type=int(item["productType"]) if item.get("productType") is not None else None,
            lesson_id=str(item.get("lessonId")) if item.get("lessonId") is not None else None,
            is_trial=item.get("isTrial") if isinstance(item.get("isTrial"), bool) else None,
            period_start_date=item.get("periodStartDate"),
            period_end_date=item.get("periodEndDate"),
            salary_invoice_id=str(item.get("salaryInvoiceId")) if item.get("salaryInvoiceId") else None,
            student_names=tuple(student_names),
            is_credit=signed >= 0,
        )

    async def get_teacher_transactions(
        self,
        teacher_id: str | int,
        page_number: int = 1,
        page_size: int = 20,
        sort_by: str = "transactionDate",
        sort_order: str = "desc",
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        verbose: bool = False,
    ) -> tuple[list[ParsedTeacherTransaction], int]:
        params: dict[str, Any] = {
            "pageNumber": page_number,
            "pageSize": page_size,
            "sortBy": sort_by,
            "sortOrder": sort_order,
        }
        if date_from:
            params["dateFrom"] = date_from
        if date_to:
            params["dateTo"] = date_to

        raw = await self._get(
            f"/api/v1/teachers/{teacher_id}/transactions",
            params=params,
            verbose=verbose,
        )
        if not raw:
            return [], 0

        items = raw.get("data") or []
        total = int(raw.get("total") or 0)
        if not isinstance(items, list):
            return [], total
        return [self._parse_teacher_transaction(item) for item in items if isinstance(item, dict)], total

    async def create_event(
        self,
        *,
        teacher_id: str | int,
        student_ids: list[int],
        product_id: int,
        starts_at: str,
        duration: int = 60,
        event_type: int = 1,
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        body = {
            "eventType": event_type,
            "teacherIds": [int(teacher_id)],
            "studentIds": student_ids,
            "productId": int(product_id),
            "startsAt": starts_at,
            "duration": int(duration),
        }
        return await self._post("/api/v1/events", body, verbose=verbose)

    async def cancel_event(
        self,
        event_id: str | int,
        *,
        verbose: bool = False,
    ) -> tuple[Optional[dict[str, Any]], int]:
        """Скасувати урок у Optimate.

        Заплановані уроки: DELETE (PATCH isCompleted=false повертає 200, але не змінює подію).
        Проведені уроки: PATCH isCompleted=false, якщо DELETE недоступний.
        """
        deleted, delete_status = await self._delete(
            f"/api/v1/events/{event_id}",
            verbose=verbose,
        )
        if delete_status == 200:
            return deleted, delete_status

        updated, patch_status = await self._patch(
            f"/api/v1/events/{event_id}",
            {"isCompleted": False},
            verbose=verbose,
        )
        if patch_status != 200:
            return updated, patch_status

        raw = await self._get(f"/api/v1/events/{event_id}", verbose=verbose)
        if isinstance(raw, dict):
            data = raw.get("data") if isinstance(raw.get("data"), dict) else raw
            if isinstance(data, dict) and data.get("isCompleted") is False:
                return updated, 200

        return None, delete_status if delete_status >= 400 else 502

    async def get_group_students(
        self,
        group_id: str | int,
        include: Optional[str] = None,
        verbose: bool = False,
    ) -> list[dict[str, Any]]:
        from app.services.optimate_admin_labels import GROUP_STUDENTS_INCLUDE

        raw = await self._get(
            f"/api/v1/groups/{group_id}/students",
            params={"include": include or GROUP_STUDENTS_INCLUDE},
            verbose=verbose,
        )
        if not raw:
            return []
        items = raw.get("data") or []
        if not isinstance(items, list):
            return []
        return [item for item in items if isinstance(item, dict)]


def get_optimate_client() -> OptimateClient:
    return OptimateClient()
