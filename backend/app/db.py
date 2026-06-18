"""Подключение к MongoDB и инициализация Beanie.

Beanie 2.x использует нативный async-драйвер PyMongo (``AsyncMongoClient``) —
Motor больше не нужен. Клиент создаётся с ``tz_aware=True``: это обязательное
требование модели данных (см. ``catalog.py`` — иначе сериализация ``TimeStamp``
в epoch-ms даёт неверный результат). Здесь же из настроек прокидываются базовые
URL для медиа и заливается идемпотентный справочник заводов «Мелодии».
"""

from __future__ import annotations

from beanie import init_beanie
from pymongo import AsyncMongoClient

from .models import catalog
from .settings import Settings

_client: AsyncMongoClient | None = None


def get_client() -> AsyncMongoClient:
    """Вернуть активный клиент Mongo (после ``init_db``)."""

    if _client is None:
        raise RuntimeError("MongoDB client is not initialised; call init_db() first")
    return _client


async def init_db(settings: Settings) -> AsyncMongoClient:
    """Поднять клиент, инициализировать Beanie и залить сид заводов."""

    global _client

    # Прокидываем базовые URL медиа в готовую модель (единственная точка интеграции).
    catalog.MEDIA_S3_BASE_URL = settings.media_s3_base_url
    catalog.MEDIA_LOCAL_BASE_URL = settings.media_local_base_url

    _client = AsyncMongoClient(settings.mongo_url, tz_aware=True)
    await init_beanie(
        database=_client[settings.db_name],
        document_models=catalog.DOCUMENT_MODELS,
    )
    await catalog.seed_plants()
    return _client


async def close_db() -> None:
    """Закрыть клиент при остановке приложения."""

    global _client
    if _client is not None:
        await _client.close()
        _client = None
