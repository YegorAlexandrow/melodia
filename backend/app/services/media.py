"""Локальное хранение медиа: кэш обложек Discogs (loc=WEB → loc=LOCAL).

Обложки скачиваются в локальную папку (settings.media_dir) и отдаются нашим
статическим маршрутом; в БД хранится только локатор ImageMedia. Скачивание —
best-effort: при анонимном доступе к Discogs картинок нет, тогда обложка остаётся
плейсхолдером (своя графика на фронте).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from urllib.parse import urlparse

import httpx

from ..models.catalog import ImageMedia, MediaLocation, now
from ..settings import Settings

logger = logging.getLogger(__name__)

COVERS_SUBDIR = "covers"


def _ext_from_url(url: str, default: str = ".jpg") -> str:
    path = urlparse(url).path
    ext = os.path.splitext(path)[1]
    return ext if ext else default


def media_root(settings: Settings) -> Path:
    root = Path(settings.media_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


async def cache_release_cover(
    settings: Settings, release_id: int, images: list[ImageMedia]
) -> ImageMedia | None:
    """Скачать первичную обложку релиза в локальную папку (идемпотентно по имени).

    Возвращает ImageMedia(loc=LOCAL) при успехе, иначе исходный WEB-локатор (если был)
    или None. Никогда не бросает — обложка не критична.
    """

    if not images:
        return None

    primary = next((im for im in images if im.role == "primary"), images[0])
    if primary.loc is not MediaLocation.WEB:
        return primary  # уже локальная/s3

    ext = _ext_from_url(primary.key)
    key = f"{COVERS_SUBDIR}/release-{release_id}{ext}"
    dest = media_root(settings) / key

    if dest.exists():
        return ImageMedia(
            key=key, loc=MediaLocation.LOCAL, mime_type=primary.mime_type,
            role="primary", width=primary.width, height=primary.height,
        )

    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        headers = {"User-Agent": settings.discogs_user_agent}
        async with httpx.AsyncClient(timeout=20.0, headers=headers, follow_redirects=True) as c:
            resp = await c.get(primary.key)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
    except Exception as exc:  # noqa: BLE001 — best-effort
        logger.warning("Не удалось закэшировать обложку релиза %s: %s", release_id, exc)
        return primary  # оставляем WEB-локатор как есть

    return ImageMedia(
        key=key,
        loc=MediaLocation.LOCAL,
        mime_type=primary.mime_type or "image/jpeg",
        role="primary",
        width=primary.width,
        height=primary.height,
        created_at=now(),
        updated_at=now(),
    )
