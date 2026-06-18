"""
Каталог виниловых пластинок «Мелодия» — модель данных (single-file).
MongoDB + Beanie 2.x + Pydantic v2.

Файл объединяет три части:
  1) ВРЕМЯ   — тип TimeStamp (хранится как нативная BSON-дата, наружу epoch-ms).
  2) МЕДИА   — value-объекты Media/ImageMedia (обложки, аудио, ссылки) + URL.
  3) МОДЕЛИ  — документы Beanie (канон из Discogs + личные данные).

Подключение:
    from motor.motor_asyncio import AsyncIOMotorClient
    from beanie import init_beanie

    client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)   # tz_aware обязателен!
    await init_beanie(client["vinyl"], document_models=DOCUMENT_MODELS)
    await seed_plants()
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Annotated, Any, Optional
from urllib.parse import urljoin

import pymongo
from beanie import (
    Document,
    Insert,
    Link,
    PydanticObjectId,
    Replace,
    Save,
    SaveChanges,
    Update,
    before_event,
)
from pydantic import BaseModel, Field, model_validator
from pydantic.functional_serializers import PlainSerializer


# =========================================================================== #
#  1. ВРЕМЯ
# =========================================================================== #
def _to_epoch_ms(dt: datetime) -> int:
    """Serialize a datetime to epoch milliseconds.

    Motor возвращает даты из Mongo как naive-UTC. У naive datetime метод
    .timestamp() интерпретирует время как локальное и даёт неверный epoch,
    поэтому naive здесь трактуется как UTC. Для tz-aware дат результат
    совпадает с int(dt.timestamp() * 1000).
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


TimeStamp = Annotated[
    datetime,
    PlainSerializer(_to_epoch_ms, return_type=int),
]


def now() -> "TimeStamp":
    """Return the current UTC time."""

    return datetime.now(timezone.utc)


# =========================================================================== #
#  2. МЕДИА
# =========================================================================== #
# Базовые URL — подставь из своих настроек (app.settings и т.п.).
MEDIA_S3_BASE_URL: str = ""
MEDIA_LOCAL_BASE_URL: str = ""


class MediaLocation(str, Enum):
    """Где физически лежит медиа."""

    WEB = "web"      # внешний URL как есть (Discogs, YouTube) — key и есть полный URL
    S3 = "s3"        # объект в бакете, key — ключ объекта
    LOCAL = "local"  # файл локально/на NAS, key — относительный путь


def build_media_url(
    key: str,
    loc: MediaLocation,
    *,
    s3_base: Optional[str] = None,
    local_base: Optional[str] = None,
) -> str:
    """Собрать публичный URL по ключу и расположению."""

    if loc is MediaLocation.WEB:
        return key

    if loc is MediaLocation.S3:
        base = (s3_base if s3_base is not None else MEDIA_S3_BASE_URL or "").rstrip("/") + "/"
        return urljoin(base, key.lstrip("/")) if base.strip("/") else key

    if loc is MediaLocation.LOCAL:
        base = (local_base if local_base is not None else MEDIA_LOCAL_BASE_URL or "").rstrip("/") + "/"
        return urljoin(base, key.lstrip("/")) if base.strip("/") else key

    raise ValueError(f"Unsupported media location: {loc}")


class Media(BaseModel):
    """Локатор медиа + базовые метаданные. Хранится встроенно в Mongo."""

    key: str
    loc: MediaLocation
    mime_type: str = "application/octet-stream"
    created_at: TimeStamp = Field(default_factory=now)
    updated_at: TimeStamp = Field(default_factory=now)


class ImageMedia(Media):
    """Обложка/скан. Из Discogs приходит как loc=WEB (key=uri);
    после локального кэширования меняешь на loc=LOCAL/S3 и относительный key."""

    mime_type: str = "image/webp"
    role: Optional[str] = None      # primary / secondary / thumbnail
    width: Optional[int] = None
    height: Optional[int] = None


class MediaCreate(BaseModel):
    """Входящий payload от клиента."""

    key: str
    loc: MediaLocation
    mime_type: str = "application/octet-stream"


class MediaRead(BaseModel):
    """Исходящее представление с готовым публичным URL."""

    key: str
    loc: MediaLocation
    mime_type: str
    role: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    url: str = Field(default="")

    @model_validator(mode="after")
    def _ensure_url(self) -> "MediaRead":
        self.url = build_media_url(self.key, self.loc)
        return self


def media_from_create(payload: MediaCreate) -> Media:
    """Schema -> хранимый value-объект."""

    return Media(
        key=payload.key,
        loc=payload.loc,
        mime_type=payload.mime_type,
        created_at=now(),
        updated_at=now(),
    )


def media_to_read(media: Media | None) -> MediaRead | None:
    """Хранимый value-объект -> API-представление (+url)."""

    if media is None:
        return None
    return MediaRead(
        key=media.key,
        loc=media.loc,
        mime_type=media.mime_type,
        role=getattr(media, "role", None),
        width=getattr(media, "width", None),
        height=getattr(media, "height", None),
    )


# =========================================================================== #
#  3. МОДЕЛИ
# =========================================================================== #

# --- Базовый документ: таймстампы + мягкое удаление --------------------------
class BaseDoc(Document):
    created_at: TimeStamp = Field(default_factory=now)   # когда добавлено в БД
    updated_at: TimeStamp = Field(default_factory=now)   # когда последний раз менялось
    deleted_at: Optional[TimeStamp] = None               # мягкое удаление

    @before_event(Insert)
    def _stamp_created(self) -> None:
        ts = now()
        self.created_at = ts
        self.updated_at = ts

    @before_event(Replace, Save, SaveChanges, Update)
    def _stamp_updated(self) -> None:
        self.updated_at = now()

    async def soft_delete(self) -> None:
        """Помечает удалённым, не стирая из базы."""
        self.deleted_at = now()
        await self.save()

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @classmethod
    def not_deleted(cls):
        """Хелпер для выборок без мягко удалённых: Copy.find(Copy.not_deleted())."""
        return cls.deleted_at == None  # noqa: E711


# --- Перечисления ------------------------------------------------------------
class GoldmineGrade(str, Enum):
    """Стандарт сохранности Goldmine."""
    MINT = "M"
    NEAR_MINT = "NM"
    VG_PLUS = "VG+"
    VG = "VG"
    GOOD_PLUS = "G+"
    GOOD = "G"
    FAIR = "F"
    POOR = "P"


class SoundMode(str, Enum):
    MONO = "mono"
    STEREO = "stereo"
    QUAD = "quad"        # квадрофония — у «Мелодии» была отдельная серия


class CopyStatus(str, Enum):
    OWNED = "owned"
    WANTED = "wanted"      # вишлист / в розыске
    ORDERED = "ordered"    # заказано, едет
    SOLD = "sold"
    GIFTED = "gifted"
    LENT_OUT = "lent_out"  # отдал послушать


class AudioRole(str, Enum):
    TRACK = "track"            # привязка к конкретному треку
    FULL_SIDE = "full_side"    # сторона целиком
    FULL_ALBUM = "full_album"  # весь диск одним файлом
    REFERENCE = "reference"    # сторонний референс (ютуб, чужая оцифровка)


class AudioSource(str, Enum):
    NEEDLEDROP = "needledrop"  # своя оцифровка с винила
    DOWNLOAD = "download"
    OTHER = "other"


class TargetKind(str, Enum):
    """К чему привязана заметка / аудио."""
    COPY = "copy"
    RELEASE = "release"
    MASTER = "master"
    TRACK = "track"


# --- Встраиваемые модели -----------------------------------------------------
class ArtistRef(BaseModel):
    name: str
    discogs_id: Optional[int] = None
    anv: Optional[str] = None     # artist name variation (как указан на издании)
    role: Optional[str] = None
    join: Optional[str] = None    # "feat.", "&", и т.п.


class Track(BaseModel):
    position: str                       # "A1", "B3"
    side: Optional[str] = None          # 'A' / 'B' / 'C' ...
    seq: Optional[int] = None           # сквозной порядок для сортировки
    title: str
    artist: Optional[str] = None        # для сборников / VA
    duration_text: Optional[str] = None  # "3:45" как в Discogs
    duration_sec: Optional[int] = None
    composer: Optional[str] = None       # у «Мелодии» классики — важно
    performers: list[str] = Field(default_factory=list)


class Identifier(BaseModel):
    """Discogs identifiers: матрица из выплавки, ГОСТ, штрихкод и пр."""
    type: str                 # "Matrix / Runout", "Rights Society", "Barcode", "Other"
    value: str
    description: Optional[str] = None


class VideoRef(BaseModel):
    uri: str
    title: Optional[str] = None
    duration_sec: Optional[int] = None
    description: Optional[str] = None


class Grade(BaseModel):
    """Сохранность по Goldmine — отдельно пластинка, отдельно конверт."""
    media: Optional[GoldmineGrade] = None
    sleeve: Optional[GoldmineGrade] = None
    graded_at: TimeStamp = Field(default_factory=now)
    note: Optional[str] = None


class Acquisition(BaseModel):
    acquired_on: Optional[date] = None  # когда купил / получил (календарная дата)
    source: Optional[str] = None        # "Авито", "блошка", "подарок", "наследство"
    seller: Optional[str] = None
    place: Optional[str] = None
    price: Optional[float] = None
    currency: str = "RUB"
    note: Optional[str] = None


class Pressing(BaseModel):
    """Признаки конкретного пресса — то, чем различаются экземпляры «Мелодии»."""
    plant_id: Optional[PydanticObjectId] = None  # ссылка на Plant по id (вложено -> не Link)
    plant_code: Optional[str] = None             # дубль кода для быстрого фильтра
    matrix_runout: Optional[str] = None          # то, что нацарапано в выплавке
    order_number: Optional[str] = None           # номер заказа на этикетке
    label_variant: Optional[str] = None          # дизайн/тип этикетки
    label_color: Optional[str] = None
    sound_mode: Optional[SoundMode] = None
    speed_rpm: int = 33
    diameter_cm: Optional[int] = None            # 30 / 25 / 17
    gost: Optional[str] = None                   # ГОСТ, указанный на этикетке
    pressing_year: Optional[int] = None          # год пресса (часто ≠ год релиза)
    note: Optional[str] = None


class Loan(BaseModel):
    """Кому отдал послушать."""
    borrower: str
    lent_at: TimeStamp = Field(default_factory=now)
    due_back: Optional[date] = None
    returned_at: Optional[TimeStamp] = None
    note: Optional[str] = None


class RatingEntry(BaseModel):
    """Запись истории оценок — копится, не перезатирается."""
    album: Optional[int] = None   # вкусовая оценка музыки (1..5)
    sound: Optional[int] = None   # оценка звучания этого пресса (1..5)
    rated_at: TimeStamp = Field(default_factory=now)
    note: Optional[str] = None


class Valuation(BaseModel):
    """Оценочная стоимость во времени (например, медиана Discogs)."""
    value: float
    currency: str = "USD"
    source: str = "discogs"
    valued_at: TimeStamp = Field(default_factory=now)


class AudioTarget(BaseModel):
    """К чему прицеплен аудиофайл: к треку, стороне, экземпляру целиком и т.д."""
    kind: TargetKind
    role: AudioRole = AudioRole.TRACK
    copy_id: Optional[PydanticObjectId] = None
    release_id: Optional[int] = None       # discogs release id
    track_position: Optional[str] = None   # "A1"
    side: Optional[str] = None             # 'A' / 'B' для FULL_SIDE


# --- Справочник: заводы «Мелодии» --------------------------------------------
class Plant(BaseDoc):
    code: str
    name: str
    city: Optional[str] = None
    aliases: list[str] = Field(default_factory=list)
    active_from: Optional[int] = None
    active_to: Optional[int] = None
    note: Optional[str] = None

    class Settings:
        name = "plants"
        indexes = [
            pymongo.IndexModel([("code", pymongo.ASCENDING)], unique=True),
        ]


# --- Канон из Discogs --------------------------------------------------------
class Master(BaseDoc):
    discogs_master_id: int
    title: str
    main_release_id: Optional[int] = None
    year: Optional[int] = None
    artists: list[ArtistRef] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)
    styles: list[str] = Field(default_factory=list)
    images: list[ImageMedia] = Field(default_factory=list)
    videos: list[VideoRef] = Field(default_factory=list)
    discogs_uri: Optional[str] = None
    raw: dict[str, Any] = Field(default_factory=dict)        # сырой ответ Discogs
    fetched_at: TimeStamp = Field(default_factory=now)

    class Settings:
        name = "masters"
        indexes = [
            pymongo.IndexModel([("discogs_master_id", pymongo.ASCENDING)], unique=True),
        ]


class Release(BaseDoc):
    discogs_release_id: int
    master: Optional[Link[Master]] = None
    discogs_master_id: Optional[int] = None

    title: str
    artists: list[ArtistRef] = Field(default_factory=list)
    primary_artist: Optional[str] = None

    label: Optional[str] = "Мелодия"
    catalog_number: Optional[str] = None        # как у Discogs ("С60—12345—6")
    catalog_number_norm: Optional[str] = None   # нормализованный для поиска
    prefix: Optional[str] = None                # Д / С / С60 / Г ...
    series: Optional[str] = None

    country: Optional[str] = "USSR"
    released_year: Optional[int] = None
    released_date: Optional[date] = None        # календарная дата релиза

    formats: list[str] = Field(default_factory=list)   # ["Vinyl", "LP", "Album"]
    sound_mode: Optional[SoundMode] = None
    genres: list[str] = Field(default_factory=list)
    styles: list[str] = Field(default_factory=list)

    tracklist: list[Track] = Field(default_factory=list)
    identifiers: list[Identifier] = Field(default_factory=list)  # матрица и пр.
    images: list[ImageMedia] = Field(default_factory=list)
    videos: list[VideoRef] = Field(default_factory=list)

    discogs_uri: Optional[str] = None
    notes_discogs: Optional[str] = None    # поле notes из самого Discogs

    raw: dict[str, Any] = Field(default_factory=dict)
    fetched_at: TimeStamp = Field(default_factory=now)

    class Settings:
        name = "releases"
        indexes = [
            pymongo.IndexModel([("discogs_release_id", pymongo.ASCENDING)], unique=True),
            pymongo.IndexModel([("catalog_number_norm", pymongo.ASCENDING)]),
            pymongo.IndexModel([("discogs_master_id", pymongo.ASCENDING)]),
            pymongo.IndexModel(
                [("title", pymongo.TEXT), ("primary_artist", pymongo.TEXT)],
                name="release_text",
            ),
        ]


# --- Личное: физический экземпляр на полке -----------------------------------
class Copy(BaseDoc):
    # связь с каноном
    release: Optional[Link[Release]] = None
    discogs_release_id: Optional[int] = None
    master: Optional[Link[Master]] = None

    status: CopyStatus = CopyStatus.OWNED

    # денормализованные поля — чтобы списки и поиск работали без джойнов
    display_title: Optional[str] = None
    display_artist: Optional[str] = None
    catalog_number: Optional[str] = None
    year: Optional[int] = None
    cover: Optional[ImageMedia] = None       # обложка этого экземпляра (или из релиза)

    # физика конкретного диска
    grade: Optional[Grade] = None
    pressing: Optional[Pressing] = None
    acquisition: Optional[Acquisition] = None
    loan: Optional[Loan] = None

    # оценки: текущее значение + полная история с датами
    current_album_rating: Optional[int] = None
    current_sound_rating: Optional[int] = None
    rating_history: list[RatingEntry] = Field(default_factory=list)

    # стоимость во времени
    valuations: list[Valuation] = Field(default_factory=list)

    # прослушивания: кэш-счётчики (сами события — в коллекции PlayEvent)
    play_count: int = 0
    first_played_at: Optional[TimeStamp] = None
    last_played_at: Optional[TimeStamp] = None

    tags: list[str] = Field(default_factory=list)
    is_favorite: bool = False
    storage_location: Optional[str] = None   # где стоит ("полка 3, секция Б")

    class Settings:
        name = "copies"
        indexes = [
            pymongo.IndexModel([("discogs_release_id", pymongo.ASCENDING)]),
            pymongo.IndexModel([("status", pymongo.ASCENDING)]),
            pymongo.IndexModel([("tags", pymongo.ASCENDING)]),
            pymongo.IndexModel([("is_favorite", pymongo.ASCENDING)]),
            pymongo.IndexModel([("pressing.plant_code", pymongo.ASCENDING)]),
            pymongo.IndexModel([("last_played_at", pymongo.DESCENDING)]),
            pymongo.IndexModel(
                [("display_title", pymongo.TEXT), ("display_artist", pymongo.TEXT)],
                name="copy_text",
            ),
        ]

    def add_rating(
        self,
        album: Optional[int] = None,
        sound: Optional[int] = None,
        note: Optional[str] = None,
    ) -> RatingEntry:
        """Добавляет запись в историю оценок и обновляет текущие значения."""
        entry = RatingEntry(album=album, sound=sound, note=note)
        self.rating_history.append(entry)
        if album is not None:
            self.current_album_rating = album
        if sound is not None:
            self.current_sound_rating = sound
        return entry


# --- Личное: заметки ---------------------------------------------------------
class Note(BaseDoc):
    body: str                       # markdown
    title: Optional[str] = None
    target_kind: TargetKind

    target_copy: Optional[Link[Copy]] = None
    target_release_id: Optional[int] = None
    target_master_id: Optional[int] = None
    track_position: Optional[str] = None   # если заметка к конкретному треку

    pinned: bool = False
    tags: list[str] = Field(default_factory=list)

    class Settings:
        name = "notes"
        indexes = [
            pymongo.IndexModel([("target_kind", pymongo.ASCENDING)]),
            pymongo.IndexModel([("target_release_id", pymongo.ASCENDING)]),
            pymongo.IndexModel([("created_at", pymongo.DESCENDING)]),
            pymongo.IndexModel([("pinned", pymongo.DESCENDING)]),
            pymongo.IndexModel([("body", pymongo.TEXT)], name="note_text"),
        ]


# --- Личное: аудиофайлы ------------------------------------------------------
class AudioFile(BaseDoc):
    media: Media                    # локатор: key + loc(LOCAL/S3/WEB) + mime_type
    sha256: Optional[str] = None
    source: AudioSource = AudioSource.NEEDLEDROP
    title: Optional[str] = None

    # технические метаданные (можно вычитать автоматически, напр. mutagen)
    file_format: Optional[str] = None    # flac / wav / mp3
    sample_rate: Optional[int] = None    # 44100, 96000 ...
    bit_depth: Optional[int] = None      # 16 / 24
    channels: Optional[int] = None
    bitrate_kbps: Optional[int] = None
    duration_sec: Optional[float] = None
    size_bytes: Optional[int] = None

    # обстоятельства оцифровки — винильные нюансы
    recorded_at: Optional[TimeStamp] = None  # когда снята оцифровка
    cartridge: Optional[str] = None          # головка звукоснимателя
    stylus: Optional[str] = None             # игла
    preamp: Optional[str] = None             # фонокорректор
    adc: Optional[str] = None                # АЦП
    gain_db: Optional[float] = None
    processing: Optional[str] = None         # "click removal RX11", "без обработки"

    targets: list[AudioTarget] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

    class Settings:
        name = "audio_files"
        indexes = [
            pymongo.IndexModel([("sha256", pymongo.ASCENDING)]),
            pymongo.IndexModel([("source", pymongo.ASCENDING)]),
            pymongo.IndexModel([("recorded_at", pymongo.DESCENDING)]),
            pymongo.IndexModel([("targets.copy_id", pymongo.ASCENDING)]),
            pymongo.IndexModel([("targets.release_id", pymongo.ASCENDING)]),
        ]


# --- Личное: история прослушиваний -------------------------------------------
class PlayEvent(BaseDoc):
    copy_ref: Link[Copy]
    copy_id_ref: Optional[PydanticObjectId] = None  # дубль id для агрегаций по датам
    played_at: TimeStamp = Field(default_factory=now)
    side_played: Optional[str] = None     # послушал только сторону B
    full_play: bool = True
    equipment: Optional[str] = None       # на какой вертушке слушал
    note: Optional[str] = None

    class Settings:
        name = "play_events"
        indexes = [
            pymongo.IndexModel([("played_at", pymongo.DESCENDING)]),
            pymongo.IndexModel([("copy_id_ref", pymongo.ASCENDING)]),
        ]


# =========================================================================== #
#  Регистрация моделей + сид-данные
# =========================================================================== #
DOCUMENT_MODELS = [Plant, Master, Release, Copy, Note, AudioFile, PlayEvent]

# Сид-список заводов «Мелодии» — залить один раз при инициализации.
MELODIYA_PLANTS: list[dict[str, Any]] = [
    {"code": "ALZ", "name": "Апрелевский завод грампластинок", "city": "Апрелевка"},
    {"code": "LZG", "name": "Ленинградский завод грампластинок (ЛЗГ)", "city": "Ленинград"},
    {"code": "RZG", "name": "Рижский завод грампластинок", "city": "Рига"},
    {"code": "TZG", "name": "Ташкентский завод грампластинок", "city": "Ташкент"},
    {"code": "TBZ", "name": "Тбилисский завод грампластинок", "city": "Тбилиси"},
    {"code": "BZG", "name": "Бакинский завод грампластинок", "city": "Баку"},
    {"code": "MOZ", "name": "Московский опытный завод «Грамзапись»", "city": "Москва"},
    {"code": "VSG", "name": "Всесоюзная студия грамзаписи (ВСГ)", "city": "Москва"},
]


async def seed_plants() -> None:
    """Идемпотентно заливает справочник заводов (вызвать после init_beanie)."""
    for p in MELODIYA_PLANTS:
        if not await Plant.find_one(Plant.code == p["code"]):
            await Plant(**p).insert()
