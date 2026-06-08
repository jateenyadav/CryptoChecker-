import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMarkets, search as searchCoins } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { formatPrice, formatCompact, formatPercent, classNames } from "../utils/format.js";
import Sparkline from "../components/Sparkline.jsx";
import { Spinner, ErrorMessage, EmptyState } from "../components/Status.jsx";

const MAX_COINS = 4;

// Rows of the comparison matrix. Each maps a coin market object to a value.
const METRICS = [
  { label: "Price", render: (c, cur) => formatPrice(c.current_price, cur) },
  {
    label: "24h %",
    render: (c) => (
      <span className={classNames((c.price_change_percentage_24h ?? 0) >= 0 ? "is-up" : "is-down")}>
        {formatPercent(c.price_change_percentage_24h)}
      </span>
    ),
  },
  {
    label: "7d %",
    render: (c) => (
      <span
        className={classNames(
          (c.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "is-up" : "is-down"
        )}
      >
        {formatPercent(c.price_change_percentage_7d_in_currency)}
      </span>
    ),
  },
  { label: "Market cap", render: (c, cur) => formatCompact(c.market_cap, cur) },
  { label: "Volume (24h)", render: (c, cur) => formatCompact(c.total_volume, cur) },
  { label: "Rank", render: (c) => (c.market_cap_rank != null ? `#${c.market_cap_rank}` : "—") },
  {
    label: "All-time high",
    render: (c, cur) => formatPrice(c.ath, cur),
  },
  {
    label: "From ATH",
    render: (c) => (
      <span className={classNames((c.ath_change_percentage ?? 0) >= 0 ? "is-up" : "is-down")}>
        {formatPercent(c.ath_change_percentage)}
      </span>
    ),
  },
];

export default function Compare() {
  const { currency } = useCurrency();
  const [ids, setIds] = useState(["bitcoin", "ethereum"]);
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!ids.length) {
      setCoins([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getMarkets({ currency, ids, perPage: ids.length })
      .then((data) => setCoins(data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ids, currency]);

  useEffect(() => {
    let alive = true;
    if (!ids.length) {
      setCoins([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getMarkets({ currency, ids, perPage: ids.length })
      .then((data) => alive && setCoins(data || []))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(","), currency]);

  // Preserve the order the user added coins in.
  const ordered = useMemo(() => {
    return ids.map((id) => coins.find((c) => c.id === id)).filter(Boolean);
  }, [ids, coins]);

  const addCoin = (id) => {
    setIds((prev) => (prev.includes(id) || prev.length >= MAX_COINS ? prev : [...prev, id]));
  };
  const removeCoin = (id) => setIds((prev) => prev.filter((x) => x !== id));

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Compare</h1>
          <p className="page-sub">Put up to {MAX_COINS} coins side by side.</p>
        </div>
      </header>

      {ids.length < MAX_COINS && (
        <ComparePicker onAdd={addCoin} existing={ids} />
      )}

      {loading && <Spinner label="Loading coins…" />}
      {error && !loading && <ErrorMessage message={error} onRetry={load} />}

      {!loading && !error && ordered.length === 0 && (
        <EmptyState title="No coins selected" hint="Search above to add coins to compare." />
      )}

      {!loading && !error && ordered.length > 0 && (
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-table__metric">Metric</th>
                {ordered.map((c) => (
                  <th key={c.id} className="compare-table__coin">
                    <button
                      className="btn-icon compare-table__remove"
                      onClick={() => removeCoin(c.id)}
                      aria-label={`Remove ${c.name}`}
                      title="Remove"
                    >
                      ✕
                    </button>
                    <Link to={`/coin/${c.id}`} className="coin-cell coin-cell--col">
                      <img src={c.image} alt="" width={32} height={32} />
                      <span className="coin-cell__name">{c.name}</span>
                      <span className="coin-cell__symbol">{c.symbol?.toUpperCase()}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <tr key={m.label}>
                  <th scope="row" className="compare-table__metric">
                    {m.label}
                  </th>
                  {ordered.map((c) => (
                    <td key={c.id} className="num">
                      {m.render(c, currency)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className="compare-table__metric">
                  7d trend
                </th>
                {ordered.map((c) => (
                  <td key={c.id}>
                    {c.sparkline_in_7d?.price?.length ? (
                      <Sparkline
                        data={c.sparkline_in_7d.price}
                        width={140}
                        height={40}
                        positive={(c.price_change_percentage_7d_in_currency ?? 0) >= 0}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ComparePicker({ onAdd, existing }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 300);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let alive = true;
    searchCoins(q)
      .then((data) => alive && setResults((data?.coins || []).slice(0, 8)))
      .catch(() => alive && setResults([]));
    return () => {
      alive = false;
    };
  }, [debounced]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (coin) => {
    onAdd(coin.id);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <section className="coin-picker" ref={boxRef}>
      <div className="coin-picker__search coin-picker__search--full">
        <input
          type="search"
          className="search__input"
          placeholder="Add a coin to compare…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Search coin to compare"
        />
        {open && results.length > 0 && (
          <ul className="coin-picker__results">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="coin-picker__result"
                  onClick={() => pick(c)}
                  disabled={existing.includes(c.id)}
                >
                  {c.thumb && <img src={c.thumb} alt="" width={20} height={20} />}
                  <span>{c.name}</span>
                  <span className="coin-cell__symbol">{c.symbol}</span>
                  {existing.includes(c.id) && <span className="coin-picker__added">added</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
