// Dependency-free CSV export for market data.

function csvCell(value) {
  if (value == null) return "";
  const str = String(value);
  // Escape quotes and wrap fields containing commas/quotes/newlines.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build and download a CSV file from the market coin list.
 * @param {Array} coins  CoinGecko market objects
 * @param {string} currency  e.g. "usd"
 */
export function downloadCoinsCsv(coins = [], currency = "usd") {
  if (!coins.length) return;

  const headers = [
    "Rank",
    "Name",
    "Symbol",
    `Price (${currency.toUpperCase()})`,
    "1h %",
    "24h %",
    "7d %",
    `Market Cap (${currency.toUpperCase()})`,
    `Volume 24h (${currency.toUpperCase()})`,
  ];

  const rows = coins.map((c) => [
    c.market_cap_rank,
    c.name,
    c.symbol?.toUpperCase(),
    c.current_price,
    c.price_change_percentage_1h_in_currency,
    c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h,
    c.price_change_percentage_7d_in_currency,
    c.market_cap,
    c.total_volume,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `cryptochecker-markets-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
