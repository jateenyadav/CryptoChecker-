import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "cryptochecker:theme";

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable (SSR/test) */
  }
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

const themeSlice = createSlice({
  name: "theme",
  initialState: { value: getInitialTheme() },
  reducers: {
    setTheme(state, action) {
      state.value = action.payload;
    },
    toggleTheme(state) {
      state.value = state.value === "dark" ? "light" : "dark";
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export const selectTheme = (state) => state.theme.value;
export default themeSlice.reducer;
