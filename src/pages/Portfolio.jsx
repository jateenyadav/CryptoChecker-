import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSimplePrice, search as searchCoins } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { usePortfolio } from "../context/PortfolioContext.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { formatPrice, formatPercent, classNames } from "../utils/format.js";
import { Spinner, ErrorMessage, EmptyState } from "../components/Status.jsx";

export default function Portfolio() {
  const { currency } = useCurrency();
  const { holdings, ids, setHolding, remove, clear, count } = usePortfolio();

  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPrices = useCallback(() => {
    if (!ids.length) {
      setPrices({});
      return;
    }
    setLoading(true);
    setError(null);
    getSimplePrice(ids, currency)
      .then((data) => setPrices(data || {}))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ids, currency]);

  useEffect(() => {
    let alive = true;
    if (!ids.length) {
      setPrices({});
      return;
    }
    setLoading(true);
    setError(null);
    getSimplePrice(ids, currency)
      .then((data) => alive && setPrices(data || {}))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // ids.join keeps the effect stable when the set of coins is unchanged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(","), currency]);

  const rows = useMemo(() => {
    return ids.map((id) => {
      const h = holdings[id];
      const priceInfo = prices[id] || {};
      const price = priceInfo[currency];
      const change = priceInfo[`${currency}_24h_change`];
      const value = price != null ? price * h.amount : null;
      return { id, ...h, price, change, value };
    });
  }, [ids, holdings, prices, currency]);

  const totals = useMemo(() => {
    let total = 0;
    let dayChangeValue = 0;
    for (const r of rows) {
      if (r.value != null) {
        total += r.value;
        if (r.change != null) {
          // value 24h ago = value / (1 + change/100)
          const prev = r.value / (1 + r.change / 100);
          dayChangeValue += r.value - prev;
        }
      }
    }
    const dayChangePct = total - dayChangeValue > 0 ? (dayChangeValue / (total - dayChangeValue)) * 100 : 0;
    return { total, dayChangeValue, dayChangePct };
  }, [rows]);

  const exportCsv = useCallback(() => {
    const header = ["Coin", "Symbol", "Amount", "Price", "Value", "24h %"];
    const lines = rows.map((r) =>
      [
        r.name,
        r.symbol?.toUpperCase(),
        r.amount,
        r.price ?? "",
        r.value ?? "",
        r.change != null ? r.change.toFixed(2) : "",
      ].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Portfolio</h1>
          <p className="page-sub">
            Track your holdings and live value. Stored locally in your browser.
          </p>
        </div>
        {count > 0 && (
          <div className="page-head__actions">
            <button className="btn btn--ghost" onClick={loadPrices} disabled={loading}>
              ↻ Refresh
            </button>
            <button className="btn btn--ghost" onClick={exportCsv}>
              ⭳ Export CSV
            </button>
            <button className="btn btn--ghost" onClick={clear}>
              Clear all
            </button>
          </div>
        )}
      </header>

      <CoinPicker onAdd={setHolding} existing={holdings} />

      {count === 0 ? (
        <EmptyState
          title="Your portfolio is empty"
          hint="Search for a coin above and enter how much you hold to start tracking."
        />
      ) : (
        <>
          <section className="portfolio-summary">
            <div className="summary-card">
              <span className="summary-card__label">Total value</span>
              <span className="summary-card__value">{formatPrice(totals.total, currency)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">24h change</span>
              <span
                className={classNames(
                  "summary-card__value",
                  totals.dayChangeValue >= 0 ? "is-up" : "is-down"
                )}
              >
                {formatPrice(totals.dayChangeValue, currency)} ({formatPercent(totals.dayChangePct)})
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-card__label">Assets</span>
              <span className="summary-card__value">{count}</span>
            </div>
          </section>

          {loading && <Spinner label="Loading prices…" />}
          {error && !loading && <ErrorMessage message={error} onRetry={loadPrices} />}

          {!loading && !error && (
            <div className="table-wrap">
              <table className="coin-table">
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th className="num">Holdings</th>
                    <th className="num">Price</th>
                    <th className="num">24h</th>
                    <th className="num">Value</th>
                    <th className="num">Allocation</th>
                    <th aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <PortfolioRow
                      key={r.id}
                      row={r}
                      currency={currency}
                      total={totals.total}
                      onUpdate={(amount) =>
                        setHolding(
                          { id: r.id, name: r.name, symbol: r.symbol, image: r.image },
                          amount
                        )
                      }
                      onRemove={() => remove(r.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

function PortfolioRow({ row, currency, total, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(row.amount));
  const allocation = total > 0 && row.value != null ? (row.value / total) * 100 : 0;

  const commit = () => {
    setEditing(false);
    if (draft !== String(row.amount)) onUpdate(draft);
  };

  return (
    <tr>
      <td>
        <Link to={`/coin/${row.id}`} className="coin-cell">
          {row.image && <img src={row.image} alt="" className="coin-cell__img" width={24} height={24} />}
          <span className="coin-cell__name">{row.name}</span>
          <span className="coin-cell__symbol">{row.symbol?.toUpperCase()}</span>
        </Link>
      </td>
      <td className="num">
        {editing ? (
          <input
            type="number"
            className="amount-input"
            value={draft}
            min="0"
            step="any"
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(String(row.amount));
                setEditing(false);
              }
            }}
          />
        ) : (
          <button className="amount-display" onClick={() => setEditing(true)} title="Click to edit">
            {row.amount} {row.symbol?.toUpperCase()}
          </button>
        )}
      </td>
      <td className="num">{formatPrice(row.price, currency)}</td>
      <td className={classNames("num", (row.change ?? 0) >= 0 ? "is-up" : "is-down")}>
        {formatPercent(row.change)}
      </td>
      <td className="num">{formatPrice(row.value, currency)}</td>
      <td className="num">
        <div className="alloc">
          <div className="alloc__bar" style={{ width: `${Math.min(100, allocation)}%` }} />
          <span className="alloc__label">{allocation.toFixed(1)}%</span>
        </div>
      </td>
      <td className="num">
        <button className="btn-icon" onClick={onRemove} title="Remove" aria-label={`Remove ${row.name}`}>
          ✕
        </button>
      </td>
    </tr>
  );
}

function CoinPicker({ onAdd, existing }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
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
    setSelected({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      image: coin.large || coin.thumb,
    });
    setQuery(coin.name);
    setOpen(false);
    setResults([]);
  };

  const add = () => {
    if (!selected || !amount) return;
    onAdd(selected, amount);
    setSelected(null);
    setQuery("");
    setAmount("");
  };

  return (
    <section className="coin-picker" ref={boxRef}>
      <div className="coin-picker__search">
        <input
          type="search"
          className="search__input"
          placeholder="Add a coin to your portfolio…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Search coin to add"
        />
        {open && results.length > 0 && (
          <ul className="coin-picker__results">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="coin-picker__result"
                  onClick={() => pick(c)}
                  disabled={Boolean(existing[c.id])}
                >
                  {c.thumb && <img src={c.thumb} alt="" width={20} height={20} />}
                  <span>{c.name}</span>
                  <span className="coin-cell__symbol">{c.symbol}</span>
                  {existing[c.id] && <span className="coin-picker__added">added</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        type="number"
        className="amount-input amount-input--lg"
        placeholder="Amount"
        value={amount}
        min="0"
        step="any"
        onChange={(e) => setAmount(e.target.value)}
        disabled={!selected}
        aria-label="Amount held"
      />
      <button className="btn btn--primary" onClick={add} disabled={!selected || !amount}>
        Add
      </button>
    </section>
  );
}
