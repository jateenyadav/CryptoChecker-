"""
Relational data model for the CryptoChecker platform.

The design intentionally normalises the previously client-only state
(watchlist / portfolio / alerts, which lived in localStorage) into
PostgreSQL tables scoped to a lightweight session key, and adds a
server-side market data cache so we control CoinGecko rate limits and
can store price history for analytics.
"""
from django.db import models


class Coin(models.Model):
    """A cryptocurrency we've seen from the upstream market provider."""

    coingecko_id = models.CharField(max_length=128, unique=True)
    symbol = models.CharField(max_length=32)
    name = models.CharField(max_length=128)
    image = models.URLField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["symbol"])]

    def __str__(self):
        return f"{self.name} ({self.symbol.upper()})"


class PriceSnapshot(models.Model):
    """
    A point-in-time market snapshot for a coin in a given currency.

    Persisting snapshots lets us serve cached market data quickly, survive
    upstream rate limits, and later run analytics / feed the GenAI insights.
    """

    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name="snapshots")
    currency = models.CharField(max_length=8)
    price = models.DecimalField(max_digits=30, decimal_places=10)
    market_cap = models.DecimalField(max_digits=30, decimal_places=2, null=True, blank=True)
    change_24h = models.FloatField(null=True, blank=True)
    change_7d = models.FloatField(null=True, blank=True)
    captured_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-captured_at"]
        indexes = [
            models.Index(fields=["coin", "currency", "-captured_at"]),
        ]


class Watchlist(models.Model):
    """A user's (session-scoped) list of watched coins."""

    session_key = models.CharField(max_length=64, db_index=True)
    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name="watchers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session_key", "coin"], name="uniq_watch_per_session"
            )
        ]
        ordering = ["-created_at"]


class Holding(models.Model):
    """A portfolio holding: how much of a coin a session owns."""

    session_key = models.CharField(max_length=64, db_index=True)
    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name="holdings")
    amount = models.DecimalField(max_digits=30, decimal_places=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session_key", "coin"], name="uniq_holding_per_session"
            )
        ]
        ordering = ["-updated_at"]


class Alert(models.Model):
    """A price alert evaluated server-side against the latest snapshot."""

    ABOVE = "above"
    BELOW = "below"
    DIRECTION_CHOICES = [(ABOVE, "Above"), (BELOW, "Below")]

    session_key = models.CharField(max_length=64, db_index=True)
    coin = models.ForeignKey(Coin, on_delete=models.CASCADE, related_name="alerts")
    direction = models.CharField(max_length=5, choices=DIRECTION_CHOICES, default=ABOVE)
    target = models.DecimalField(max_digits=30, decimal_places=10)
    currency = models.CharField(max_length=8, default="usd")
    created_at = models.DateTimeField(auto_now_add=True)
    triggered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
