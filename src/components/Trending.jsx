import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTrending } from "../api/coingecko.js";

export default function Trending() {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    let alive = true;
    getTrending()
      .then((res) => {
        if (alive) setCoins((res.coins ?? []).slice(0, 7));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!coins.length) return null;

  return (
    <section className="trending" aria-label="Trending coins">
      <span className="trending__label">🔥 Trending</span>
      <ul className="trending__list">
        {coins.map(({ item }) => (
          <li key={item.id}>
            <Link to={`/coin/${item.id}`} className="trending__pill">
              <img src={item.small} alt="" width="18" height="18" loading="lazy" />
              <span>{item.symbol?.toUpperCase()}</span>
              {item.data?.price_change_percentage_24h?.usd != null && (
                <span
                  className={
                    item.data.price_change_percentage_24h.usd >= 0 ? "up" : "down"
                  }
                >
                  {item.data.price_change_percentage_24h.usd >= 0 ? "▲" : "▼"}
                  {Math.abs(item.data.price_change_percentage_24h.usd).toFixed(1)}%
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
