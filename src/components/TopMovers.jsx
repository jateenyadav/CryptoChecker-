import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { formatPrice, formatPercent } from "../utils/format.js";

/**
 * Highlights the biggest 24h gainers and losers from a list of coins.
 * Pure presentational helper — receives the same market data the table uses,
 * so it adds zero extra network requests.
 */
export default function TopMovers({ coins = [], count = 5 }) {
  const { currency } = useCurrency();

  const { gainers, losers } = useMemo(() => {
    const withChange = coins.filter(
      (c) => typeof c.price_change_percentage_24h === "number"
    );
    const sorted = [...withChange].sort(
      (a, b) =>
        b.price_change_percentage_24h - a.price_change_percentage_24h
    );
    return {
      gainers: sorted.slice(0, count),
      losers: sorted.slice(-count).reverse(),
    };
  }, [coins, count]);

  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <section className="movers" aria-label="Top movers">
      <MoverColumn
        title="Top gainers"
        icon="📈"
        coins={gainers}
        currency={currency}
      />
      <MoverColumn
        title="Top losers"
        icon="📉"
        coins={losers}
        currency={currency}
      />
    </section>
  );
}

function MoverColumn({ title, icon, coins, currency }) {
  return (
    <div className="movers__col">
      <h3 className="movers__title">
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <ul className="movers__list">
        {coins.map((c) => {
          const pct = c.price_change_percentage_24h;
          const up = pct >= 0;
          return (
            <li key={c.id} className="movers__item">
              <Link to={`/coin/${c.id}`} className="movers__coin">
                <img
                  src={c.image}
                  alt=""
                  className="movers__img"
                  width={22}
                  height={22}
                  loading="lazy"
                />
                <span className="movers__symbol">
                  {c.symbol?.toUpperCase()}
                </span>
              </Link>
              <span className="movers__price">
                {formatPrice(c.current_price, currency)}
              </span>
              <span className={"movers__pct " + (up ? "is-up" : "is-down")}>
                {formatPercent(pct)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
