/**
 * Market-data client.
 *
 * After the full-stack migration, the browser talks to our own Django API
 * (which proxies and caches CoinGecko server-side) instead of hitting
 * CoinGecko directly. The exported function signatures and return shapes are
 * unchanged, so existing pages/components keep working. RTK Query
 * (see ../store/api.js) is used for persisted features (watchlist, portfolio,
 * alerts, AI insights); these helpers remain for imperative fetches.
 */
import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

function normalizeError(err) {
  if (err.response?.status === 429) {
    return new Error("Rate limited. Please wait a moment and retry.");
  }
  if (err.response?.status === 502) {
    return new Error(err.response?.data?.error || "Market provider unavailable.");
  }
  if (err.code === "ECONNABORTED") {
    return new Error("Request timed out. Check your connection and try again.");
  }
  if (!err.response) {
    return new Error("Network error. Please check your connection.");
  }
  return new Error(err.response?.data?.error || "Failed to load market data.");
}

async function get(url, params) {
  try {
    const res = await client.get(url, { params });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Paginated market list with sparkline data and % changes. */
export function getMarkets({
  currency = "usd",
  page = 1,
  perPage = 50,
  ids,
  order = "market_cap_desc",
} = {}) {
  return get("/markets", {
    currency,
    page,
    perPage,
    order,
    ids: ids?.length ? ids.join(",") : undefined,
  });
}

/** Full detail for a single coin. */
export function getCoin(id) {
  return get(`/coins/${id}`);
}

/** Historical market chart for a coin over `days`. */
export function getCoinChart(id, { currency = "usd", days = 7 } = {}) {
  return get(`/coins/${id}/chart`, { currency, days });
}

/** Global market stats (total cap, volume, BTC dominance). */
export function getGlobal() {
  return get("/global");
}

/** Trending search coins. */
export function getTrending() {
  return get("/trending");
}

/** Full-text search across all coins, exchanges, and categories. */
export function search(query) {
  const q = query?.trim();
  if (!q) return Promise.resolve({ coins: [] });
  return get("/search", { q });
}

/** Lightweight price lookup for arbitrary coin ids in a given currency. */
export function getSimplePrice(ids, currency = "usd") {
  if (!ids?.length) return Promise.resolve({});
  return get("/simple-price", { ids: ids.join(","), currency });
}

/** A small curated list of coins to seed the converter dropdown quickly. */
export function getTopCoins(currency = "usd", perPage = 100) {
  return getMarkets({ currency, perPage, page: 1 });
}

export const SUPPORTED_CURRENCIES = ["usd", "eur", "gbp", "inr", "jpy", "aud", "cad"];
