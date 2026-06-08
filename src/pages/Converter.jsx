import { useEffect, useMemo, useState } from "react";
import { getTopCoins, SUPPORTED_CURRENCIES } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { formatPrice, currencySymbol } from "../utils/format.js";
import { Spinner, ErrorMessage } from "../components/Status.jsx";

export default function Converter() {
  const { currency } = useCurrency();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [coinId, setCoinId] = useState("bitcoin");
  const [fiat, setFiat] = useState(currency);
  const [coinAmount, setCoinAmount] = useState("1");
  const [fiatAmount, setFiatAmount] = useState("");
  // which side the user last edited, so we know which to recompute
  const [lastEdited, setLastEdited] = useState("coin");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getTopCoins(fiat)
      .then((data) => {
        if (!alive) return;
        setCoins(data || []);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fiat]);

  const selected = useMemo(
    () => coins.find((c) => c.id === coinId) || coins[0],
    [coins, coinId]
  );
  const price = selected?.current_price;

  // Recompute the opposite field whenever price or inputs change.
  useEffect(() => {
    if (price == null) return;
    if (lastEdited === "coin") {
      const n = Number(coinAmount);
      setFiatAmount(n ? String(n * price) : "");
    } else {
      const n = Number(fiatAmount);
      setCoinAmount(n ? String(n / price) : "");
    }
  }, [price, coinAmount, fiatAmount, lastEdited]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Converter</h1>
          <p className="page-sub">Convert between any coin and fiat at live rates.</p>
        </div>
      </header>

      {loading && <Spinner label="Loading rates…" />}
      {error && !loading && <ErrorMessage message={error} onRetry={() => setFiat((f) => f)} />}

      {!loading && !error && selected && (
        <section className="converter">
          <div className="converter__row">
            <label className="converter__field">
              <span className="converter__label">Crypto</span>
              <div className="converter__control">
                <input
                  type="number"
                  className="amount-input amount-input--lg"
                  value={coinAmount}
                  min="0"
                  step="any"
                  onChange={(e) => {
                    setCoinAmount(e.target.value);
                    setLastEdited("coin");
                  }}
                  aria-label="Crypto amount"
                />
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
              </div>
            </label>

            <div className="converter__swap" aria-hidden="true">
              =
            </div>

            <label className="converter__field">
              <span className="converter__label">Fiat</span>
              <div className="converter__control">
                <input
                  type="number"
                  className="amount-input amount-input--lg"
                  value={fiatAmount}
                  min="0"
                  step="any"
                  onChange={(e) => {
                    setFiatAmount(e.target.value);
                    setLastEdited("fiat");
                  }}
                  aria-label="Fiat amount"
                />
                <select
                  className="converter__select"
                  value={fiat}
                  onChange={(e) => setFiat(e.target.value)}
                  aria-label="Select currency"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <p className="converter__rate">
            1 {selected.symbol?.toUpperCase()} = {formatPrice(price, fiat)} ·{" "}
            {currencySymbol(fiat)}1 = {price ? (1 / price).toFixed(8) : "—"}{" "}
            {selected.symbol?.toUpperCase()}
          </p>
        </section>
      )}
    </>
  );
}
