// Lightweight, dependency-free formatting helpers.

const CURRENCY_SYMBOLS = {
  usd: "$",
  eur: "€",
  gbp: "£",
  inr: "₹",
  jpy: "¥",
  aud: "A$",
  cad: "C$",
  btc: "₿",
  eth: "Ξ",
};

export function currencySymbol(currency = "usd") {
  return CURRENCY_SYMBOLS[currency?.toLowerCase()] ?? "";
}

/**
 * Format a number as a price. Adapts decimal precision to the magnitude so
 * tiny altcoins (e.g. 0.00004213) and large coins (e.g. 64,231.55) both read well.
 */
export function formatPrice(value, currency = "usd") {
  if (value == null || Number.isNaN(value)) return "—";
  const symbol = currencySymbol(currency);
  const abs = Math.abs(value);

  let maximumFractionDigits;
  if (abs >= 1000) maximumFractionDigits = 2;
  else if (abs >= 1) maximumFractionDigits = 4;
  else if (abs >= 0.01) maximumFractionDigits = 6;
  else maximumFractionDigits = 8;

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
  return `${symbol}${formatted}`;
}

/** Format large numbers compactly: 1.2T, 845.3B, 12.4M. */
export function formatCompact(value, currency = "usd") {
  if (value == null || Number.isNaN(value)) return "—";
  const symbol = currencySymbol(currency);
  const abs = Math.abs(value);
  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      return `${symbol}${(value / u.v).toFixed(2)}${u.s}`;
    }
  }
  return `${symbol}${value.toLocaleString()}`;
}

export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

/** Format a percentage with a sign and 2 decimals. */
export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function classNames(...args) {
  return args.filter(Boolean).join(" ");
}
