"""Сервис аудио: привязка оцифровок/референсов к экземпляру (трек/сторона/диск).

Свои оцифровки кладём в локальную папку (loc=LOCAL); референсы — внешняя ссылка
(loc=WEB). Технические поля своих файлов по возможности заполняем через mutagen.
Воспроизведение — ссылка/скачивание (плеера нет), отдача файла — статикой /api/media.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

from beanie import PydanticObjectId
from fastapi import HTTPException, UploadFile

from ..models.catalog import (
    AudioFile,
    AudioRole,
    AudioSource,
    AudioTarget,
    Media,
    MediaLocation,
    TargetKind,
    now,
)
from ..settings import Settings
from .media import media_root

logger = logging.getLogger(__name__)

AUDIO_SUBDIR = "audio"

# binding с фронта → (kind, role)
_BINDING: dict[str, tuple[TargetKind, AudioRole]] = {
    "track": (TargetKind.TRACK, AudioRole.TRACK),
    "side": (TargetKind.COPY, AudioRole.FULL_SIDE),
    "album": (TargetKind.COPY, AudioRole.FULL_ALBUM),
    "ref": (TargetKind.COPY, AudioRole.REFERENCE),
}


def _autofill_tech(path: Path) -> dict:
    """Считать тех-поля аудиофайла через mutagen (best-effort)."""

    try:
        from mutagen import File as MutagenFile  # локальный импорт — не тянуть на старте

        mf = MutagenFile(str(path))
        if mf is None or mf.info is None:
            return {}
        info = mf.info
        data = {
            "duration_sec": getattr(info, "length", None),
            "channels": getattr(info, "channels", None),
            "sample_rate": getattr(info, "sample_rate", None),
            "bit_depth": getattr(info, "bits_per_sample", None),
            "file_format": os.path.splitext(path.name)[1].lstrip(".").lower() or None,
        }
        bitrate = getattr(info, "bitrate", None)
        if bitrate:
            data["bitrate_kbps"] = int(bitrate / 1000)
        return {k: v for k, v in data.items() if v is not None}
    except Exception as exc:  # noqa: BLE001 — автозаполнение необязательно
        logger.warning("mutagen не смог прочитать %s: %s", path, exc)
        return {}


async def create_audio(
    settings: Settings,
    *,
    copy_id: str,
    binding: str,
    file: UploadFile | None,
    url: str | None,
    title: str | None = None,
    source: AudioSource = AudioSource.NEEDLEDROP,
    track_position: str | None = None,
    side: str | None = None,
    cartridge: str | None = None,
    preamp: str | None = None,
    adc: str | None = None,
    processing: str | None = None,
) -> AudioFile:
    if binding not in _BINDING:
        raise HTTPException(400, f"Неизвестная привязка: {binding}")
    kind, role = _BINDING[binding]

    tech: dict = {}
    if file is not None:
        ext = os.path.splitext(file.filename or "")[1] or ".bin"
        key = f"{AUDIO_SUBDIR}/{uuid.uuid4().hex}{ext}"
        dest = media_root(settings) / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(await file.read())
        media = Media(
            key=key,
            loc=MediaLocation.LOCAL,
            mime_type=file.content_type or "application/octet-stream",
        )
        tech = _autofill_tech(dest)
        tech["size_bytes"] = dest.stat().st_size
    elif url:
        media = Media(key=url, loc=MediaLocation.WEB, mime_type="text/uri-list")
        if source is AudioSource.NEEDLEDROP:
            source = AudioSource.OTHER  # внешняя ссылка — не своя оцифровка
    else:
        raise HTTPException(400, "Нужен файл или ссылка (url)")

    audio = AudioFile(
        media=media,
        source=source,
        title=title,
        cartridge=cartridge,
        preamp=preamp,
        adc=adc,
        processing=processing,
        recorded_at=now() if file is not None else None,
        targets=[
            AudioTarget(
                kind=kind,
                role=role,
                copy_id=PydanticObjectId(copy_id),
                track_position=track_position,
                side=side,
            )
        ],
        **tech,
    )
    await audio.insert()
    return audio


async def list_audio(copy_id: str) -> list[AudioFile]:
    return await AudioFile.find(
        {"targets.copy_id": PydanticObjectId(copy_id)},
        AudioFile.not_deleted(),
    ).sort("+created_at").to_list()


async def delete_audio(audio_id: PydanticObjectId) -> None:
    audio = await AudioFile.get(audio_id)
    if audio is None or audio.is_deleted:
        raise HTTPException(404, "Аудио не найдено")
    await audio.soft_delete()
