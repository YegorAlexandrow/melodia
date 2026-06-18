"""API: создание и чтение экземпляров (Copy)."""

from __future__ import annotations

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException

from ..models.catalog import Copy
from ..schemas import CopyCreate, CopyListItem, CopyRead
from ..services.copies import copy_position, create_copies, get_copy
from ..services.discogs import DiscogsError
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
async def list_copies() -> list[CopyListItem]:
    copies = (
        await Copy.find(Copy.not_deleted()).sort("-created_at").to_list()
    )
    return [CopyListItem.from_doc(c) for c in copies]


@router.get("/{copy_id}", response_model=CopyRead)
async def read_copy(copy_id: PydanticObjectId) -> CopyRead:
    copy = await get_copy(copy_id)
    if copy is None:
        raise HTTPException(404, "Экземпляр не найден")
    return await _read(copy)
