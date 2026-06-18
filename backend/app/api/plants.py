"""API: справочник заводов «Мелодии» (для селектора пресса)."""

from __future__ import annotations

from fastapi import APIRouter

from ..models.catalog import Plant
from ..schemas import PlantRead

router = APIRouter(prefix="/api/plants", tags=["plants"])


@router.get("", response_model=list[PlantRead])
async def list_plants() -> list[PlantRead]:
    plants = await Plant.find(Plant.not_deleted()).sort("+code").to_list()
    return [PlantRead.from_doc(p) for p in plants]
