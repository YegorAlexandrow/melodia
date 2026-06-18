"""API: создание, список (с фильтрами), фасеты и чтение экземпляров (Copy)."""

from __future__ import annotations

from typing import Any, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, Query

from ..models.catalog import Copy, CopyStatus
from ..schemas import (
    CopyCreate,
    CopyListItem,
    CopyRead,
    CopyUpdate,
    PlayCreate,
    PlayRead,
    RatingCreate,
)
from ..services.collection import CopyFilters, enrich, facets, query_copies
from ..services.copies import (
    add_rating,
    copy_position,
    create_copies,
    get_copy,
    update_copy,
)
from ..services.discogs import DiscogsError
from ..services.plays import add_play_event, list_play_events
from ..services.releases import get_cached_release
from ..settings import get_settings

router = APIRouter(prefix="/api/copies", tags=["copies"])


async def _read(copy: Copy) -> CopyRead:
    release = (
        await get_cached_release(copy.discogs_release_id)
        if copy.discogs_release_id is not None
        else None
    )
    index, total = await copy_position(copy)
    return CopyRead.from_doc(copy, release, index, total)


@router.post("", response_model=list[CopyRead])
async def create(body: CopyCreate) -> list[CopyRead]:
    settings = get_settings()
    try:
        copies = await create_copies(settings, body.discogs_release_id, body.count)
    except DiscogsError as exc:
        raise HTTPException(502, str(exc)) from exc
    return [await _read(c) for c in copies]


@router.get("", response_model=list[CopyListItem])
async def list_copies(
    status: Optional[CopyStatus] = None,
    genre: Optional[str] = None,
    plant: Optional[str] = None,
    tag: Optional[str] = None,
    favorite: Optional[bool] = None,
    q: Optional[str] = None,
    sort: str = Query("year", pattern="^(year|artist|added)$"),
) -> list[CopyListItem]:
    filters = CopyFilters(
        status=status,
        genre=genre,
        plant_code=plant,
        tag=tag,
        favorite=favorite,
        q=q,
        sort=sort,
    )
    copies = await query_copies(filters)
    return await enrich(copies)


@router.get("/facets")
async def collection_facets() -> dict[str, Any]:
    return await facets()


@router.get("/{copy_id}", response_model=CopyRead)
async def read_copy(copy_id: PydanticObjectId) -> CopyRead:
    copy = await get_copy(copy_id)
    if copy is None:
        raise HTTPException(404, "Экземпляр не найден")
    return await _read(copy)


@router.patch("/{copy_id}", response_model=CopyRead)
async def patch_copy(copy_id: PydanticObjectId, body: CopyUpdate) -> CopyRead:
    copy = await get_copy(copy_id)
    if copy is None:
        raise HTTPException(404, "Экземпляр не найден")
    # только переданные поля; вложенные объекты — как pydantic-модели, не dict
    changes = {f: getattr(body, f) for f in body.model_fields_set}
    await update_copy(copy, changes)
    return await _read(copy)


@router.post("/{copy_id}/ratings", response_model=CopyRead)
async def post_rating(copy_id: PydanticObjectId, body: RatingCreate) -> CopyRead:
    copy = await get_copy(copy_id)
    if copy is None:
        raise HTTPException(404, "Экземпляр не найден")
    await add_rating(copy, album=body.album, sound=body.sound, note=body.note)
    return await _read(copy)


@router.post("/{copy_id}/plays", response_model=PlayRead)
async def post_play(copy_id: PydanticObjectId, body: PlayCreate) -> PlayRead:
    copy = await get_copy(copy_id)
    if copy is None:
        raise HTTPException(404, "Экземпляр не найден")
    event = await add_play_event(
        copy,
        side_played=body.side_played,
        full_play=body.full_play,
        equipment=body.equipment,
        note=body.note,
    )
    return PlayRead.from_doc(event)


@router.get("/{copy_id}/plays", response_model=list[PlayRead])
async def get_plays(copy_id: PydanticObjectId) -> list[PlayRead]:
    events = await list_play_events(copy_id)
    return [PlayRead.from_doc(e) for e in events]
