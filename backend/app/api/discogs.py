"""API: поиск в Discogs и импорт релиза в канон."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..schemas import DiscogsCandidate, ReleaseRead
from ..services.catalog_number import normalize_catalog_number
from ..services.discogs import DiscogsClient, DiscogsError
from ..services.releases import get_cached_release, upsert_release
from ..settings import get_settings

router = APIRouter(prefix="/api", tags=["discogs"])


class SearchResponse(BaseModel):
    query_norm: Optional[str] = None
    rate_limit: Optional[int] = None
    rate_limit_remaining: Optional[int] = None
    results: list[DiscogsCandidate]


class ImportRequest(BaseModel):
    discogs_release_id: int


@router.get("/discogs/search", response_model=SearchResponse)
async def discogs_search(
    cat: Optional[str] = Query(None, description="Каталожный номер"),
    q: Optional[str] = Query(None, description="Свободный поиск (артист + название)"),
) -> SearchResponse:
    if not cat and not q:
        raise HTTPException(400, "Укажите cat или q")

    settings = get_settings()
    try:
        async with DiscogsClient(settings) as client:
            if cat:
                raw_results = await client.search_by_catno(cat)
            else:
                raw_results = await client.search(q or "")
            rate = client.rate_limit
    except DiscogsError as exc:
        raise HTTPException(502, str(exc)) from exc

    return SearchResponse(
        query_norm=normalize_catalog_number(cat) if cat else None,
        rate_limit=rate.limit,
        rate_limit_remaining=rate.remaining,
        results=[DiscogsCandidate.from_search(r) for r in raw_results if r.get("id")],
    )


@router.post("/releases/import", response_model=ReleaseRead)
async def import_release(body: ImportRequest) -> ReleaseRead:
    settings = get_settings()
    try:
        async with DiscogsClient(settings) as client:
            release = await upsert_release(client, body.discogs_release_id)
    except DiscogsError as exc:
        raise HTTPException(502, str(exc)) from exc
    return ReleaseRead.from_doc(release)


@router.get("/releases/{release_id}", response_model=ReleaseRead)
async def get_release(release_id: int) -> ReleaseRead:
    release = await get_cached_release(release_id)
    if release is None:
        raise HTTPException(404, "Релиз не найден в кэше; импортируйте его сначала")
    return ReleaseRead.from_doc(release)
