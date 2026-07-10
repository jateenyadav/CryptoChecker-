/**
 * Alerts are now persisted server-side (Django + PostgreSQL) via RTK Query.
 * This compatibility layer preserves the previous hook API:
 *   { alerts, add, remove, reset, clearTriggered, count, pendingCount,
 *     triggeredCount, permission, requestPermission }
 *
 * Desktop-notification permission remains a browser concern and stays local.
 * Server alert rows expose `triggered_at`; we surface it as `triggeredAt` and
 * keep a `coinId` field so existing components render unchanged.
 */
import { useCallback, useMemo, useState } from "react";
import {
  useGetAlertsQuery,
  useAddAlertMutation,
  useRemoveAlertMutation,
} from "../store/api.js";

export function AlertsProvider({ children }) {
  return children;
}

export function useAlerts() {
  const { data = [] } = useGetAlertsQuery();
  const [addAlertMut] = useAddAlertMutation();
  const [removeAlertMut] = useRemoveAlertMutation();
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const alerts = useMemo(
    () =>
      data.map((a) => ({
        id: a.id,
        coinId: a.coin.coingecko_id,
        name: a.coin.name,
        symbol: a.coin.symbol,
        image: a.coin.image,
        direction: a.direction,
        target: Number(a.target),
        currency: a.currency,
        createdAt: a.created_at,
        triggeredAt: a.triggered_at,
      })),
    [data]
  );

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
      addAlertMut({
        coin: { id: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image },
        direction: direction === "below" ? "below" : "above",
        target: numeric,
        currency: coin.currency || "usd",
      });
    },
    [addAlertMut]
  );

  const remove = useCallback((id) => removeAlertMut(id), [removeAlertMut]);

  const clearTriggered = useCallback(() => {
    alerts.filter((a) => a.triggeredAt).forEach((a) => removeAlertMut(a.id));
  }, [alerts, removeAlertMut]);

  // Server owns trigger state; resetting a single alert isn't supported server-side.
  const reset = useCallback(() => {}, []);

  const triggeredCount = alerts.filter((a) => a.triggeredAt).length;

  return {
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
  };
}
