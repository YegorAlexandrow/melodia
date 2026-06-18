"""Сервис личного слоя: создание и чтение экземпляров (Copy).

Экземпляр ≠ издание: на один релиз Discogs можно завести несколько физических
экземпляров (разные прессы). Денормализуем поля для списков/поиска без джойнов.
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ..models.catalog import Copy, CopyStatus, Release
from ..settings import Settings
from .discogs import DiscogsClient
from .media import cache_release_cover
from .releases import get_cached_release, upsert_release


async def ensure_release_cached(settings: Settings, release_id: int) -> Release:
    """Вернуть кэшированный релиз; если его нет — импортировать из Discogs."""

    release = await get_cached_release(release_id)
    if release is not None:
        return release
    async with DiscogsClient(settings) as client:
        return await upsert_release(client, release_id)


async def create_copies(
    settings: Settings, release_id: int, count: int = 1
) -> list[Copy]:
    """Создать count экземпляров на основе релиза (с денормализацией и обложкой)."""

    count = max(1, min(count, 20))
    release = await ensure_release_cached(settings, release_id)
    cover = await cache_release_cover(settings, release_id, release.images)

    created: list[Copy] = []
    for _ in range(count):
        copy = Copy(
            release=release,  # type: ignore[arg-type]
            discogs_release_id=release.discogs_release_id,
            status=CopyStatus.OWNED,
            display_title=release.title,
            display_artist=release.primary_artist,
            catalog_number=release.catalog_number,
            year=release.released_year,
            cover=cover,
        )
        await copy.insert()
        created.append(copy)
    return created


async def get_copy(copy_id: PydanticObjectId) -> Copy | None:
    copy = await Copy.get(copy_id)
    if copy is None or copy.is_deleted:
        return None
    return copy


async def update_copy(copy: Copy, data: dict) -> Copy:
    """Применить частичное обновление личных полей экземпляра."""

    for field, value in data.items():
        setattr(copy, field, value)
    await copy.save()
    return copy


async def add_rating(
    copy: Copy,
    album: int | None = None,
    sound: int | None = None,
    note: str | None = None,
) -> Copy:
    """Добавить запись в историю оценок и обновить текущие значения."""

    copy.add_rating(album=album, sound=sound, note=note)  # утилита модели
    await copy.save()
    return copy


async def copy_position(copy: Copy) -> tuple[int, int]:
    """Порядковый номер экземпляра среди экземпляров того же релиза: (index, total).

    «экземпляр №index из total». Сортировка по дате создания.
    """

    if copy.discogs_release_id is None:
        return (1, 1)
    siblings = (
        await Copy.find(
            Copy.discogs_release_id == copy.discogs_release_id,
            Copy.not_deleted(),
        )
        .sort("+created_at")
        .to_list()
    )
    ids = [c.id for c in siblings]
    try:
        idx = ids.index(copy.id) + 1
    except ValueError:
        idx = 1
    return (idx, len(siblings) or 1)
