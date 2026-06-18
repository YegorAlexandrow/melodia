"""Конфигурация приложения (pydantic-settings).

Все значения опциональны и имеют дефолты — скелет должен подниматься без .env
и без секретов. Реальные значения берутся из переменных окружения или .env.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- MongoDB ---
    mongo_url: str = "mongodb://localhost:27017"
    db_name: str = "vinyl"

    # --- Медиа (базовые URL для сборки публичных ссылок на обложки/аудио) ---
    media_s3_base_url: str = ""
    media_local_base_url: str = ""

    # --- Discogs (используется на следующем шаге; здесь только конфиг) ---
    discogs_token: str = ""
    discogs_user_agent: str = "MelodiaCatalog/0.1 (+self-hosted)"

    # --- CORS: источники фронтенда ---
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


@lru_cache
def get_settings() -> Settings:
    """Закэшированный singleton настроек."""

    return Settings()
