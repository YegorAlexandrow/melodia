import httpx

from app.services.discogs import DiscogsClient
from app.settings import Settings


def _settings() -> Settings:
    return Settings(discogs_token="", discogs_user_agent="TestAgent/1.0")


async def test_search_by_catno_parses_results_and_rate_limit():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["User-Agent"] == "TestAgent/1.0"
        assert request.url.params["catno"] == "С60 07271"
        return httpx.Response(
            200,
            headers={"X-Discogs-Ratelimit": "60", "X-Discogs-Ratelimit-Remaining": "58"},
            json={"results": [{"id": 1, "title": "A - B", "catno": "С60 07271"}]},
        )

    async with DiscogsClient(_settings(), transport=httpx.MockTransport(handler)) as client:
        results = await client.search_by_catno("С60 07271")
        assert results[0]["id"] == 1
        assert client.rate_limit.limit == 60
        assert client.rate_limit.remaining == 58


async def test_retries_on_429_then_succeeds():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(429, headers={"Retry-After": "0"})
        return httpx.Response(200, json={"id": 42})

    async with DiscogsClient(_settings(), transport=httpx.MockTransport(handler)) as client:
        data = await client.get_release(42)
        assert data["id"] == 42
        assert calls["n"] == 2  # один повтор после 429


async def test_token_header_present_when_configured():
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers.get("Authorization", "")
        return httpx.Response(200, json={"id": 1})

    settings = Settings(discogs_token="SECRET", discogs_user_agent="TestAgent/1.0")
    async with DiscogsClient(settings, transport=httpx.MockTransport(handler)) as client:
        await client.get_release(1)
    assert captured["auth"] == "Discogs token=SECRET"
