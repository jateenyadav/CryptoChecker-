import CoinRow from "./CoinRow.jsx";

const COLUMNS = [
  { key: "market_cap_rank", label: "#", sortable: true, num: true },
  { key: "name", label: "Coin", sortable: true },
  { key: "current_price", label: "Price", sortable: true, num: true },
  { key: "price_change_percentage_1h_in_currency", label: "1h", sortable: true, num: true },
  { key: "price_change_percentage_24h_in_currency", label: "24h", sortable: true, num: true },
  { key: "price_change_percentage_7d_in_currency", label: "7d", sortable: true, num: true },
  { key: "market_cap", label: "Market Cap", sortable: true, num: true, hideSm: true },
  { key: "spark", label: "Last 7d", sortable: false, hideSm: true },
];

export default function CoinTable({ coins, sort, onSort }) {
  function ariaSort(key) {
    if (sort?.key !== key) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="table-wrap">
      <table className="coin-table">
        <thead>
          <tr>
            <th aria-label="Watchlist" />
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                aria-sort={col.sortable ? ariaSort(col.key) : undefined}
                className={
                  (col.num ? "num " : "") + (col.hideSm ? "hide-sm " : "")
                }
              >
                {col.sortable ? (
                  <button
                    className="th-sort"
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    {sort?.key === col.key && (
                      <span aria-hidden="true">{sort.dir === "asc" ? " ▲" : " ▼"}</span>
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => (
            <CoinRow key={coin.id} coin={coin} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
