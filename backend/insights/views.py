"""GenAI insight endpoints: market, coin, and portfolio analysis."""
import json
from datetime import timedelta

from django.utils import timezone
from markets import coingecko
from markets.models import Holding
from markets.utils import get_session_key
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import genai
from .models import InsightCache

CACHE_TTL = timedelta(minutes=15)


def _cached_or_generate(kind: str, payload_key: str, prompt: str):
    prompt_hash = InsightCache.make_hash(kind, payload_key)
    existing = InsightCache.objects.filter(prompt_hash=prompt_hash).first()
    if existing and timezone.now() - existing.created_at < CACHE_TTL:
        return {"content": existing.content, "model": existing.model_name, "cached": True}

    content, model_name = genai.generate(prompt)
    InsightCache.objects.update_or_create(
        prompt_hash=prompt_hash,
        defaults={"kind": kind, "content": content, "model_name": model_name},
    )
    return {"content": content, "model": model_name, "cached": False}


@api_view(["GET"])
def market_insight(request):
    try:
        data = coingecko.get_global()
    except coingecko.UpstreamError as exc:
        return Response({"error": str(exc)}, status=502)
    prompt = genai.market_prompt(data)
    key = json.dumps((data or {}).get("data", {}).get("total_market_cap", {}), sort_keys=True)
    return Response(_cached_or_generate(InsightCache.KIND_MARKET, key, prompt))


@api_view(["GET"])
def coin_insight(request, coin_id):
    try:
        data = coingecko.get_coin(coin_id)
    except coingecko.UpstreamError as exc:
        return Response({"error": str(exc)}, status=502)
    prompt = genai.coin_prompt(data)
    md = (data or {}).get("market_data", {}) or {}
    key = f"{coin_id}:{md.get('current_price', {}).get('usd')}"
    return Response(_cached_or_generate(InsightCache.KIND_COIN, key, prompt))


@api_view(["POST"])
def portfolio_insight(request):
    """
    Build a portfolio insight from the caller's persisted holdings enriched
    with live prices. Accepts an optional currency in the body.
    """
    currency = (request.data or {}).get("currency", "usd")
    holdings = Holding.objects.filter(
        session_key=get_session_key(request)
    ).select_related("coin")
    if not holdings:
        return Response({"content": "Your portfolio is empty.", "model": None, "cached": False})

    ids = [h.coin.coingecko_id for h in holdings]
    try:
        prices = coingecko.get_simple_price(ids, currency)
    except coingecko.UpstreamError as exc:
        return Response({"error": str(exc)}, status=502)

    rows = []
    for h in holdings:
        p = prices.get(h.coin.coingecko_id, {})
        price = p.get(currency, 0) or 0
        rows.append(
            {
                "name": h.coin.name,
                "symbol": h.coin.symbol,
                "amount": float(h.amount),
                "value": float(h.amount) * price,
                "change_24h": p.get(f"{currency}_24h_change", 0) or 0,
            }
        )
    prompt = genai.portfolio_prompt(rows)
    key = json.dumps(sorted((r["symbol"], round(r["value"], 2)) for r in rows))
    return Response(_cached_or_generate(InsightCache.KIND_PORTFOLIO, key, prompt))
