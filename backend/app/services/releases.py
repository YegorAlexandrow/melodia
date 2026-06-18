"""Сервис канона: поиск и идемпотентный апсерт Release/Master из Discogs.

Канон кэшируется отдельным слоем: повторный импорт обновляет Release/Master
(включая raw и fetched_at), но не трогает личные коллекции (Copy и т.д.).
"""

from __future__ import annotations

from ..models.catalog import Master, Release
from .discogs import DiscogsClient
from .mapping import map_master, map_release


async def _upsert_master(client: DiscogsClient, master_id: int) -> Master:
    raw = await client.get_master(master_id)
    mapped = map_master(raw)
    existing = await Master.find_one(Master.discogs_master_id == master_id)
    if existing is None:
        await mapped.insert()
        return mapped
    # обновляем поля канона, сохраняя _id и created_at
    data = mapped.model_dump(exclude={"id"})
    for field, value in data.items():
        setattr(existing, field, value)
    await existing.save()
    return existing


async def upsert_release(client: DiscogsClient, release_id: int) -> Release:
    """Скачать релиз (и его master, если есть) и идемпотентно сохранить канон."""

    raw = await client.get_release(release_id)
    mapped = map_release(raw)

    if mapped.discogs_master_id:
        try:
            master = await _upsert_master(client, mapped.discogs_master_id)
            mapped.master = master  # type: ignore[assignment]
        except Exception:  # noqa: BLE001 — master необязателен, релиз важнее
            mapped.master = None

    existing = await Release.find_one(Release.discogs_release_id == release_id)
    if existing is None:
        await mapped.insert()
        return mapped

    data = mapped.model_dump(exclude={"id"})
    for field, value in data.items():
        setattr(existing, field, value)
    existing.master = mapped.master  # type: ignore[assignment]
    await existing.save()
    return existing


async def get_cached_release(release_id: int) -> Release | None:
    return await Release.find_one(Release.discogs_release_id == release_id)
