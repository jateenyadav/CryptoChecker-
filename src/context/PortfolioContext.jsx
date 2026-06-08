import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const PortfolioContext = createContext(null);
const STORAGE_KEY = "cryptochecker:portfolio";

/**
 * Holdings are stored as a map of { [coinId]: { amount, name, symbol, image } }.
 * We persist the lightweight coin metadata alongside the amount so the
 * Portfolio page can render rows even before live prices have loaded.
 */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function PortfolioProvider({ children }) {
  const [holdings, setHoldings] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  const setHolding = useCallback((coin, amount) => {
    const numeric = Number(amount);
    setHoldings((prev) => {
      const next = { ...prev };
      if (!numeric || numeric <= 0) {
        delete next[coin.id];
        return next;
      }
      next[coin.id] = {
        amount: numeric,
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
      };
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setHoldings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const clear = useCallback(() => setHoldings({}), []);

  const has = useCallback((id) => Boolean(holdings[id]), [holdings]);

  const value = useMemo(
    () => ({
      holdings,
      ids: Object.keys(holdings),
      setHolding,
      remove,
      clear,
      has,
      count: Object.keys(holdings).length,
    }),
    [holdings, setHolding, remove, clear, has]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
