import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { useWatchlist } from "../context/WatchlistContext.jsx";
import { usePortfolio } from "../context/PortfolioContext.jsx";
import { useAlerts } from "../context/AlertsContext.jsx";
import { SUPPORTED_CURRENCIES } from "../api/coingecko.js";
import SearchPalette from "./SearchPalette.jsx";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { count } = useWatchlist();
  const { count: portfolioCount } = usePortfolio();
  const { count: alertCount, triggeredCount } = useAlerts();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K shortcut to open the search palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="brand" aria-label="CryptoChecker home">
          <img src="/coin.svg" alt="" className="brand__logo" width="28" height="28" />
          <span className="brand__name">CryptoChecker</span>
        </Link>

        <nav className="navbar__links" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Market
          </NavLink>
          <NavLink to="/watchlist" className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Watchlist
            {count > 0 && <span className="badge">{count}</span>}
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Portfolio
            {portfolioCount > 0 && <span className="badge">{portfolioCount}</span>}
          </NavLink>
          <NavLink to="/converter" className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Converter
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Compare
          </NavLink>
          <NavLink to="/heatmap" className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Heatmap
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => "navlink" + (isActive ? " navlink--active" : "")}>
            Alerts
            {triggeredCount > 0 ? (
              <span className="badge badge--alert">{triggeredCount}</span>
            ) : (
              alertCount > 0 && <span className="badge">{alertCount}</span>
            )}
          </NavLink>
        </nav>

        <div className="navbar__controls">
          <button
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Search coins"
            title="Search coins (⌘K)"
          >
            <span aria-hidden="true">🔍</span>
            <span className="search-trigger__text">Search</span>
            <kbd className="search-trigger__kbd">⌘K</kbd>
          </button>

          <label className="select-wrap" aria-label="Select currency">
            <select
              className="select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
