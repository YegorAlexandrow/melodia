"""Сервис прослушиваний: создание PlayEvent с инкрементом счётчиков на Copy.

Логика счётчиков живёт здесь (в сервисе), а не в модели: при создании события
растят play_count, проставляют first/last_played_at.
"""

from __future__ import annotations

from beanie import PydanticObjectId

from ..models.catalog import Copy, PlayEvent


async def add_play_event(
    copy: Copy,
    *,
    side_played: str | None = None,
    full_play: bool = True,
    equipment: str | None = None,
    note: str | None = None,
) -> PlayEvent:
    event = PlayEvent(
        copy_ref=copy,  # type: ignore[arg-type]
        copy_id_ref=copy.id,
        side_played=side_played,
        full_play=full_play,
        equipment=equipment,
        note=note,
    )
    await event.insert()

    copy.play_count += 1
    if copy.first_played_at is None:
        copy.first_played_at = event.played_at
    copy.last_played_at = event.played_at
    await copy.save()
    return event


async def list_play_events(copy_id: PydanticObjectId) -> list[PlayEvent]:
    return (
        await PlayEvent.find(
            {"copy_id_ref": copy_id}, PlayEvent.not_deleted()
        )
        .sort("-played_at")
        .to_list()
    )
