import { beforeEach, describe, expect, it } from "vitest";
import { loadTheme, saveTheme } from "./theme-settings";

const keyFor = (userId: string) => `533words:${userId}:theme`;

describe("theme-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a saved value", () => {
    saveTheme("user-a", "dark");
    expect(loadTheme("user-a")).toBe("dark");
  });

  it("defaults to light when nothing is stored", () => {
    expect(loadTheme("user-a")).toBe("light");
  });

  it("defaults to light when the stored value is an invalid string written directly", () => {
    localStorage.setItem(keyFor("user-a"), "blue");
    expect(loadTheme("user-a")).toBe("light");
  });

  it("defaults to light when the stored value is invalid JSON", () => {
    localStorage.setItem(keyFor("user-a"), "{not valid json");
    expect(loadTheme("user-a")).toBe("light");
  });

  it("defaults to light when the stored value is valid JSON but not a valid theme", () => {
    localStorage.setItem(keyFor("user-a"), JSON.stringify("blue"));
    expect(loadTheme("user-a")).toBe("light");
  });

  it("scopes storage per learner", () => {
    saveTheme("user-a", "dark");
    saveTheme("user-b", "light");

    expect(loadTheme("user-a")).toBe("dark");
    expect(loadTheme("user-b")).toBe("light");
  });
});
