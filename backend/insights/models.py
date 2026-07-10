import hashlib

from django.db import models


class InsightCache(models.Model):
    """
    Caches a generated AI insight keyed by a hash of its prompt inputs so we
    don't burn tokens (or hit latency) regenerating identical analyses. Cached
    rows expire based on `created_at` at read time.
    """

    KIND_MARKET = "market"
    KIND_COIN = "coin"
    KIND_PORTFOLIO = "portfolio"
    KIND_CHOICES = [
        (KIND_MARKET, "Market"),
        (KIND_COIN, "Coin"),
        (KIND_PORTFOLIO, "Portfolio"),
    ]

    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    prompt_hash = models.CharField(max_length=64, unique=True)
    content = models.TextField()
    model_name = models.CharField(max_length=64, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["kind", "prompt_hash"])]

    @staticmethod
    def make_hash(kind: str, payload: str) -> str:
        return hashlib.sha256(f"{kind}:{payload}".encode()).hexdigest()
