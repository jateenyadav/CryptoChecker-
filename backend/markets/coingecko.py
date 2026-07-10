"""
Server-side CoinGecko client with a short-lived in-process TTL cache and
request de-duplication. This mirrors (and replaces) the client-side cache
that used to live in the browser, so the browser now talks only to our API
and never hits CoinGecko's rate limit directly.
"""
import threading
import time
from typing import Any, Optional

import requests
from django.conf import settings

_CACHE: dict[str, tuple[float, Any]] = {}
_LOCK = threading.Lock()

SUPPORTED_CURRENCIES = ["usd", "eur", "gbp", "inr", "jpy", "aud", "cad"]


class UpstreamError(Exception):
    """Raised when the upstream market provider fails."""


def _headers() -> dict:
    key = settings.COINGECKO_API_KEY
    return {"x-cg-demo-api-key": key} if key else {}


def _get(path: str, params: dict, ttl: Optional[int] = None) -> Any:
    ttl = settings.MARKET_CACHE_TTL if ttl is None else ttl
    key = f"{path}?{sorted(params.items())}"
    now = time.time()

    with _LOCK:
        hit = _CACHE.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]

    url = f"{settings.COINGECKO_BASE_URL}{path}"
    try:
        resp = requests.get(url, params=params, headers=_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else None
        # Serve stale data rather than failing outright, if we have any.
        with _LOCK:
            hit = _CACHE.get(key)
        if hit:
            return hit[1]
        if status == 429:
            raise UpstreamError("Rate limited by market provider. Please retry shortly.")
        raise UpstreamError("Failed to load market data.") from exc
    except requests.RequestException as exc:
        with _LOCK:
            hit = _CACHE.get(key)
        if hit:
            return hit[1]
        raise UpstreamError("Network error contacting market provider.") from exc

    with _LOCK:
        _CACHE[key] = (now, data)
    return data


def get_markets(currency="usd", page=1, per_page=50, ids=None, order="market_cap_desc"):
    params = {
        "vs_currency": currency,
        "order": order,
        "per_page": per_page,
        "page": page,
        "sparkline": "true",
        "price_change_percentage": "1h,24h,7d",
    }
    if ids:
        params["ids"] = ",".join(ids)
    return _get("/coins/markets", params, ttl=45)


def get_coin(coin_id: str):
    return _get(
        f"/coins/{coin_id}",
        {
            "localization": "false",
            "tickers": "false",
            "market_data": "true",
            "community_data": "false",
            "developer_data": "false",
            "sparkline": "false",
        },
        ttl=60,
    )


def get_coin_chart(coin_id: str, currency="usd", days=7):
    return _get(
        f"/coins/{coin_id}/market_chart",
        {"vs_currency": currency, "days": days},
        ttl=60,
    )


def get_global():
    return _get("/global", {}, ttl=120)


def get_trending():
    return _get("/search/trending", {}, ttl=120)


def search(query: str):
    q = (query or "").strip()
    if not q:
        return {"coins": []}
    return _get("/search", {"query": q}, ttl=60)


def get_simple_price(ids, currency="usd"):
    if not ids:
        return {}
    return _get(
        "/simple/price",
        {
            "ids": ",".join(ids),
            "vs_currencies": currency,
            "include_24hr_change": "true",
        },
        ttl=45,
    )
