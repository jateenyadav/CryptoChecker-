import { useEffect, useMemo, useState } from "react";
import { getTopCoins } from "../api/coingecko.js";
import { useAlerts } from "../context/AlertsContext.jsx";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { formatPrice } from "../utils/format.js";
import { Spinner, ErrorMessage, EmptyState } from "../components/Status.jsx";

export default function Alerts() {
  const { currency } = useCurrency();
  const {
    alerts,
    add,
    remove,
    reset,
    clearTriggered,
    triggeredCount,
    permission,
    requestPermission,
  } = useAlerts();

  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [coinId, setCoinId] = useState("bitcoin");
  const [direction, setDirection] = useState("above");
  const [target, setTarget] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getTopCoins(currency)
      .then((data) => alive && setCoins(data || []))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [currency]);

  const selected = useMemo(
    () => coins.find((c) => c.id === coinId) || coins[0],
    [coins, coinId]
  );

  function handleCreate(e) {
    e.preventDefault();
    if (!selected || !target) return;
    add(
      {
        id: selected.id,
        name: selected.name,
        symbol: selected.symbol,
        image: selected.image,
      },
      direction,
      target
    );
    setTarget("");
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Price Alerts</h1>
          <p className="page-sub">
            Get notified when a coin crosses your target price. Prices are checked
            in the background every minute.
          </p>
        </div>
        {triggeredCount > 0 && (
          <button className="btn btn--ghost" onClick={clearTriggered}>
            Clear {triggeredCount} triggered
          </button>
        )}
      </header>

      {permission === "default" && (
        <div className="notice">
          <span>Enable desktop notifications to get alerted even when this tab is in the background.</span>
          <button className="btn btn--sm" onClick={requestPermission}>
            Enable notifications
          </button>
        </div>
      )}
      {permission === "denied" && (
        <div className="notice notice--muted">
          Notifications are blocked. Alerts will still appear here when triggered.
        </div>
      )}

      {loading && <Spinner label="Loading coins…" />}
      {error && !loading && (
        <ErrorMessage message={error} onRetry={() => setCoinId((c) => c)} />
      )}

      {!loading && !error && (
        <>
          <section className="alert-form-card">
            <form className="alert-form" onSubmit={handleCreate}>
              <label className="alert-form__field">
                <span className="converter__label">Coin</span>
                <select
                  className="converter__select"
                  value={coinId}
                  onChange={(e) => setCoinId(e.target.value)}
                  aria-label="Select coin"
                >
                  {coins.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.symbol?.toUpperCase()} — {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="alert-form__field">
                <span className="converter__label">When price is</span>
                <select
                  className="converter__select"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  aria-label="Alert direction"
                >
                  <option value="above">at or above</option>
                  <option value="below">at or below</option>
                </select>
              </label>

              <label className="alert-form__field">
                <span className="converter__label">
                  Target ({currency.toUpperCase()})
                </span>
                <input
                  type="number"
                  className="amount-input"
                  value={target}
                  min="0"
                  step="any"
                  placeholder={
                    selected ? String(selected.current_price ?? "") : "0.00"
                  }
                  onChange={(e) => setTarget(e.target.value)}
                  aria-label="Target price"
                />
              </label>

              <button type="submit" className="btn btn--primary" disabled={!target}>
                Add alert
              </button>
            </form>
            {selected && (
              <p className="alert-form__hint">
                {selected.name} is currently{" "}
                <strong>{formatPrice(selected.current_price, currency)}</strong>
              </p>
            )}
          </section>

          {alerts.length === 0 ? (
            <EmptyState
              title="No alerts yet"
              hint="Create your first price alert above to start tracking."
            />
          ) : (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`alert-item${a.triggeredAt ? " alert-item--triggered" : ""}`}
                >
                  <div className="alert-item__coin">
                    {a.image && (
                      <img src={a.image} alt="" width={28} height={28} loading="lazy" />
                    )}
                    <div>
                      <span className="alert-item__name">{a.name}</span>
                      <span className="alert-item__symbol">
                        {a.symbol?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="alert-item__condition">
                    <span
                      className={`alert-badge alert-badge--${a.direction}`}
                    >
                      {a.direction === "above" ? "▲ above" : "▼ below"}
                    </span>
                    <strong>{formatPrice(a.target, a.currency)}</strong>
                  </div>

                  <div className="alert-item__status">
                    {a.triggeredAt ? (
                      <span className="alert-item__fired">
                        Triggered {new Date(a.triggeredAt).toLocaleString()}
                      </span>
                    ) : (
                      <span className="alert-item__pending">Watching…</span>
                    )}
                  </div>

                  <div className="alert-item__actions">
                    {a.triggeredAt && (
                      <button
                        className="btn btn--sm btn--ghost"
                        onClick={() => reset(a.id)}
                      >
                        Re-arm
                      </button>
                    )}
                    <button
                      className="btn btn--sm btn--danger"
                      onClick={() => remove(a.id)}
                      aria-label={`Remove ${a.name} alert`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
