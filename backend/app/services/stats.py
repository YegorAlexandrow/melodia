"""Сервис статистики (экран F): агрегаты по коллекции."""

from __future__ import annotations

from typing import Any

from ..models.catalog import Copy, CopyStatus, Plant, Release
from .collection import _audio_copy_ids


async def compute_stats() -> dict[str, Any]:
    copies = await Copy.find(Copy.not_deleted()).to_list()
    total = len(copies)
    owned = sum(1 for c in copies if c.status is CopyStatus.OWNED)
    wanted = sum(1 for c in copies if c.status is CopyStatus.WANTED)

    audio_ids = await _audio_copy_ids()
    with_audio = sum(1 for c in copies if c.id in audio_ids)

    # по заводам (через справочник для имён)
    plants = {p.code: p.name for p in await Plant.find(Plant.not_deleted()).to_list()}
    plant_counts: dict[str, int] = {}
    for c in copies:
        code = c.pressing.plant_code if c.pressing else None
        if code:
            plant_counts[code] = plant_counts.get(code, 0) + 1
    by_plant = sorted(
        ({"code": k, "name": plants.get(k, k), "count": v} for k, v in plant_counts.items()),
        key=lambda x: x["count"],
        reverse=True,
    )

    # по жанрам (через канон релизов)
    release_ids = {c.discogs_release_id for c in copies if c.discogs_release_id is not None}
    genres_map: dict[int, list[str]] = {}
    if release_ids:
        for r in await Release.find({"discogs_release_id": {"$in": list(release_ids)}}).to_list():
            genres_map[r.discogs_release_id] = r.genres
    genre_counts: dict[str, int] = {}
    for c in copies:
        for g in genres_map.get(c.discogs_release_id or -1, []):
            genre_counts[g] = genre_counts.get(g, 0) + 1
    by_genre = sorted(
        ({"genre": k, "count": v} for k, v in genre_counts.items()),
        key=lambda x: x["count"],
        reverse=True,
    )

    # давно не слушал: владеемые, сперва никогда не слушанные, затем по дате
    owned_copies = [c for c in copies if c.status is CopyStatus.OWNED]
    owned_copies.sort(key=lambda c: (c.last_played_at is not None, c.last_played_at or 0))
    long_unplayed = [
        {
            "id": str(c.id),
            "title": c.display_title,
            "artist": c.display_artist,
            "last_played_at": _epoch(c.last_played_at),
        }
        for c in owned_copies[:8]
    ]

    return {
        "total": total,
        "owned": owned,
        "wanted": wanted,
        "with_audio": with_audio,
        "by_plant": by_plant,
        "by_genre": by_genre,
        "long_unplayed": long_unplayed,
    }


def _epoch(dt) -> int | None:
    if dt is None:
        return None
    from ..models.catalog import _to_epoch_ms

    return _to_epoch_ms(dt)
