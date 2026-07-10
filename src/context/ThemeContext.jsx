/**
 * Theme is now backed by the Redux store (see store/themeSlice.js). This module
 * is kept as a thin compatibility layer so existing imports of `useTheme` and
 * `ThemeProvider` continue to work unchanged after the RTK migration.
 */
import { useDispatch, useSelector } from "react-redux";
import { selectTheme, toggleTheme as toggleThemeAction } from "../store/themeSlice.js";

export function ThemeProvider({ children }) {
  return children;
}

export function useTheme() {
  const theme = useSelector(selectTheme);
  const dispatch = useDispatch();
  return { theme, toggleTheme: () => dispatch(toggleThemeAction()) };
}
