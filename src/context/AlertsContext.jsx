import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSimplePrice } from "../api/coingecko.js";
import { useCurrency } from "./CurrencyContext.jsx";

const AlertsContext = createContext(null);
const STORAGE_KEY = "cryptochecker:alerts";
const POLL_MS = 60_000;

/**
 * An alert is { id, coinId, name, symbol, image, direction: "above"|"below",
 * target, currency, createdAt, triggeredAt|null }.
 *
 * Alerts are evaluated client-side against live spot prices on an interval.
 * When the condition is met we mark the alert triggered and (if the user has
 * granted permission) raise a desktop notification.
 */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AlertsProvider({ children }) {
  const { currency } = useCurrency();
  const [alerts, setAlerts] = useState(load);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return "denied";
    }
  }, []);

  const add = useCallback(
    (coin, direction, target) => {
      const numeric = Number(target);
      if (!coin?.id || !numeric || numeric <= 0) return;
      setAlerts((prev) => [
        {
          id: randomId(),
          coinId: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.image,
          direction: direction === "below" ? "below" : "above",
          target: numeric,
          currency,
          createdAt: Date.now(),
          triggeredAt: null,
        },
        ...prev,
      ]);
    },
    [currency]
  );

  const remove = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearTriggered = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.triggeredAt));
  }, []);

  const reset = useCallback((id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, triggeredAt: null } : a))
    );
  }, []);

  const notify = useCallback(
    (alert, price) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return;
      }
      const arrow = alert.direction === "above" ? "▲" : "▼";
      try {
        new Notification(`${alert.symbol?.toUpperCase()} price alert ${arrow}`, {
          body: `${alert.name} is now ${price} (target ${alert.target} ${alert.currency.toUpperCase()})`,
          icon: alert.image,
        });
      } catch {
        /* notifications can throw in some environments; ignore */
      }
    },
    []
  );

  // Poll live prices and evaluate pending alerts.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const pending = alertsRef.current.filter((a) => !a.triggeredAt);
      if (!pending.length) return;

      // Group by currency to minimise requests.
      const byCurrency = pending.reduce((acc, a) => {
        (acc[a.currency] ||= new Set()).add(a.coinId);
        return acc;
      }, {});

      const triggered = [];
      for (const [cur, idSet] of Object.entries(byCurrency)) {
        try {
          const data = await getSimplePrice([...idSet], cur);
          if (cancelled) return;
          for (const a of pending) {
            if (a.currency !== cur) continue;
            const price = data?.[a.coinId]?.[cur];
            if (price == null) continue;
            const hit =
              a.direction === "above" ? price >= a.target : price <= a.target;
            if (hit) triggered.push({ alert: a, price });
          }
        } catch {
          /* transient errors are fine; we retry next tick */
        }
      }

      if (triggered.length && !cancelled) {
        const now = Date.now();
        const ids = new Set(triggered.map((t) => t.alert.id));
        setAlerts((prev) =>
          prev.map((a) => (ids.has(a.id) ? { ...a, triggeredAt: now } : a))
        );
        triggered.forEach((t) => notify(t.alert, t.price));
      }
    }

    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [notify]);

  const triggeredCount = useMemo(
    () => alerts.filter((a) => a.triggeredAt).length,
    [alerts]
  );

  const value = useMemo(
    () => ({
      alerts,
      add,
      remove,
      reset,
      clearTriggered,
      count: alerts.length,
      pendingCount: alerts.filter((a) => !a.triggeredAt).length,
      triggeredCount,
      permission,
      requestPermission,
    }),
    [alerts, add, remove, reset, clearTriggered, triggeredCount, permission, requestPermission]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
