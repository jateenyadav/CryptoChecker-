import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMarkets } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { useWatchlist } from "../context/WatchlistContext.jsx";
import CoinTable from "../components/CoinTable.jsx";
import { Spinner, ErrorMessage, EmptyState } from "../components/Status.jsx";

export default function Watchlist() {
  const { currency } = useCurrency();
  const { ids, clear, count } = useWatchlist();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: "market_cap", dir: "desc" });

  const load = useCallback(() => {
    if (!ids.length) {
      setCoins([]);
      return;
    }
    setLoading(true);
    setError(null);
    getMarkets({ currency, ids, perPage: 250 })
      .then((data) => setCoins(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currency, ids]);

  useEffect(() => {
    let alive = true;
    if (!ids.length) {
      setCoins([]);
      return;
    }
    setLoading(true);
    setError(null);
    getMarkets({ currency, ids, perPage: 250 })
      .then((data) => alive && setCoins(Array.isArray(data) ? data : []))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [currency, ids]);

  const handleSort = useCallback((key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );
  }, []);

  const sorted = [...coins].sort((a, b) => {
    const factor = sort.dir === "asc" ? 1 : -1;
    if (sort.key === "name") return factor * a.name.localeCompare(b.name);
    return factor * ((a[sort.key] ?? -Infinity) - (b[sort.key] ?? -Infinity));
  });

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Your Watchlist</h1>
        {count > 0 && (
          <button className="btn btn--ghost" onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      {count === 0 && (
        <EmptyState
          title="No coins in your watchlist yet"
          hint="Tap the ☆ next to any coin on the Market page to track it here."
        />
      )}

      {count > 0 && loading && <Spinner label="Loading your coins…" />}
      {count > 0 && error && !loading && <ErrorMessage message={error} onRetry={load} />}
      {count > 0 && !loading && !error && sorted.length > 0 && (
        <CoinTable coins={sorted} sort={sort} onSort={handleSort} />
      )}

      {count > 0 && (
        <p className="hint" style={{ marginTop: "1rem" }}>
          Want to add more? <Link to="/">Browse the market →</Link>
        </p>
      )}
    </>
  );
}
