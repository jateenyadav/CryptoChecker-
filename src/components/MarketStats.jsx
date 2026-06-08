import { useEffect, useState } from "react";
import { getGlobal } from "../api/coingecko.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { formatCompact, formatPercent } from "../utils/format.js";

export default function MarketStats() {
  const { currency } = useCurrency();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    getGlobal()
      .then((res) => alive && setData(res.data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  const cap = data.total_market_cap?.[currency];
  const vol = data.total_volume?.[currency];
  const capChange = data.market_cap_change_percentage_24h_usd;
  const btcDom = data.market_cap_percentage?.btc;

  const changeClass = capChange >= 0 ? "stat__change up" : "stat__change down";

  return (
    <section className="market-stats" aria-label="Global market statistics">
      <div className="stat">
        <span className="stat__label">Market Cap</span>
        <span className="stat__value">{formatCompact(cap, currency)}</span>
        <span className={changeClass}>{formatPercent(capChange)}</span>
      </div>
      <div className="stat">
        <span className="stat__label">24h Volume</span>
        <span className="stat__value">{formatCompact(vol, currency)}</span>
      </div>
      <div className="stat">
        <span className="stat__label">BTC Dominance</span>
        <span className="stat__value">{btcDom != null ? `${btcDom.toFixed(1)}%` : "—"}</span>
      </div>
      <div className="stat">
        <span className="stat__label">Active Coins</span>
        <span className="stat__value">{data.active_cryptocurrencies?.toLocaleString() ?? "—"}</span>
      </div>
    </section>
  );
}
