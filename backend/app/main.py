"""Точка входа FastAPI.

На старте поднимает MongoDB/Beanie и заливает справочник заводов, на остановке
закрывает клиент. Бизнес-логики на этом шаге нет — только скелет и проверка данных.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.audio import router as audio_router
from .api.copies import router as copies_router
from .api.discogs import router as discogs_router
from .api.health import router as health_router
from .api.notes import router as notes_router
from .api.plants import router as plants_router
from .api.stats import router as stats_router
from .db import close_db, init_db
from .services.media import media_root
from .settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    await init_db(settings)
    try:
        yield
    finally:
        await close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Фонотека — каталог винила «Мелодия»",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(discogs_router)
    app.include_router(copies_router)
    app.include_router(notes_router)
    app.include_router(plants_router)
    app.include_router(audio_router)
    app.include_router(stats_router)

    # Отдача локальных медиа (обложки/аудио). URL собирается build_media_url
    # из media_local_base_url (по умолчанию "/api/media/").
    app.mount(
        "/api/media",
        StaticFiles(directory=str(media_root(settings))),
        name="media",
    )
    return app


app = create_app()
