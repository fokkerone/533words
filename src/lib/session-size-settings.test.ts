import { beforeEach, describe, expect, it } from "vitest";
import { loadSessionSize, saveSessionSize } from "./session-size-settings";

const SESSION_SIZE_KEY = "533words:session-size";

describe("session-size-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a valid value through save then load", () => {
    saveSessionSize(32);
    expect(loadSessionSize()).toBe(32);
  });

  it("returns the default of 24 when nothing is stored", () => {
    expect(loadSessionSize()).toBe(24);
  });

  it("returns the default when the stored value is not one of the valid sizes", () => {
    localStorage.setItem(SESSION_SIZE_KEY, JSON.stringify(100));
    expect(loadSessionSize()).toBe(24);
  });

  it("returns the default when the stored value is corrupt/non-numeric JSON", () => {
    localStorage.setItem(SESSION_SIZE_KEY, "not-a-number");
    expect(loadSessionSize()).toBe(24);
  });

  it("returns the default when the stored value is invalid JSON", () => {
    localStorage.setItem(SESSION_SIZE_KEY, "{not valid json");
    expect(loadSessionSize()).toBe(24);
  });
});
