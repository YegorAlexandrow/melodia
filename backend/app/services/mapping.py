"""Маппинг ответов Discogs → документы канона (Master / Release).

Возвращает несохранённые экземпляры Beanie-документов; апсерт (идемпотентный по
уникальному discogs_*_id) делает сервисный слой. Сырой ответ кладём в `raw`,
ставим `fetched_at` — канон можно перекачать, не затрагивая личные данные.
"""

from __future__ import annotations

import re
from typing import Any

from ..models.catalog import (
    ArtistRef,
    Identifier,
    ImageMedia,
    Master,
    MediaLocation,
    Release,
    SoundMode,
    Track,
    VideoRef,
    now,
)
from .catalog_number import catalog_prefix, normalize_catalog_number


def parse_duration(text: str | None) -> int | None:
    """'3:45' → 225, '1:02:03' → 3723. Пусто/мусор → None."""

    if not text:
        return None
    parts = text.strip().split(":")
    if not all(p.isdigit() for p in parts) or not parts:
        return None
    nums = [int(p) for p in parts]
    if len(nums) == 2:
        return nums[0] * 60 + nums[1]
    if len(nums) == 3:
        return nums[0] * 3600 + nums[1] * 60 + nums[2]
    if len(nums) == 1:
        return nums[0]
    return None


def _side_from_position(position: str | None) -> str | None:
    """Сторона из позиции: 'A1' → 'A', 'B' → 'B', '1' → None."""

    if not position:
        return None
    m = re.match(r"^([A-DА-Г])", position.strip().upper())
    return m.group(1) if m else None


def _artists(raw_artists: list[dict[str, Any]] | None) -> list[ArtistRef]:
    out: list[ArtistRef] = []
    for a in raw_artists or []:
        name = (a.get("name") or "").strip()
        if not name:
            continue
        out.append(
            ArtistRef(
                name=re.sub(r"\s*\(\d+\)$", "", name),  # Discogs добавляет "(2)" к тёзкам
                discogs_id=a.get("id"),
                anv=a.get("anv") or None,
                role=a.get("role") or None,
                join=a.get("join") or None,
            )
        )
    return out


def _primary_artist(artists: list[ArtistRef]) -> str | None:
    if not artists:
        return None
    parts: list[str] = []
    for a in artists:
        parts.append(a.anv or a.name)
        if a.join and a.join not in (",",):
            parts.append(f" {a.join} ")
        elif a.join == ",":
            parts.append(", ")
    text = "".join(parts).strip(" ,")
    return text or artists[0].name


def _tracklist(raw_tracks: list[dict[str, Any]] | None) -> list[Track]:
    out: list[Track] = []
    seq = 0
    for t in raw_tracks or []:
        # пропускаем заголовки/индексы без позиции и названия
        if t.get("type_") not in (None, "track") and not t.get("position"):
            continue
        title = (t.get("title") or "").strip()
        if not title:
            continue
        seq += 1
        position = (t.get("position") or "").strip()
        out.append(
            Track(
                position=position or str(seq),
                side=_side_from_position(position),
                seq=seq,
                title=title,
                artist=_primary_artist(_artists(t.get("artists"))) if t.get("artists") else None,
                duration_text=(t.get("duration") or "").strip() or None,
                duration_sec=parse_duration(t.get("duration")),
            )
        )
    return out


def _identifiers(raw: list[dict[str, Any]] | None) -> list[Identifier]:
    out: list[Identifier] = []
    for i in raw or []:
        value = (i.get("value") or "").strip()
        if not value:
            continue
        out.append(
            Identifier(
                type=(i.get("type") or "Other").strip(),
                value=value,
                description=(i.get("description") or "").strip() or None,
            )
        )
    return out


def _images(raw: list[dict[str, Any]] | None) -> list[ImageMedia]:
    out: list[ImageMedia] = []
    for im in raw or []:
        uri = (im.get("uri") or im.get("resource_url") or "").strip()
        if not uri:
            continue
        out.append(
            ImageMedia(
                key=uri,
                loc=MediaLocation.WEB,
                mime_type="image/jpeg",
                role=im.get("type") or None,
                width=im.get("width"),
                height=im.get("height"),
            )
        )
    return out


def _videos(raw: list[dict[str, Any]] | None) -> list[VideoRef]:
    out: list[VideoRef] = []
    for v in raw or []:
        uri = (v.get("uri") or "").strip()
        if not uri:
            continue
        out.append(
            VideoRef(
                uri=uri,
                title=(v.get("title") or "").strip() or None,
                duration_sec=v.get("duration") if isinstance(v.get("duration"), int) else None,
                description=(v.get("description") or "").strip() or None,
            )
        )
    return out


def _format_names(raw_formats: list[dict[str, Any]] | None) -> list[str]:
    names: list[str] = []
    for f in raw_formats or []:
        if f.get("name"):
            names.append(f["name"])
        for d in f.get("descriptions") or []:
            names.append(d)
    return names


def _sound_mode(raw_formats: list[dict[str, Any]] | None) -> SoundMode | None:
    blob = " ".join(_format_names(raw_formats)).lower()
    if "quad" in blob:
        return SoundMode.QUAD
    if "stereo" in blob:
        return SoundMode.STEREO
    if "mono" in blob:
        return SoundMode.MONO
    return None


def _released_year(year: Any, released: str | None) -> int | None:
    if isinstance(year, int) and year > 0:
        return year
    if isinstance(year, str) and year[:4].isdigit():
        return int(year[:4])
    if released and released[:4].isdigit():
        return int(released[:4])
    return None


def map_release(raw: dict[str, Any]) -> Release:
    """Discogs release JSON → документ Release (несохранённый)."""

    labels = raw.get("labels") or []
    catno = (labels[0].get("catno") if labels else None) or raw.get("catalog_number")
    label_name = labels[0].get("name") if labels else None
    artists = _artists(raw.get("artists"))

    return Release(
        discogs_release_id=int(raw["id"]),
        discogs_master_id=raw.get("master_id"),
        title=(raw.get("title") or "").strip(),
        artists=artists,
        primary_artist=_primary_artist(artists),
        label=label_name or "Мелодия",
        catalog_number=catno,
        catalog_number_norm=normalize_catalog_number(catno),
        prefix=catalog_prefix(catno),
        country=raw.get("country") or None,
        released_year=_released_year(raw.get("year"), raw.get("released")),
        formats=_format_names(raw.get("formats")),
        sound_mode=_sound_mode(raw.get("formats")),
        genres=raw.get("genres") or [],
        styles=raw.get("styles") or [],
        tracklist=_tracklist(raw.get("tracklist")),
        identifiers=_identifiers(raw.get("identifiers")),
        images=_images(raw.get("images")),
        videos=_videos(raw.get("videos")),
        discogs_uri=raw.get("uri") or raw.get("resource_url"),
        notes_discogs=(raw.get("notes") or "").strip() or None,
        raw=raw,
        fetched_at=now(),
    )


def map_master(raw: dict[str, Any]) -> Master:
    """Discogs master JSON → документ Master (несохранённый)."""

    artists = _artists(raw.get("artists"))
    return Master(
        discogs_master_id=int(raw["id"]),
        title=(raw.get("title") or "").strip(),
        main_release_id=raw.get("main_release"),
        year=_released_year(raw.get("year"), None),
        artists=artists,
        genres=raw.get("genres") or [],
        styles=raw.get("styles") or [],
        images=_images(raw.get("images")),
        videos=_videos(raw.get("videos")),
        discogs_uri=raw.get("uri") or raw.get("resource_url"),
        raw=raw,
        fetched_at=now(),
    )
