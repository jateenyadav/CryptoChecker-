import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getSessionKey } from "./session.js";

/**
 * Base URL of the Django API. In dev, Vite proxies "/api" to the backend, so
 * an empty base + "/api/..." works. In production set VITE_API_URL to the
 * deployed backend origin (e.g. the Azure App Service URL).
 */
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE}/api`,
  prepareHeaders: (headers) => {
    headers.set("X-Session-Key", getSessionKey());
    return headers;
  },
});

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Watchlist", "Portfolio", "Alerts"],
  endpoints: (builder) => ({
    // --- Market data (Django proxies + caches CoinGecko) ---
    getMarkets: builder.query({
      query: ({ currency = "usd", page = 1, perPage = 50, ids, order } = {}) => ({
        url: "/markets",
        params: {
          currency,
          page,
          perPage,
          ...(ids?.length ? { ids: ids.join(",") } : {}),
          ...(order ? { order } : {}),
        },
      }),
    }),
    getCoin: builder.query({ query: (id) => `/coins/${id}` }),
    getCoinChart: builder.query({
      query: ({ id, currency = "usd", days = 7 }) => ({
        url: `/coins/${id}/chart`,
        params: { currency, days },
      }),
    }),
    getGlobal: builder.query({ query: () => "/global" }),
    getTrending: builder.query({ query: () => "/trending" }),
    search: builder.query({ query: (q) => ({ url: "/search", params: { q } }) }),
    getSimplePrice: builder.query({
      query: ({ ids, currency = "usd" }) => ({
        url: "/simple-price",
        params: { ids: ids.join(","), currency },
      }),
    }),

    // --- Watchlist ---
    getWatchlist: builder.query({
      query: () => "/watchlist",
      providesTags: ["Watchlist"],
    }),
    addWatch: builder.mutation({
      query: (coin) => ({ url: "/watchlist", method: "POST", body: coin }),
      invalidatesTags: ["Watchlist"],
    }),
    removeWatch: builder.mutation({
      query: (coinId) => ({ url: `/watchlist/${coinId}`, method: "DELETE" }),
      invalidatesTags: ["Watchlist"],
    }),

    // --- Portfolio ---
    getPortfolio: builder.query({
      query: () => "/portfolio",
      providesTags: ["Portfolio"],
    }),
    setHolding: builder.mutation({
      query: ({ coin, amount }) => ({
        url: "/portfolio",
        method: "POST",
        body: { coin, amount },
      }),
      invalidatesTags: ["Portfolio"],
    }),
    removeHolding: builder.mutation({
      query: (coinId) => ({ url: `/portfolio/${coinId}`, method: "DELETE" }),
      invalidatesTags: ["Portfolio"],
    }),

    // --- Alerts ---
    getAlerts: builder.query({
      query: () => "/alerts",
      providesTags: ["Alerts"],
    }),
    addAlert: builder.mutation({
      query: (body) => ({ url: "/alerts", method: "POST", body }),
      invalidatesTags: ["Alerts"],
    }),
    removeAlert: builder.mutation({
      query: (id) => ({ url: `/alerts/${id}`, method: "DELETE" }),
      invalidatesTags: ["Alerts"],
    }),

    // --- GenAI insights ---
    getMarketInsight: builder.query({ query: () => "/insights/market" }),
    getCoinInsight: builder.query({ query: (id) => `/insights/coin/${id}` }),
    getPortfolioInsight: builder.mutation({
      query: (body = {}) => ({ url: "/insights/portfolio", method: "POST", body }),
    }),
  }),
});

export const {
  useGetMarketsQuery,
  useGetCoinQuery,
  useGetCoinChartQuery,
  useGetGlobalQuery,
  useGetTrendingQuery,
  useSearchQuery,
  useLazySearchQuery,
  useGetSimplePriceQuery,
  useGetWatchlistQuery,
  useAddWatchMutation,
  useRemoveWatchMutation,
  useGetPortfolioQuery,
  useSetHoldingMutation,
  useRemoveHoldingMutation,
  useGetAlertsQuery,
  useAddAlertMutation,
  useRemoveAlertMutation,
  useGetMarketInsightQuery,
  useGetCoinInsightQuery,
  useGetPortfolioInsightMutation,
} = api;
