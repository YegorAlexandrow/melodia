"""Точка входа FastAPI.

На старте поднимает MongoDB/Beanie и заливает справочник заводов, на остановке
закрывает клиент. Бизнес-логики на этом шаге нет — только скелет и проверка данных.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.discogs import router as discogs_router
from .api.health import router as health_router
from .db import close_db, init_db
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
    return app


app = create_app()
