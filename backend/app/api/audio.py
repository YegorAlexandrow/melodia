"""API: аудио (привязка оцифровок/референсов, список, удаление).

Создание принимает multipart: либо файл (своя оцифровка → loc=LOCAL), либо url
(внешний референс → loc=WEB). Воспроизведение — ссылка/скачивание (см. AudioRead.url).
"""

from __future__ import annotations

from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, File, Form, Response, UploadFile

from ..models.catalog import AudioSource
from ..schemas import AudioRead
from ..services.audio import create_audio, delete_audio, list_audio
from ..settings import get_settings

router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.post("", response_model=AudioRead)
async def create(
    copy_id: str = Form(...),
    binding: str = Form(...),  # track | side | album | ref
    title: Optional[str] = Form(None),
    source: AudioSource = Form(AudioSource.NEEDLEDROP),
    track_position: Optional[str] = Form(None),
    side: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    cartridge: Optional[str] = Form(None),
    preamp: Optional[str] = Form(None),
    adc: Optional[str] = Form(None),
    processing: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
) -> AudioRead:
    audio = await create_audio(
        get_settings(),
        copy_id=copy_id,
        binding=binding,
        file=file,
        url=url,
        title=title,
        source=source,
        track_position=track_position,
        side=side,
        cartridge=cartridge,
        preamp=preamp,
        adc=adc,
        processing=processing,
    )
    return AudioRead.from_doc(audio)


@router.get("", response_model=list[AudioRead])
async def list_(copy_id: str) -> list[AudioRead]:
    items = await list_audio(copy_id)
    return [AudioRead.from_doc(a) for a in items]


@router.delete("/{audio_id}", status_code=204)
async def remove(audio_id: PydanticObjectId) -> Response:
    await delete_audio(audio_id)
    return Response(status_code=204)
