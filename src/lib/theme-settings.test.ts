import { beforeEach, describe, expect, it } from "vitest";
import { loadTheme, saveTheme } from "./theme-settings";

describe("theme-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a saved value", () => {
    saveTheme("dark");
    expect(loadTheme()).toBe("dark");
  });

  it("defaults to light when nothing is stored", () => {
    expect(loadTheme()).toBe("light");
  });

  it("defaults to light when the stored value is an invalid string written directly", () => {
    localStorage.setItem("533words:theme", "blue");
    expect(loadTheme()).toBe("light");
  });

  it("defaults to light when the stored value is invalid JSON", () => {
    localStorage.setItem("533words:theme", "{not valid json");
    expect(loadTheme()).toBe("light");
  });

  it("defaults to light when the stored value is valid JSON but not a valid theme", () => {
    localStorage.setItem("533words:theme", JSON.stringify("blue"));
    expect(loadTheme()).toBe("light");
  });
});
