import { describe, it, expect } from "vitest";
import reducer, { toggleTheme, setTheme, selectTheme } from "../store/themeSlice.js";

describe("themeSlice", () => {
  it("toggles between dark and light", () => {
    const start = { value: "light" };
    const afterToggle = reducer(start, toggleTheme());
    expect(afterToggle.value).toBe("dark");
    expect(reducer(afterToggle, toggleTheme()).value).toBe("light");
  });

  it("sets an explicit theme", () => {
    const next = reducer({ value: "light" }, setTheme("dark"));
    expect(next.value).toBe("dark");
  });

  it("selectTheme reads the value", () => {
    expect(selectTheme({ theme: { value: "dark" } })).toBe("dark");
  });
});
