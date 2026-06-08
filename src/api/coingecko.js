import axios from "axios";

const BASE_URL = "https://api.coingecko.com/api/v3";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

/**
 * Tiny in-memory TTL cache. CoinGecko's public API is rate-limited
 * (~10-30 req/min), so caching responses keeps the UI snappy and avoids 429s.
 */
const cache = new Map();
const inflight = new Map();

function cacheKey(url, params) {
  return `${url}?${JSON.stringify(params ?? {})}`;
}

async function getCached(url, params, ttl = 60_000) {
  const key = cacheKey(url, params);
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && now - hit.time < ttl) {
    return hit.data;
  }

  // De-duplicate concurrent identical requests.
  if (inflight.has(key)) return inflight.get(key);

  const promise = client
    .get(url, { params })
    .then((res) => {
      cache.set(key, { data: res.data, time: Date.now() });
      inflight.delete(key);
      return res.data;
    })
    .catch((err) => {
      inflight.delete(key);
      // Serve slightly stale data rather than failing, if we have any.
      if (hit) return hit.data;
      throw normalizeError(err);
    });

  inflight.set(key, promise);
  return promise;
}

function normalizeError(err) {
  if (err.response?.status === 429) {
    return new Error("Rate limited by CoinGecko. Please wait a moment and retry.");
  }
  if (err.code === "ECONNABORTED") {
    return new Error("Request timed out. Check your connection and try again.");
  }
  if (!err.response) {
    return new Error("Network error. Please check your connection.");
  }
  return new Error(err.response?.data?.error || "Failed to load market data.");
}

/** Paginated market list with sparkline data and % changes. */
export function getMarkets({
  currency = "usd",
  page = 1,
  perPage = 50,
  ids,
  order = "market_cap_desc",
} = {}) {
  return getCached(
    "/coins/markets",
    {
      vs_currency: currency,
      order,
      per_page: perPage,
      page,
      sparkline: true,
      price_change_percentage: "1h,24h,7d",
      ids: ids?.length ? ids.join(",") : undefined,
    },
    45_000
  );
}

/** Full detail for a single coin. */
export function getCoin(id) {
  return getCached(
    `/coins/${id}`,
    {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false,
    },
    60_000
  );
}

/** Historical market chart for a coin over `days`. */
export function getCoinChart(id, { currency = "usd", days = 7 } = {}) {
  return getCached(
    `/coins/${id}/market_chart`,
    { vs_currency: currency, days },
    60_000
  );
}

/** Global market stats (total cap, volume, BTC dominance). */
export function getGlobal() {
  return getCached("/global", {}, 120_000);
}

/** Trending search coins. */
export function getTrending() {
  return getCached("/search/trending", {}, 120_000);
}

/** Full-text search across all coins, exchanges, and categories. */
export function search(query) {
  const q = query?.trim();
  if (!q) return Promise.resolve({ coins: [] });
  return getCached("/search", { query: q }, 60_000);
}

/**
 * Lightweight price lookup for arbitrary coin ids in a given currency.
 * Used by the portfolio and converter where we only need the spot price.
 */
export function getSimplePrice(ids, currency = "usd") {
  if (!ids?.length) return Promise.resolve({});
  return getCached(
    "/simple/price",
    {
      ids: ids.join(","),
      vs_currencies: currency,
      include_24hr_change: true,
    },
    45_000
  );
}

/** A small curated list of coins to seed the converter dropdown quickly. */
export function getTopCoins(currency = "usd", perPage = 100) {
  return getMarkets({ currency, perPage, page: 1 });
}

export const SUPPORTED_CURRENCIES = ["usd", "eur", "gbp", "inr", "jpy", "aud", "cad"];
