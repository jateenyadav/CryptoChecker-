import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { CurrencyProvider } from "./context/CurrencyContext.jsx";
import { WatchlistProvider } from "./context/WatchlistContext.jsx";
import { PortfolioProvider } from "./context/PortfolioContext.jsx";
import { AlertsProvider } from "./context/AlertsContext.jsx";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CurrencyProvider>
          <WatchlistProvider>
                <PortfolioProvider>
                  <AlertsProvider>
                    <App />
                  </AlertsProvider>
                </PortfolioProvider>
          </WatchlistProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
