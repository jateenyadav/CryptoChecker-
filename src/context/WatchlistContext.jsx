/**
 * Watchlist is now persisted server-side (Django + PostgreSQL) via RTK Query.
 * This compatibility layer preserves the previous hook API
 * ({ ids, toggle, isWatched, clear, count }) so existing components need no
 * changes. `toggle` accepts either a coin id (string) or a coin object; when a
 * full coin object is supplied we forward its metadata so the backend can
 * upsert the Coin row.
 */
import { useCallback, useMemo } from "react";
import {
  useGetWatchlistQuery,
  useAddWatchMutation,
  useRemoveWatchMutation,
} from "../store/api.js";

export function WatchlistProvider({ children }) {
  return children;
}

function toRef(coinOrId) {
  if (typeof coinOrId === "string") return { id: coinOrId };
  return {
    id: coinOrId.id,
    symbol: coinOrId.symbol,
    name: coinOrId.name,
    image: coinOrId.image,
  };
}

export function useWatchlist() {
  const { data = [] } = useGetWatchlistQuery();
  const [addWatch] = useAddWatchMutation();
  const [removeWatch] = useRemoveWatchMutation();

  const ids = useMemo(() => data.map((w) => w.coin.coingecko_id), [data]);

  const isWatched = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (coinOrId) => {
      const ref = toRef(coinOrId);
      if (ids.includes(ref.id)) removeWatch(ref.id);
      else addWatch(ref);
    },
    [ids, addWatch, removeWatch]
  );

  const clear = useCallback(() => {
    ids.forEach((id) => removeWatch(id));
  }, [ids, removeWatch]);

  return { ids, toggle, isWatched, clear, count: ids.length };
}
