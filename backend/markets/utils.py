"""
Shared helpers for the API layer.

Session identity: rather than requiring full auth for a portfolio demo, we
scope user-owned rows (watchlist / portfolio / alerts) to a client-supplied
session key sent via the `X-Session-Key` header. This keeps the app usable
without login while still persisting data server-side in PostgreSQL. Swapping
this for real auth later only touches `get_session_key`.
"""
from .models import Coin


def get_session_key(request) -> str:
    return request.headers.get("X-Session-Key", "").strip() or "anonymous"


def upsert_coin(ref: dict) -> Coin:
    coin, _ = Coin.objects.update_or_create(
        coingecko_id=ref["id"],
        defaults={
            "symbol": ref.get("symbol", "") or "",
            "name": ref.get("name", "") or ref["id"],
            "image": ref.get("image", "") or "",
        },
    )
    return coin
