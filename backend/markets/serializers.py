from rest_framework import serializers

from .models import Alert, Coin, Holding, Watchlist


class CoinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coin
        fields = ["coingecko_id", "symbol", "name", "image"]


class WatchlistSerializer(serializers.ModelSerializer):
    coin = CoinSerializer(read_only=True)

    class Meta:
        model = Watchlist
        fields = ["id", "coin", "created_at"]


class HoldingSerializer(serializers.ModelSerializer):
    coin = CoinSerializer(read_only=True)

    class Meta:
        model = Holding
        fields = ["id", "coin", "amount", "updated_at"]


class AlertSerializer(serializers.ModelSerializer):
    coin = CoinSerializer(read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "coin",
            "direction",
            "target",
            "currency",
            "created_at",
            "triggered_at",
        ]


class CoinRefSerializer(serializers.Serializer):
    """Inbound coin reference used when creating watch/holding/alert rows."""

    id = serializers.CharField()
    symbol = serializers.CharField(required=False, allow_blank=True, default="")
    name = serializers.CharField(required=False, allow_blank=True, default="")
    image = serializers.CharField(required=False, allow_blank=True, default="")
