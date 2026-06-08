import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMarkets } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { formatPercent, formatCompact } from "../utils/format.js";
import { Spinner, ErrorMessage } from "../components/Status.jsx";

const RANGES = [
  { key: "price_change_percentage_24h", label: "24h" },
  { key: "price_change_percentage_7d_in_currency", label: "7d" },
];

// Map a percentage change to a background colour. Greens for gains, reds for
// losses, intensity scaled by magnitude (capped at 10%).
function changeColor(pct) {
  if (pct == null || Number.isNaN(pct)) return "var(--surface-2)";
  const capped = Math.max(-10, Math.min(10, pct));
  const intensity = Math.min(1, Math.abs(capped) / 10);
  const alpha = 0.15 + intensity * 0.55;
  return capped >= 0
    ? `rgba(34, 197, 94, ${alpha.toFixed(2)})`
    : `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
}

// Bucket coins into tile sizes by market-cap rank so the layout reads like a
// treemap without a heavy layout dependency.
function tileSize(rank) {
  if (rank == null) return "sm";
  if (rank <= 3) return "xl";
  if (rank <= 10) return "lg";
  if (rank <= 30) return "md";
  return "sm";
}

export default function Heatmap() {
  const { currency } = useCurrency();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(RANGES[0].key);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getMarkets({ currency, perPage: 100, page: 1 })
      .then((data) => alive && setCoins(data || []))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [currency]);

  const stats = useMemo(() => {
    if (!coins.length) return null;
    const changes = coins
      .map((c) => c[range])
      .filter((v) => v != null && !Number.isNaN(v));
    if (!changes.length) return null;
    const gainers = changes.filter((v) => v > 0).length;
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    return { gainers, losers: changes.length - gainers, avg };
  }, [coins, range]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Market Heatmap</h1>
          <p className="page-sub">
            Top 100 coins by market cap, sized by rank and coloured by performance.
          </p>
        </div>
        <div className="seg" role="tablist" aria-label="Performance window">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              className={`seg__btn${range === r.key ? " seg__btn--active" : ""}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {stats && !loading && !error && (
        <div className="heatmap-stats">
          <span className="is-up">{stats.gainers} up</span>
          <span className="is-down">{stats.losers} down</span>
          <span>
            avg{" "}
            <strong className={stats.avg >= 0 ? "is-up" : "is-down"}>
              {formatPercent(stats.avg)}
            </strong>
          </span>
        </div>
      )}

      {loading && <Spinner label="Loading market…" />}
      {error && !loading && (
        <ErrorMessage message={error} onRetry={() => setRange((r) => r)} />
      )}

      {!loading && !error && (
        <div className="heatmap">
          {coins.map((c) => {
            const pct = c[range];
            return (
              <Link
                key={c.id}
                to={`/coin/${c.id}`}
                className={`heatmap__tile heatmap__tile--${tileSize(
                  c.market_cap_rank
                )}`}
                style={{ background: changeColor(pct) }}
                title={`${c.name} · ${formatCompact(c.market_cap, currency)}`}
              >
                <span className="heatmap__symbol">{c.symbol?.toUpperCase()}</span>
                <span className="heatmap__pct">{formatPercent(pct)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
