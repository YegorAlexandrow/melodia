"""Сервис заметок (личный слой): CRUD с мягким удалением.

Заметки — markdown, привязаны к экземпляру / треку / релизу. Дата создания и правки
проставляются автоматически (BaseDoc). Закреплённые поднимаются в ленте.
"""

from __future__ import annotations

from typing import Any

from beanie import PydanticObjectId
from fastapi import HTTPException

from ..models.catalog import Copy, Note, TargetKind
from ..schemas import NoteCreate, NoteUpdate


async def create_note(data: NoteCreate) -> Note:
    note = Note(
        body=data.body,
        title=data.title,
        target_kind=data.target_kind,
        target_release_id=data.target_release_id,
        track_position=data.track_position,
        pinned=data.pinned,
        tags=data.tags,
    )
    if data.target_kind in (TargetKind.COPY, TargetKind.TRACK):
        if not data.copy_id:
            raise HTTPException(400, "Для заметки к экземпляру/треку нужен copy_id")
        copy = await Copy.get(PydanticObjectId(data.copy_id))
        if copy is None or copy.is_deleted:
            raise HTTPException(404, "Экземпляр не найден")
        note.target_copy = copy  # type: ignore[assignment]
    await note.insert()
    return note


async def list_notes(
    *, copy_id: str | None = None, pinned: bool | None = None, q: str | None = None
) -> list[Note]:
    conditions: list[Any] = [Note.not_deleted()]
    if copy_id is not None:
        # Beanie хранит Link как DBRef → путь к id это "target_copy.$id"
        conditions.append({"target_copy.$id": PydanticObjectId(copy_id)})
    if pinned is not None:
        conditions.append(Note.pinned == pinned)
    if q:
        conditions.append({"$text": {"$search": q}})

    # закреплённые сверху, затем по дате создания (убыв.)
    return await Note.find(*conditions).sort("-pinned", "-created_at").to_list()


async def feed(
    *, pinned: bool | None = None, q: str | None = None, genre: str | None = None
) -> list[dict[str, Any]]:
    """Сквозная лента заметок с привязкой к экземпляру (для экрана D)."""

    from ..models.catalog import Copy, Release  # локально — избегаем циклов

    notes = await list_notes(pinned=pinned, q=q)

    # карта copy_id → (title, artist, discogs_release_id)
    copy_ids = []
    for n in notes:
        ref = getattr(n.target_copy, "ref", None)
        if ref is not None:
            copy_ids.append(ref.id)
    copies = await Copy.find({"_id": {"$in": copy_ids}}).to_list() if copy_ids else []
    cmap = {c.id: c for c in copies}

    genre_ok: dict[int, bool] = {}
    if genre:
        rel_ids = {c.discogs_release_id for c in copies if c.discogs_release_id is not None}
        releases = (
            await Release.find({"discogs_release_id": {"$in": list(rel_ids)}}).to_list()
            if rel_ids
            else []
        )
        gmap = {r.discogs_release_id: r.genres for r in releases}
        genre_ok = {rid: (genre in gs) for rid, gs in gmap.items()}

    out: list[dict[str, Any]] = []
    for n in notes:
        ref = getattr(n.target_copy, "ref", None)
        copy = cmap.get(ref.id) if ref is not None else None
        if genre and not (copy and genre_ok.get(copy.discogs_release_id or -1, False)):
            continue
        out.append(
            {
                "note": n,
                "copy_title": copy.display_title if copy else None,
                "copy_artist": copy.display_artist if copy else None,
            }
        )
    return out


async def update_note(note_id: PydanticObjectId, data: NoteUpdate) -> Note:
    note = await Note.get(note_id)
    if note is None or note.is_deleted:
        raise HTTPException(404, "Заметка не найдена")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await note.save()
    return note


async def delete_note(note_id: PydanticObjectId) -> None:
    note = await Note.get(note_id)
    if note is None or note.is_deleted:
        raise HTTPException(404, "Заметка не найдена")
    await note.soft_delete()
