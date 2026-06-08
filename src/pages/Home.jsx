import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMarkets } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import CoinTable from "../components/CoinTable.jsx";
import MarketStats from "../components/MarketStats.jsx";
import Trending from "../components/Trending.jsx";
import TopMovers from "../components/TopMovers.jsx";
import { Spinner, ErrorMessage, EmptyState } from "../components/Status.jsx";
import { downloadCoinsCsv } from "../utils/csv.js";

const PER_PAGE = 50;
const REFRESH_MS = 60_000;

export default function Home() {
  const { currency } = useCurrency();
  const [coins, setCoins] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [sort, setSort] = useState({ key: "market_cap", dir: "desc" });

  const aliveRef = useRef(true);

  const load = useCallback(
    (background = false) => {
      if (!background) setLoading(true);
      setError(null);
      getMarkets({ currency, page, perPage: PER_PAGE })
        .then((data) => {
          if (!aliveRef.current) return;
          setCoins(Array.isArray(data) ? data : []);
          setUpdatedAt(Date.now());
        })
        .catch((err) => aliveRef.current && setError(err.message))
        .finally(() => aliveRef.current && setLoading(false));
    },
    [currency, page]
  );

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  // Silently refresh prices on an interval so the table stays current.
  useEffect(() => {
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleSort = useCallback((key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: key === "name" ? "asc" : "desc" };
    });
  }, []);

  const visibleCoins = useMemo(() => {
    let list = coins;

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
      );
    }

    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (key === "name") return factor * String(av).localeCompare(String(bv));
      const an = av ?? -Infinity;
      const bn = bv ?? -Infinity;
      return factor * (an - bn);
    });

    return list;
  }, [coins, debouncedQuery, sort]);

  return (
    <>
      <MarketStats />
      <Trending />
      {!loading && !error && coins.length > 0 && <TopMovers coins={coins} />}

      <div className="toolbar">
        <div className="search">
          <span className="search__icon" aria-hidden="true">🔎</span>
          <input
            type="search"
            className="search__input"
            placeholder="Search by name or symbol…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search coins"
          />
        </div>
        <div className="toolbar__actions">
          <button
            className="btn btn--ghost"
            onClick={() => downloadCoinsCsv(visibleCoins, currency)}
            disabled={loading || visibleCoins.length === 0}
            aria-label="Export current view to CSV"
          >
            ⬇ Export CSV
          </button>
          <div className="pager" role="navigation" aria-label="Pagination">
          <button
            className="btn btn--ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            ← Prev
          </button>
          <span className="pager__label">Page {page}</span>
          <button
            className="btn btn--ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || coins.length < PER_PAGE}
          >
            Next →
          </button>
          </div>
        </div>
      </div>

      {updatedAt && (
        <div className="updated-bar">
          <span className="updated-bar__dot" aria-hidden="true" />
          <span>
            Updated {new Date(updatedAt).toLocaleTimeString()} · auto-refreshes every minute
          </span>
          <button
            className="link-btn"
            onClick={() => load(true)}
            disabled={loading}
            aria-label="Refresh now"
          >
            Refresh now
          </button>
        </div>
      )}

      {loading && <Spinner label="Loading market data…" />}
      {error && !loading && <ErrorMessage message={error} onRetry={load} />}
      {!loading && !error && visibleCoins.length === 0 && (
        <EmptyState title="No coins match your search" hint="Try a different name or symbol." />
      )}
      {!loading && !error && visibleCoins.length > 0 && (
        <CoinTable coins={visibleCoins} sort={sort} onSort={handleSort} />
      )}
    </>
  );
}
