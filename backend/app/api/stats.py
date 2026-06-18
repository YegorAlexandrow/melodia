"""API: статистика коллекции (экран F)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from ..services.stats import compute_stats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
async def stats() -> dict[str, Any]:
    return await compute_stats()
