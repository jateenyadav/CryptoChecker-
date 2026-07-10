"""API views: market data proxy + persisted watchlist / portfolio / alerts."""
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from . import coingecko
from .models import Alert, Holding, Watchlist
from .serializers import (
    AlertSerializer,
    CoinRefSerializer,
    HoldingSerializer,
    WatchlistSerializer,
)
from .utils import get_session_key, upsert_coin


def _upstream(fn, *args, **kwargs):
    try:
        return Response(fn(*args, **kwargs))
    except coingecko.UpstreamError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


# --- Market data (proxied + cached server-side) ---

@api_view(["GET"])
def markets(request):
    return _upstream(
        coingecko.get_markets,
        currency=request.GET.get("currency", "usd"),
        page=int(request.GET.get("page", 1)),
        per_page=int(request.GET.get("perPage", 50)),
        ids=[i for i in request.GET.get("ids", "").split(",") if i] or None,
        order=request.GET.get("order", "market_cap_desc"),
    )


@api_view(["GET"])
def coin_detail(request, coin_id):
    return _upstream(coingecko.get_coin, coin_id)


@api_view(["GET"])
def coin_chart(request, coin_id):
    return _upstream(
        coingecko.get_coin_chart,
        coin_id,
        currency=request.GET.get("currency", "usd"),
        days=request.GET.get("days", 7),
    )


@api_view(["GET"])
def global_stats(request):
    return _upstream(coingecko.get_global)


@api_view(["GET"])
def trending(request):
    return _upstream(coingecko.get_trending)


@api_view(["GET"])
def search(request):
    return _upstream(coingecko.search, request.GET.get("q", ""))


@api_view(["GET"])
def simple_price(request):
    ids = [i for i in request.GET.get("ids", "").split(",") if i]
    return _upstream(
        coingecko.get_simple_price, ids, currency=request.GET.get("currency", "usd")
    )


# --- Watchlist ---

class WatchlistView(APIView):
    def get(self, request):
        qs = Watchlist.objects.filter(session_key=get_session_key(request)).select_related("coin")
        return Response(WatchlistSerializer(qs, many=True).data)

    def post(self, request):
        ref = CoinRefSerializer(data=request.data)
        ref.is_valid(raise_exception=True)
        coin = upsert_coin(ref.validated_data)
        obj, _ = Watchlist.objects.get_or_create(
            session_key=get_session_key(request), coin=coin
        )
        return Response(WatchlistSerializer(obj).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def watchlist_remove(request, coin_id):
    Watchlist.objects.filter(
        session_key=get_session_key(request), coin__coingecko_id=coin_id
    ).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Portfolio ---

class PortfolioView(APIView):
    def get(self, request):
        qs = Holding.objects.filter(session_key=get_session_key(request)).select_related("coin")
        return Response(HoldingSerializer(qs, many=True).data)

    def post(self, request):
        ref = CoinRefSerializer(data=request.data.get("coin", {}))
        ref.is_valid(raise_exception=True)
        amount = request.data.get("amount")
        session = get_session_key(request)
        coin = upsert_coin(ref.validated_data)
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return Response({"error": "amount must be a number"}, status=400)
        if amount <= 0:
            Holding.objects.filter(session_key=session, coin=coin).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        obj, _ = Holding.objects.update_or_create(
            session_key=session, coin=coin, defaults={"amount": amount}
        )
        return Response(HoldingSerializer(obj).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def portfolio_remove(request, coin_id):
    Holding.objects.filter(
        session_key=get_session_key(request), coin__coingecko_id=coin_id
    ).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Alerts ---

class AlertsView(APIView):
    def get(self, request):
        qs = Alert.objects.filter(session_key=get_session_key(request)).select_related("coin")
        return Response(AlertSerializer(qs, many=True).data)

    def post(self, request):
        ref = CoinRefSerializer(data=request.data.get("coin", {}))
        ref.is_valid(raise_exception=True)
        coin = upsert_coin(ref.validated_data)
        direction = "below" if request.data.get("direction") == "below" else "above"
        try:
            target = float(request.data.get("target"))
        except (TypeError, ValueError):
            return Response({"error": "target must be a number"}, status=400)
        if target <= 0:
            return Response({"error": "target must be positive"}, status=400)
        obj = Alert.objects.create(
            session_key=get_session_key(request),
            coin=coin,
            direction=direction,
            target=target,
            currency=request.data.get("currency", "usd"),
        )
        return Response(AlertSerializer(obj).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def alert_remove(request, alert_id):
    Alert.objects.filter(session_key=get_session_key(request), id=alert_id).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
