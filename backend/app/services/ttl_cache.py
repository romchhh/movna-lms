"""Простий in-memory TTL-кеш з захистом від thundering herd."""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Generic, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    value: T
    expires_at: float
    cached_at: float


class TTLCache:
    def __init__(self, max_entries: int = 512) -> None:
        self._entries: dict[str, CacheEntry[Any]] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._max_entries = max_entries

    def _prune_if_needed(self) -> None:
        if len(self._entries) <= self._max_entries:
            return
        # Видаляємо найстаріші записи
        sorted_keys = sorted(
            self._entries.keys(),
            key=lambda k: self._entries[k].cached_at,
        )
        for key in sorted_keys[: len(self._entries) - self._max_entries]:
            self._entries.pop(key, None)

    async def get_or_fetch(
        self,
        key: str,
        ttl_seconds: float,
        fetcher: Callable[[], Awaitable[T]],
        *,
        force_refresh: bool = False,
    ) -> tuple[T, float, bool]:
        """
        Повертає (value, cached_at_unix, from_cache).
        cached_at — epoch seconds UTC для відображення в UI.
        """
        now_mono = time.monotonic()
        now_epoch = time.time()

        if not force_refresh:
            entry = self._entries.get(key)
            if entry and entry.expires_at > now_mono:
                return entry.value, entry.cached_at, True

        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            if not force_refresh:
                entry = self._entries.get(key)
                if entry and entry.expires_at > now_mono:
                    return entry.value, entry.cached_at, True

            value = await fetcher()
            cached_at = time.time()
            self._entries[key] = CacheEntry(
                value=value,
                expires_at=time.monotonic() + ttl_seconds,
                cached_at=cached_at,
            )
            self._prune_if_needed()
            return value, cached_at, False

    def invalidate(self, key: str) -> None:
        self._entries.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        for key in list(self._entries.keys()):
            if key.startswith(prefix):
                self._entries.pop(key, None)


optimate_cache = TTLCache()
