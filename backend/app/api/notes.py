"""API: заметки (CRUD)."""

from __future__ import annotations

from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Response

from ..schemas import NoteCreate, NoteFeedItem, NoteRead, NoteUpdate
from ..services.notes import create_note, delete_note, feed, list_notes, update_note

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _feed_item(row: dict) -> NoteFeedItem:
    base = NoteRead.from_doc(row["note"])
    return NoteFeedItem(**base.model_dump(), copy_title=row["copy_title"], copy_artist=row["copy_artist"])


@router.post("", response_model=NoteRead)
async def create(body: NoteCreate) -> NoteRead:
    note = await create_note(body)
    return NoteRead.from_doc(note)


@router.get("", response_model=list[NoteRead])
async def list_(
    copy_id: Optional[str] = None,
    pinned: Optional[bool] = None,
    q: Optional[str] = None,
) -> list[NoteRead]:
    notes = await list_notes(copy_id=copy_id, pinned=pinned, q=q)
    return [NoteRead.from_doc(n) for n in notes]


@router.get("/feed", response_model=list[NoteFeedItem])
async def notes_feed(
    pinned: Optional[bool] = None,
    q: Optional[str] = None,
    genre: Optional[str] = None,
) -> list[NoteFeedItem]:
    rows = await feed(pinned=pinned, q=q, genre=genre)
    return [_feed_item(r) for r in rows]


@router.patch("/{note_id}", response_model=NoteRead)
async def patch(note_id: PydanticObjectId, body: NoteUpdate) -> NoteRead:
    note = await update_note(note_id, body)
    return NoteRead.from_doc(note)


@router.delete("/{note_id}", status_code=204)
async def remove(note_id: PydanticObjectId) -> Response:
    await delete_note(note_id)
    return Response(status_code=204)
