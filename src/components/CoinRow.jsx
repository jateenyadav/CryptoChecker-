import { Link } from "react-router-dom";
import Sparkline from "./Sparkline.jsx";
import { useWatchlist } from "../context/WatchlistContext.jsx";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { formatPrice, formatCompact, formatPercent } from "../utils/format.js";

function PercentCell({ value }) {
  if (value == null) return <td className="num muted">—</td>;
  const cls = value >= 0 ? "up" : "down";
  return (
    <td className={`num ${cls}`}>
      {formatPercent(value)}
    </td>
  );
}

export default function CoinRow({ coin, rank }) {
  const { currency } = useCurrency();
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(coin.id);

  return (
    <tr className="coin-row">
      <td className="coin-row__star">
        <button
          className={"star" + (watched ? " star--on" : "")}
          aria-pressed={watched}
          aria-label={watched ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}
          onClick={(e) => {
            e.preventDefault();
            toggle(coin.id);
          }}
          title={watched ? "Remove from watchlist" : "Add to watchlist"}
        >
          {watched ? "★" : "☆"}
        </button>
      </td>
      <td className="num muted">{rank ?? coin.market_cap_rank ?? "—"}</td>
      <td className="coin-row__name">
        <Link to={`/coin/${coin.id}`} className="coin-link">
          <img src={coin.image} alt="" width="26" height="26" loading="lazy" />
          <span className="coin-link__text">
            <span className="coin-link__name">{coin.name}</span>
            <span className="coin-link__sym">{coin.symbol?.toUpperCase()}</span>
          </span>
        </Link>
      </td>
      <td className="num">{formatPrice(coin.current_price, currency)}</td>
      <PercentCell value={coin.price_change_percentage_1h_in_currency} />
      <PercentCell value={coin.price_change_percentage_24h_in_currency} />
      <PercentCell value={coin.price_change_percentage_7d_in_currency} />
      <td className="num hide-sm">{formatCompact(coin.market_cap, currency)}</td>
      <td className="coin-row__spark hide-sm">
        <Sparkline data={coin.sparkline_in_7d?.price} />
      </td>
    </tr>
  );
}
