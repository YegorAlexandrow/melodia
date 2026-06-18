"""Health-эндпоинт: подтверждает связность с MongoDB и что сид заводов прошёл."""

from __future__ import annotations

from fastapi import APIRouter

from ..db import get_client
from ..models.catalog import Plant

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health() -> dict[str, object]:
    """Пинг БД + число заводов в справочнике."""

    await get_client().admin.command("ping")
    plants = await Plant.find(Plant.not_deleted()).count()
    return {"status": "ok", "plants": plants}
