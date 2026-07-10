/**
 * Portfolio is now persisted server-side (Django + PostgreSQL) via RTK Query.
 * Compatibility layer preserving the previous hook API:
 *   { holdings, ids, setHolding, remove, clear, has, count }
 * where `holdings` is a map of { [coinId]: { amount, name, symbol, image } }.
 */
import { useCallback, useMemo } from "react";
import {
  useGetPortfolioQuery,
  useSetHoldingMutation,
  useRemoveHoldingMutation,
} from "../store/api.js";

export function PortfolioProvider({ children }) {
  return children;
}

export function usePortfolio() {
  const { data = [] } = useGetPortfolioQuery();
  const [setHoldingMut] = useSetHoldingMutation();
  const [removeHoldingMut] = useRemoveHoldingMutation();

  const holdings = useMemo(() => {
    const map = {};
    for (const h of data) {
      map[h.coin.coingecko_id] = {
        amount: Number(h.amount),
        name: h.coin.name,
        symbol: h.coin.symbol,
        image: h.coin.image,
      };
    }
    return map;
  }, [data]);

  const ids = useMemo(() => Object.keys(holdings), [holdings]);

  const setHolding = useCallback(
    (coin, amount) => {
      setHoldingMut({
        coin: { id: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image },
        amount: Number(amount),
      });
    },
    [setHoldingMut]
  );

  const remove = useCallback((id) => removeHoldingMut(id), [removeHoldingMut]);

  const clear = useCallback(() => {
    ids.forEach((id) => removeHoldingMut(id));
  }, [ids, removeHoldingMut]);

  const has = useCallback((id) => Boolean(holdings[id]), [holdings]);

  return { holdings, ids, setHolding, remove, clear, has, count: ids.length };
}
