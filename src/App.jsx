import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { Spinner } from "./components/Status.jsx";

// Code-split routes so the heavy charting page (recharts) loads on demand.
const Home = lazy(() => import("./pages/Home.jsx"));
const Watchlist = lazy(() => import("./pages/Watchlist.jsx"));
const Portfolio = lazy(() => import("./pages/Portfolio.jsx"));
const Converter = lazy(() => import("./pages/Converter.jsx"));
const Compare = lazy(() => import("./pages/Compare.jsx"));
const Alerts = lazy(() => import("./pages/Alerts.jsx"));
const Heatmap = lazy(() => import("./pages/Heatmap.jsx"));
const CoinDetail = lazy(() => import("./pages/CoinDetail.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container main">
        <ErrorBoundary>
          <Suspense fallback={<Spinner label="Loading…" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/converter" element={<Converter />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/heatmap" element={<Heatmap />} />
              <Route path="/coin/:id" element={<CoinDetail />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            Data by{" "}
            <a href="https://www.coingecko.com/en/api" target="_blank" rel="noreferrer">
              CoinGecko
            </a>
            . Built with React + Vite.
          </p>
        </div>
      </footer>
    </>
  );
}
