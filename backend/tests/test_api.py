"""
Backend tests. CoinGecko is mocked so tests are fast, deterministic, and run
fully offline (no network, no API keys). GenAI runs in its rule-based fallback.
"""
from unittest.mock import patch

import pytest
from markets.models import Alert, Coin, Holding, Watchlist

pytestmark = pytest.mark.django_db

SESSION = {"HTTP_X_SESSION_KEY": "test-session"}

BTC_REF = {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "image": "http://img/btc.png"}


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_markets_proxy_is_cached(client):
    fake = [{"id": "bitcoin", "current_price": 50000}]
    with patch("markets.coingecko._get", return_value=fake) as mocked:
        resp = client.get("/api/markets?currency=usd")
    assert resp.status_code == 200
    assert resp.json() == fake
    mocked.assert_called_once()


def test_watchlist_add_list_remove(client):
    add = client.post("/api/watchlist", data=BTC_REF, content_type="application/json", **SESSION)
    assert add.status_code == 201
    assert Coin.objects.filter(coingecko_id="bitcoin").exists()

    listed = client.get("/api/watchlist", **SESSION)
    assert len(listed.json()) == 1

    # Session scoping: a different session sees nothing.
    other = client.get("/api/watchlist", HTTP_X_SESSION_KEY="someone-else")
    assert other.json() == []

    removed = client.delete("/api/watchlist/bitcoin", **SESSION)
    assert removed.status_code == 204
    assert Watchlist.objects.count() == 0


def test_portfolio_upsert_and_zero_deletes(client):
    body = {"coin": BTC_REF, "amount": 2}
    resp = client.post("/api/portfolio", data=body, content_type="application/json", **SESSION)
    assert resp.status_code == 201
    assert float(Holding.objects.get().amount) == 2

    # Updating amount to 0 removes the holding.
    body["amount"] = 0
    resp = client.post("/api/portfolio", data=body, content_type="application/json", **SESSION)
    assert resp.status_code == 204
    assert Holding.objects.count() == 0


def test_alert_create_and_validation(client):
    good = {"coin": BTC_REF, "direction": "below", "target": 30000, "currency": "usd"}
    resp = client.post("/api/alerts", data=good, content_type="application/json", **SESSION)
    assert resp.status_code == 201
    assert Alert.objects.get().direction == "below"

    bad = {"coin": BTC_REF, "target": -5}
    resp = client.post("/api/alerts", data=bad, content_type="application/json", **SESSION)
    assert resp.status_code == 400


def test_market_insight_fallback(client, settings):
    settings.GEMINI_API_KEY = ""  # force rule-based fallback
    fake_global = {"data": {"total_market_cap": {"usd": 2_500_000_000_000},
                            "total_volume": {"usd": 90_000_000_000},
                            "market_cap_percentage": {"btc": 52.1, "eth": 17.3},
                            "market_cap_change_percentage_24h_usd": 1.8}}
    with patch("markets.coingecko._get", return_value=fake_global):
        resp = client.get("/api/insights/market")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "rule-based-fallback"
    assert "market cap" in data["content"].lower()


def test_portfolio_insight_empty(client):
    resp = client.post("/api/insights/portfolio", data={}, content_type="application/json", **SESSION)
    assert resp.status_code == 200
    assert "empty" in resp.json()["content"].lower()
