"""Async-клиент Discogs.

Поддерживает поиск по каталожному номеру и получение release/master. Токен
опционален: если задан — добавляем заголовок авторизации (выше лимит, доступны
обложки), иначе работаем анонимно. Уникальный User-Agent отправляем всегда.
Читаем заголовки остатка лимита, на 429 — повтор с экспоненциальным backoff.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from ..settings import Settings

logger = logging.getLogger(__name__)


class DiscogsError(RuntimeError):
    """Ошибка обращения к Discogs."""


@dataclass
class RateLimit:
    limit: int | None = None
    remaining: int | None = None


class DiscogsClient:
    """Тонкий async-клиент поверх httpx."""

    def __init__(
        self,
        settings: Settings,
        *,
        max_retries: int = 3,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._base_url = settings.discogs_base_url.rstrip("/")
        self._max_retries = max_retries
        self._transport = transport  # для тестов (httpx.MockTransport)
        headers = {"User-Agent": settings.discogs_user_agent}
        if settings.discogs_token:
            # Discogs принимает персональный токен в заголовке Authorization.
            headers["Authorization"] = f"Discogs token={settings.discogs_token}"
        self._headers = headers
        self.rate_limit = RateLimit()

    async def __aenter__(self) -> "DiscogsClient":
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers=self._headers,
            timeout=httpx.Timeout(15.0),
            transport=self._transport,
        )
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self._client.aclose()

    def _absorb_rate_limit(self, resp: httpx.Response) -> None:
        def _int(name: str) -> int | None:
            v = resp.headers.get(name)
            return int(v) if v is not None and v.isdigit() else None

        self.rate_limit.limit = _int("X-Discogs-Ratelimit") or self.rate_limit.limit
        self.rate_limit.remaining = _int("X-Discogs-Ratelimit-Remaining")

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        last_exc: Exception | None = None
        for attempt in range(self._max_retries + 1):
            resp = await self._client.get(path, params=params)
            self._absorb_rate_limit(resp)

            if resp.status_code == 429:
                # Уважаем лимит: пауза с экспоненциальным backoff и повтор.
                wait = float(resp.headers.get("Retry-After") or 2 ** attempt)
                logger.warning("Discogs 429, backoff %.1fs (attempt %d)", wait, attempt + 1)
                await asyncio.sleep(wait)
                last_exc = DiscogsError("rate limited (429)")
                continue

            if resp.status_code == 401:
                raise DiscogsError(
                    "Discogs ответил 401 — этому запросу нужна авторизация; "
                    "укажите DISCOGS_TOKEN в .env"
                )
            if resp.status_code == 404:
                raise DiscogsError(f"Discogs 404: {path}")
            if resp.status_code >= 400:
                raise DiscogsError(f"Discogs {resp.status_code}: {resp.text[:200]}")

            return resp.json()

        raise last_exc or DiscogsError("Discogs: исчерпаны повторы")

    async def search_by_catno(
        self, catno: str, *, per_page: int = 25
    ) -> list[dict[str, Any]]:
        """Поиск релизов по каталожному номеру. Возвращает список результатов."""

        data = await self._get(
            "/database/search",
            params={"catno": catno, "type": "release", "per_page": per_page},
        )
        return data.get("results", [])

    async def search(self, query: str, *, per_page: int = 25) -> list[dict[str, Any]]:
        """Свободный поиск (артист + название)."""

        data = await self._get(
            "/database/search",
            params={"q": query, "type": "release", "per_page": per_page},
        )
        return data.get("results", [])

    async def get_release(self, release_id: int) -> dict[str, Any]:
        return await self._get(f"/releases/{release_id}")

    async def get_master(self, master_id: int) -> dict[str, Any]:
        return await self._get(f"/masters/{master_id}")
