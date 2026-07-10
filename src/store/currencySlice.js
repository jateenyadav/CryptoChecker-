import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "cryptochecker:currency";

function getInitial() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "usd";
  } catch {
    return "usd";
  }
}

const currencySlice = createSlice({
  name: "currency",
  initialState: { value: getInitial() },
  reducers: {
    setCurrency(state, action) {
      state.value = action.payload;
    },
  },
});

export const { setCurrency } = currencySlice.actions;
export const selectCurrency = (state) => state.currency.value;
export default currencySlice.reducer;
