"""Reversible encryption for admin-visible login passwords."""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_login_password(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_login_password(encrypted: str) -> str | None:
    if not encrypted:
        return None
    try:
        return _fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        return None
