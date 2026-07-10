"""
GenAI insight generation.

Primary path: Google Gemini (google-generativeai). If no GEMINI_API_KEY is
configured (e.g. local dev, CI, or a demo without a key), we fall back to a
deterministic, rule-based natural-language summary so the feature always
returns something useful and is fully testable offline.
"""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-1.5-flash"

SYSTEM_PREAMBLE = (
    "You are a concise crypto market analyst. Summarise the data in plain, "
    "neutral language. Never give financial advice; describe trends and risks. "
    "Keep it under 150 words and use short paragraphs."
)


def _gemini_available() -> bool:
    return bool(settings.GEMINI_API_KEY)


def generate(prompt: str) -> tuple[str, str]:
    """Return (content, model_name). Falls back if Gemini is unavailable."""
    if _gemini_available():
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(MODEL_NAME, system_instruction=SYSTEM_PREAMBLE)
            resp = model.generate_content(prompt)
            text = (resp.text or "").strip()
            if text:
                return text, MODEL_NAME
        except Exception as exc:  # noqa: BLE001 - degrade gracefully
            logger.warning("Gemini generation failed, using fallback: %s", exc)
    return _fallback(prompt), "rule-based-fallback"


def _fallback(prompt: str) -> str:
    """A deterministic summary so the endpoint works with no API key."""
    return (
        "AI insights are running in offline mode (no GEMINI_API_KEY configured), "
        "so here is a rule-based summary of the supplied data:\n\n" + prompt
    )


# --- Prompt builders ---

def market_prompt(global_data: dict) -> str:
    d = (global_data or {}).get("data", {}) or {}
    cap = d.get("total_market_cap", {}).get("usd")
    vol = d.get("total_volume", {}).get("usd")
    dom = d.get("market_cap_percentage", {}) or {}
    change = d.get("market_cap_change_percentage_24h_usd")
    top_dom = ", ".join(f"{k.upper()} {v:.1f}%" for k, v in list(dom.items())[:3])
    return (
        f"Global crypto market snapshot: total market cap ${cap:,.0f} " if cap else "Global crypto market snapshot: "
    ) + (
        f"(24h change {change:+.2f}%), " if change is not None else ""
    ) + (
        f"24h volume ${vol:,.0f}. " if vol else ""
    ) + (f"Dominance: {top_dom}." if top_dom else "")


def coin_prompt(coin: dict) -> str:
    md = (coin or {}).get("market_data", {}) or {}
    name = coin.get("name", "This coin")
    price = md.get("current_price", {}).get("usd")
    ch24 = md.get("price_change_percentage_24h")
    ch7 = md.get("price_change_percentage_7d")
    rank = coin.get("market_cap_rank")
    return (
        f"{name} analysis: "
        + (f"price ${price:,.4f}, " if price is not None else "")
        + (f"24h {ch24:+.2f}%, " if ch24 is not None else "")
        + (f"7d {ch7:+.2f}%, " if ch7 is not None else "")
        + (f"market cap rank #{rank}." if rank else "")
    )


def portfolio_prompt(rows: list[dict]) -> str:
    if not rows:
        return "The portfolio is empty."
    lines = [
        f"- {r['name']} ({r['symbol'].upper()}): {r['amount']} units worth ${r['value']:,.2f} "
        f"({r['change_24h']:+.2f}% 24h)"
        for r in rows
    ]
    total = sum(r["value"] for r in rows)
    return (
        f"Portfolio holdings (total ${total:,.2f}):\n"
        + "\n".join(lines)
        + "\nSummarise concentration, diversification, and 24h momentum."
    )
