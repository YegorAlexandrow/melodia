"""Общая инициализация для тестов.

Beanie-документы нельзя инстанцировать без init_beanie, поэтому один раз при
загрузке тестов регистрируем настройки документов на локальном MongoDB. Делаем это
синхронно через asyncio.run (а не async-фикстурой), чтобы не конфликтовать с циклом
событий pytest-asyncio. Юнит-тесты маппинга только конструируют документы и к БД не
обращаются.
"""

import asyncio

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.models import catalog

TEST_DB = "vinyl_test"


async def _register_models() -> None:
    client = AsyncMongoClient("mongodb://localhost:27017", tz_aware=True)
    await init_beanie(database=client[TEST_DB], document_models=catalog.DOCUMENT_MODELS)
    await client.close()


# регистрируем модели один раз на весь прогон
asyncio.run(_register_models())
