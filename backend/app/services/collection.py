"""Сервис коллекции: фильтры, поиск и фасеты для экрана A.

Жанры живут на релизе (канон), поэтому фильтр по жанру и обогащение жанрами делаем
через карту release_id → genres. Индикаторы аудио/заметок собираем пакетно, чтобы не
делать запрос на каждый экземпляр.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..models.catalog import AudioFile, Copy, CopyStatus, Note, Release
from ..schemas import CopyListItem


@dataclass
class CopyFilters:
    status: CopyStatus | None = None
    genre: str | None = None
    plant_code: str | None = None
    tag: str | None = None
    favorite: bool | None = None
    q: str | None = None
    sort: str = "year"  # year | artist | added


async def query_copies(f: CopyFilters) -> list[Copy]:
    conditions: list[Any] = [Copy.not_deleted()]
    if f.status is not None:
        conditions.append(Copy.status == f.status)
    if f.favorite is not None:
        conditions.append(Copy.is_favorite == f.favorite)
    if f.plant_code:
        conditions.append({"pressing.plant_code": f.plant_code})
    if f.tag:
        conditions.append({"tags": f.tag})

    find_args: list[Any] = list(conditions)
    if f.q:
        find_args.append({"$text": {"$search": f.q}})

    copies = await Copy.find(*find_args).to_list()

    # фильтр по жанру — через канон релиза
    if f.genre:
        genres_map = await _release_genres({c.discogs_release_id for c in copies})
        copies = [
            c
            for c in copies
            if c.discogs_release_id is not None
            and f.genre in genres_map.get(c.discogs_release_id, [])
        ]

    _sort(copies, f.sort)
    return copies


def _sort(copies: list[Copy], sort: str) -> None:
    if sort == "artist":
        copies.sort(key=lambda c: (c.display_artist or "").lower())
    elif sort == "added":
        copies.sort(key=lambda c: c.created_at, reverse=True)
    else:  # year по убыванию, без года — в конец
        copies.sort(key=lambda c: (c.year is None, -(c.year or 0)))


async def _release_genres(release_ids: set[int]) -> dict[int, list[str]]:
    if not release_ids:
        return {}
    releases = await Release.find({"discogs_release_id": {"$in": list(release_ids)}}).to_list()
    return {r.discogs_release_id: r.genres for r in releases}


async def _audio_copy_ids() -> set:
    coll = AudioFile.get_pymongo_collection()
    ids = await coll.distinct("targets.copy_id", {"deleted_at": None})
    return {i for i in ids if i is not None}


async def _note_copy_ids() -> set:
    # Beanie хранит Link как DBRef → id извлекаем по пути "target_copy.$id".
    coll = Note.get_pymongo_collection()
    ids = await coll.distinct("target_copy.$id", {"deleted_at": None})
    return {i for i in ids if i is not None}


async def enrich(copies: list[Copy]) -> list[CopyListItem]:
    genres_map = await _release_genres({c.discogs_release_id for c in copies})
    audio_ids = await _audio_copy_ids()
    note_ids = await _note_copy_ids()

    items: list[CopyListItem] = []
    for c in copies:
        item = CopyListItem.from_doc(
            c, genres=genres_map.get(c.discogs_release_id or -1, [])
        )
        item.has_audio = c.id in audio_ids
        item.has_notes = c.id in note_ids
        items.append(item)
    return items


async def facets() -> dict[str, Any]:
    """Доступные значения фильтров и счётчики статусов по всей коллекции."""

    copies = await Copy.find(Copy.not_deleted()).to_list()
    genres_map = await _release_genres({c.discogs_release_id for c in copies})

    genres: set[str] = set()
    for gs in genres_map.values():
        genres.update(gs)
    plants = {c.pressing.plant_code for c in copies if c.pressing and c.pressing.plant_code}

    status_counts: dict[str, int] = {}
    for c in copies:
        status_counts[c.status.value] = status_counts.get(c.status.value, 0) + 1

    return {
        "total": len(copies),
        "genres": sorted(genres),
        "plants": sorted(p for p in plants if p),
        "status_counts": status_counts,
    }
