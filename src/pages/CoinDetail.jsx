import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCoin, getCoinChart } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { useWatchlist } from "../context/WatchlistContext.jsx";
import { usePortfolio } from "../context/PortfolioContext.jsx";
import PriceChart from "../components/PriceChart.jsx";
import { Spinner, ErrorMessage } from "../components/Status.jsx";
import { formatPrice, formatCompact, formatPercent, formatNumber } from "../utils/format.js";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

function Stat({ label, value, sub }) {
  return (
    <div className="kv">
      <span className="kv__label">{label}</span>
      <span className="kv__value">{value}</span>
      {sub && <span className="kv__sub">{sub}</span>}
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CoinDetail() {
  const { id } = useParams();
  const { currency } = useCurrency();
  const { isWatched, toggle } = useWatchlist();
  const { has: inPortfolio, setHolding, remove } = usePortfolio();

  const [coin, setCoin] = useState(null);
  const [chart, setChart] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState("");

  const loadCoin = useCallback(() => {
    setLoading(true);
    setError(null);
    getCoin(id)
      .then((data) => setCoin(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getCoin(id)
      .then((data) => alive && setCoin(data))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    setChartLoading(true);
    getCoinChart(id, { currency, days })
      .then((data) => alive && setChart(data.prices))
      .catch(() => alive && setChart(null))
      .finally(() => alive && setChartLoading(false));
    return () => {
      alive = false;
    };
  }, [id, currency, days]);

  if (loading) return <Spinner label="Loading coin…" />;
  if (error) return <ErrorMessage message={error} onRetry={loadCoin} />;
  if (!coin) return null;

  const md = coin.market_data ?? {};
  const price = md.current_price?.[currency];
  const change24h = md.price_change_percentage_24h_in_currency?.[currency];
  const watched = isWatched(coin.id);
  const owned = inPortfolio(coin.id);

  const circulating = md.circulating_supply ?? 0;
  const maxSupply = md.max_supply;
  const supplyPct =
    maxSupply && maxSupply > 0
      ? Math.min(100, Math.round((circulating / maxSupply) * 100))
      : null;

  const homepage = coin.links?.homepage?.find((u) => u);
  const explorer = coin.links?.blockchain_site?.find((u) => u);
  const subreddit = coin.links?.subreddit_url;

  const portfolioCoin = {
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    image: coin.image?.small ?? coin.image?.thumb ?? coin.image?.large,
  };

  const handleAddHolding = (e) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (numeric > 0) {
      setHolding(portfolioCoin, numeric);
      setAmount("");
    }
  };

  return (
    <article className="coin-detail">
      <Link to="/" className="back-link">
        ← Back to market
      </Link>

      <header className="coin-detail__head">
        <img src={coin.image?.large} alt="" width="56" height="56" />
        <div className="coin-detail__title">
          <h1>
            {coin.name}{" "}
            <span className="coin-detail__sym">{coin.symbol?.toUpperCase()}</span>
            {coin.market_cap_rank && (
              <span className="rank-badge">#{coin.market_cap_rank}</span>
            )}
          </h1>
          <div className="coin-detail__price">
            <span className="coin-detail__price-num">{formatPrice(price, currency)}</span>
            {change24h != null && (
              <span className={change24h >= 0 ? "up" : "down"}>
                {formatPercent(change24h)} (24h)
              </span>
            )}
          </div>
        </div>
        <button
          className={"btn btn--star" + (watched ? " btn--star-on" : "")}
          onClick={() => toggle(coin.id)}
          aria-pressed={watched}
        >
          {watched ? "★ Watching" : "☆ Add to watchlist"}
        </button>
      </header>

      <section className="detail-actions">
        <form className="holding-form" onSubmit={handleAddHolding}>
          <label className="holding-form__label" htmlFor="holding-amount">
            Add to portfolio
          </label>
          <div className="holding-form__row">
            <input
              id="holding-amount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className="input"
              placeholder={`Amount of ${coin.symbol?.toUpperCase()}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={!(Number(amount) > 0)}>
              Add
            </button>
            {owned && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => remove(coin.id)}
              >
                Remove
              </button>
            )}
          </div>
          {owned && <p className="holding-form__hint">Already in your portfolio.</p>}
        </form>

        {(homepage || explorer || subreddit) && (
          <div className="detail-links">
            {homepage && (
              <a className="chip-link" href={homepage} target="_blank" rel="noreferrer">
                🌐 Website
              </a>
            )}
            {explorer && (
              <a className="chip-link" href={explorer} target="_blank" rel="noreferrer">
                🔗 Explorer
              </a>
            )}
            {subreddit && (
              <a className="chip-link" href={subreddit} target="_blank" rel="noreferrer">
                💬 Reddit
              </a>
            )}
          </div>
        )}
      </section>

      <div className="range-tabs" role="tablist" aria-label="Chart time range">
        {RANGES.map((r) => (
          <button
            key={r.days}
            role="tab"
            aria-selected={days === r.days}
            className={"range-tab" + (days === r.days ? " range-tab--active" : "")}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {chartLoading ? (
        <Spinner label="Loading chart…" />
      ) : (
        <PriceChart data={chart} currency={currency} days={days} />
      )}

      <section className="stats-grid">
        <Stat label="Market Cap" value={formatCompact(md.market_cap?.[currency], currency)} />
        <Stat label="24h Volume" value={formatCompact(md.total_volume?.[currency], currency)} />
        <Stat label="24h High" value={formatPrice(md.high_24h?.[currency], currency)} />
        <Stat label="24h Low" value={formatPrice(md.low_24h?.[currency], currency)} />
        <Stat
          label="All-Time High"
          value={formatPrice(md.ath?.[currency], currency)}
          sub={formatDate(md.ath_date?.[currency])}
        />
        <Stat
          label="All-Time Low"
          value={formatPrice(md.atl?.[currency], currency)}
          sub={formatDate(md.atl_date?.[currency])}
        />
        <Stat
          label="Circulating Supply"
          value={`${formatNumber(Math.round(circulating))} ${coin.symbol?.toUpperCase()}`}
        />
        <Stat
          label="Max Supply"
          value={
            maxSupply
              ? `${formatNumber(Math.round(maxSupply))} ${coin.symbol?.toUpperCase()}`
              : "∞"
          }
        />
      </section>

      {supplyPct != null && (
        <section className="supply">
          <div className="supply__head">
            <span className="supply__label">Circulating vs. Max Supply</span>
            <span className="supply__pct">{supplyPct}%</span>
          </div>
          <div className="supply__bar" role="progressbar" aria-valuenow={supplyPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="supply__fill" style={{ width: `${supplyPct}%` }} />
          </div>
        </section>
      )}

      {coin.description?.en && (
        <section className="coin-about">
          <h2>About {coin.name}</h2>
          <div
            className="coin-about__text"
            // CoinGecko returns sanitized HTML for descriptions.
            dangerouslySetInnerHTML={{
              __html: coin.description.en.split(". ").slice(0, 4).join(". ") + ".",
            }}
          />
        </section>
      )}
    </article>
  );
}
