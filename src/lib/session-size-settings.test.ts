import { beforeEach, describe, expect, it } from "vitest";
import { loadSessionSize, saveSessionSize } from "./session-size-settings";

const keyFor = (userId: string) => `533words:${userId}:session-size`;

describe("session-size-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a valid value through save then load", () => {
    saveSessionSize("user-a", 32);
    expect(loadSessionSize("user-a")).toBe(32);
  });

  it("returns the default of 24 when nothing is stored", () => {
    expect(loadSessionSize("user-a")).toBe(24);
  });

  it("returns the default when the stored value is not one of the valid sizes", () => {
    localStorage.setItem(keyFor("user-a"), JSON.stringify(100));
    expect(loadSessionSize("user-a")).toBe(24);
  });

  it("returns the default when the stored value is corrupt/non-numeric JSON", () => {
    localStorage.setItem(keyFor("user-a"), "not-a-number");
    expect(loadSessionSize("user-a")).toBe(24);
  });

  it("returns the default when the stored value is invalid JSON", () => {
    localStorage.setItem(keyFor("user-a"), "{not valid json");
    expect(loadSessionSize("user-a")).toBe(24);
  });

  it("scopes storage per learner", () => {
    saveSessionSize("user-a", 8);
    saveSessionSize("user-b", 64);

    expect(loadSessionSize("user-a")).toBe(8);
    expect(loadSessionSize("user-b")).toBe(64);
  });
});
