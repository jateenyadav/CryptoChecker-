import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api.js";
import themeReducer, { selectTheme } from "./themeSlice.js";
import currencyReducer, { selectCurrency } from "./currencySlice.js";

/**
 * Side-effect middleware: mirror theme/currency into localStorage and reflect
 * the theme on <html data-theme> so styling stays in sync — the same behaviour
 * the old Context providers had, now centralised in the store.
 */
const persistMiddleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  if (action.type?.startsWith("theme/")) {
    const theme = selectTheme(storeApi.getState());
    localStorage.setItem("cryptochecker:theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }
  if (action.type?.startsWith("currency/")) {
    localStorage.setItem("cryptochecker:currency", selectCurrency(storeApi.getState()));
  }
  return result;
};

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    currency: currencyReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(api.middleware, persistMiddleware),
});

// Apply the initial theme on load.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", selectTheme(store.getState()));
}
