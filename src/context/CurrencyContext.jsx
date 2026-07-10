/**
 * Currency is now backed by the Redux store (see store/currencySlice.js).
 * Kept as a compatibility layer so existing `useCurrency` / `CurrencyProvider`
 * imports work unchanged after the RTK migration.
 */
import { useDispatch, useSelector } from "react-redux";
import { selectCurrency, setCurrency as setCurrencyAction } from "../store/currencySlice.js";

export function CurrencyProvider({ children }) {
  return children;
}

export function useCurrency() {
  const currency = useSelector(selectCurrency);
  const dispatch = useDispatch();
  return { currency, setCurrency: (c) => dispatch(setCurrencyAction(c)) };
}
