"""Pydantic-схемы для ответов API (слой представления).

Даты уходят наружу как epoch-ms за счёт типа TimeStamp в исходных моделях; медиа
отдаём через media_to_read (с готовым публичным url).
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel

from .models.catalog import (
    Acquisition,
    Copy,
    CopyStatus,
    Grade,
    Identifier,
    MediaRead,
    Pressing,
    RatingEntry,
    Release,
    SoundMode,
    TimeStamp,
    Track,
    media_to_read,
)


class DiscogsCandidate(BaseModel):
    """Лёгкое представление результата поиска Discogs (для экрана «Добавить»)."""

    discogs_release_id: int
    title: str
    artist: Optional[str] = None
    catalog_number: Optional[str] = None
    catalog_number_norm: Optional[str] = None
    year: Optional[int] = None
    country: Optional[str] = None
    formats: list[str] = []
    label: Optional[str] = None
    thumb: Optional[str] = None
    cover_image: Optional[str] = None

    @classmethod
    def from_search(cls, raw: dict[str, Any]) -> "DiscogsCandidate":
        from .services.catalog_number import normalize_catalog_number

        title = (raw.get("title") or "").strip()
        artist: Optional[str] = None
        # Discogs отдаёт title как "Артист - Название"
        if " - " in title:
            artist, _, _ = title.partition(" - ")
            artist = artist.strip() or None
        catno = raw.get("catno")
        labels = raw.get("label") or []
        return cls(
            discogs_release_id=int(raw["id"]),
            title=title,
            artist=artist,
            catalog_number=catno,
            catalog_number_norm=normalize_catalog_number(catno),
            year=int(raw["year"]) if str(raw.get("year") or "").isdigit() else None,
            country=raw.get("country") or None,
            formats=raw.get("format") or [],
            label=labels[0] if labels else None,
            thumb=raw.get("thumb") or None,
            cover_image=raw.get("cover_image") or None,
        )


class ReleaseRead(BaseModel):
    """Полное представление кэшированного релиза (канон)."""

    discogs_release_id: int
    discogs_master_id: Optional[int] = None
    title: str
    primary_artist: Optional[str] = None
    artists: list[str] = []
    label: Optional[str] = None
    catalog_number: Optional[str] = None
    catalog_number_norm: Optional[str] = None
    prefix: Optional[str] = None
    country: Optional[str] = None
    released_year: Optional[int] = None
    formats: list[str] = []
    sound_mode: Optional[SoundMode] = None
    genres: list[str] = []
    styles: list[str] = []
    tracklist: list[Track] = []
    identifiers: list[Identifier] = []
    images: list[MediaRead] = []
    discogs_uri: Optional[str] = None

    @classmethod
    def from_doc(cls, r: Release) -> "ReleaseRead":
        return cls(
            discogs_release_id=r.discogs_release_id,
            discogs_master_id=r.discogs_master_id,
            title=r.title,
            primary_artist=r.primary_artist,
            artists=[a.anv or a.name for a in r.artists],
            label=r.label,
            catalog_number=r.catalog_number,
            catalog_number_norm=r.catalog_number_norm,
            prefix=r.prefix,
            country=r.country,
            released_year=r.released_year,
            formats=r.formats,
            sound_mode=r.sound_mode,
            genres=r.genres,
            styles=r.styles,
            tracklist=r.tracklist,
            identifiers=r.identifiers,
            images=[m for m in (media_to_read(im) for im in r.images) if m is not None],
            discogs_uri=r.discogs_uri,
        )


# --------------------------------------------------------------------------- #
#  Экземпляры (Copy)
# --------------------------------------------------------------------------- #
class CopyCreate(BaseModel):
    """Создание экземпляра(ов) из релиза. count > 1 — «несколько прессов»."""

    discogs_release_id: int
    count: int = 1


class CopyListItem(BaseModel):
    """Строка коллекции (экран A) — денормализованные поля без джойнов."""

    id: str
    status: CopyStatus
    display_title: Optional[str] = None
    display_artist: Optional[str] = None
    catalog_number: Optional[str] = None
    year: Optional[int] = None
    cover: Optional[MediaRead] = None
    current_album_rating: Optional[int] = None
    current_sound_rating: Optional[int] = None
    is_favorite: bool = False
    has_audio: bool = False
    has_notes: bool = False
    plant_code: Optional[str] = None
    genres: list[str] = []
    tags: list[str] = []

    @classmethod
    def from_doc(cls, c: Copy, *, genres: list[str] | None = None) -> "CopyListItem":
        return cls(
            id=str(c.id),
            status=c.status,
            display_title=c.display_title,
            display_artist=c.display_artist,
            catalog_number=c.catalog_number,
            year=c.year,
            cover=media_to_read(c.cover),
            current_album_rating=c.current_album_rating,
            current_sound_rating=c.current_sound_rating,
            is_favorite=c.is_favorite,
            plant_code=c.pressing.plant_code if c.pressing else None,
            genres=genres or [],
            tags=c.tags,
        )


class CopyRead(BaseModel):
    """Полная карточка экземпляра (экран C) = личный слой + канон релиза."""

    id: str
    status: CopyStatus
    display_title: Optional[str] = None
    display_artist: Optional[str] = None
    catalog_number: Optional[str] = None
    year: Optional[int] = None
    cover: Optional[MediaRead] = None
    is_favorite: bool = False

    current_album_rating: Optional[int] = None
    current_sound_rating: Optional[int] = None
    rating_history: list[RatingEntry] = []

    grade: Optional[Grade] = None
    pressing: Optional[Pressing] = None
    acquisition: Optional[Acquisition] = None
    storage_location: Optional[str] = None
    tags: list[str] = []

    play_count: int = 0
    last_played_at: Optional[TimeStamp] = None

    copy_index: int = 1
    copy_total: int = 1

    release: Optional[ReleaseRead] = None

    @classmethod
    def from_doc(
        cls, c: Copy, release: Release | None, index: int, total: int
    ) -> "CopyRead":
        return cls(
            id=str(c.id),
            status=c.status,
            display_title=c.display_title,
            display_artist=c.display_artist,
            catalog_number=c.catalog_number,
            year=c.year,
            cover=media_to_read(c.cover),
            is_favorite=c.is_favorite,
            current_album_rating=c.current_album_rating,
            current_sound_rating=c.current_sound_rating,
            rating_history=c.rating_history,
            grade=c.grade,
            pressing=c.pressing,
            acquisition=c.acquisition,
            storage_location=c.storage_location,
            tags=c.tags,
            play_count=c.play_count,
            last_played_at=c.last_played_at,
            copy_index=index,
            copy_total=total,
            release=ReleaseRead.from_doc(release) if release else None,
        )
