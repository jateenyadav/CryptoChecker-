import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { search } from "../api/coingecko.js";
import { useDebounce } from "../hooks/useDebounce.js";

/**
 * A keyboard-driven command palette for searching all coins.
 * Open with the navbar button or ⌘K / Ctrl+K; navigate with arrows, Enter to open.
 */
export default function SearchPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const debounced = useDebounce(query, 250);

  // Focus the input whenever the palette opens; reset state on close.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    setQuery("");
    setResults([]);
    setActive(0);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    search(q)
      .then((data) => {
        if (cancelled) return;
        setResults((data?.coins ?? []).slice(0, 12));
        setActive(0);
      })
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const goTo = (coin) => {
    if (!coin) return;
    onClose();
    navigate(`/coin/${coin.id}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      goTo(results[active]);
    }
  };

  if (!open) return null;

  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Search coins">
      <button className="palette__backdrop" aria-label="Close search" onClick={onClose} />
      <div className="palette__panel">
        <div className="palette__search">
          <span className="palette__icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            className="palette__input"
            placeholder="Search any coin…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search any coin"
          />
          <kbd className="palette__kbd">esc</kbd>
        </div>

        <div className="palette__results" role="listbox">
          {loading && <p className="palette__hint">Searching…</p>}
          {!loading && debounced.trim() && results.length === 0 && (
            <p className="palette__hint">No coins found for “{debounced.trim()}”.</p>
          )}
          {!loading && !debounced.trim() && (
            <p className="palette__hint">Start typing to search across all cryptocurrencies.</p>
          )}
          {results.map((coin, i) => (
            <button
              key={coin.id}
              role="option"
              aria-selected={i === active}
              className={"palette__item" + (i === active ? " palette__item--active" : "")}
              onMouseEnter={() => setActive(i)}
              onClick={() => goTo(coin)}
            >
              {coin.thumb && <img src={coin.thumb} alt="" width="22" height="22" />}
              <span className="palette__name">{coin.name}</span>
              <span className="palette__sym">{coin.symbol}</span>
              {coin.market_cap_rank && (
                <span className="palette__rank">#{coin.market_cap_rank}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
