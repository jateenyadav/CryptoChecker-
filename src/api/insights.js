/**
 * Imperative helpers for the GenAI insight endpoints. Returns
 * { content, model, cached }. Used by the <AiInsight /> component's `trigger`.
 */
import axios from "axios";
import { getSessionKey } from "../store/session.js";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
});

function headers() {
  return { "X-Session-Key": getSessionKey() };
}

function normalize(err) {
  return new Error(err.response?.data?.error || "Failed to generate AI insight.");
}

export async function fetchMarketInsight() {
  try {
    const res = await client.get("/insights/market", { headers: headers() });
    return res.data;
  } catch (err) {
    throw normalize(err);
  }
}

export async function fetchCoinInsight(coinId) {
  try {
    const res = await client.get(`/insights/coin/${coinId}`, { headers: headers() });
    return res.data;
  } catch (err) {
    throw normalize(err);
  }
}

export async function fetchPortfolioInsight(currency = "usd") {
  try {
    const res = await client.post(
      "/insights/portfolio",
      { currency },
      { headers: headers() }
    );
    return res.data;
  } catch (err) {
    throw normalize(err);
  }
}
