/**
 * A stable per-browser session key. Because the demo persists watchlist /
 * portfolio / alerts server-side without requiring login, we scope those rows
 * to this key (sent as the `X-Session-Key` header). Swapping to real auth later
 * only means replacing this with the logged-in user id.
 */
const KEY = "cryptochecker:session";

export function getSessionKey() {
  if (typeof localStorage === "undefined") return "anonymous";
  let key = localStorage.getItem(KEY);
  if (!key) {
    key = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
    localStorage.setItem(KEY, key);
  }
  return key;
}
