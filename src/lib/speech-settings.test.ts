import { describe, it, expect, beforeEach } from "vitest";
import { saveSpeed, loadSpeed } from "./speech-settings";

const keyFor = (userId: string) => `533words:${userId}:speech-speed`;

describe("speech-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value within the valid range", () => {
    saveSpeed("user-a", 0.75);
    expect(loadSpeed("user-a")).toBe(0.75);
  });

  it("returns the 1.0 default when nothing is stored", () => {
    expect(loadSpeed("user-a")).toBe(1.0);
  });

  it("clamps an out-of-range value to the nearest bound on save", () => {
    saveSpeed("user-a", 3.0);
    expect(loadSpeed("user-a")).toBe(2.0);

    saveSpeed("user-a", -1);
    expect(loadSpeed("user-a")).toBe(0.1);
  });

  it("clamps an out-of-range stored value on load, independent of save-time clamping", () => {
    localStorage.setItem(keyFor("user-a"), JSON.stringify(9.9));
    expect(loadSpeed("user-a")).toBe(2.0);

    localStorage.setItem(keyFor("user-a"), JSON.stringify(-9.9));
    expect(loadSpeed("user-a")).toBe(0.1);
  });

  it("returns the 1.0 default instead of throwing when stored data is corrupt or non-numeric", () => {
    localStorage.setItem(keyFor("user-a"), "not-a-number");
    expect(() => loadSpeed("user-a")).not.toThrow();
    expect(loadSpeed("user-a")).toBe(1.0);

    localStorage.setItem(keyFor("user-a"), "{not valid json");
    expect(() => loadSpeed("user-a")).not.toThrow();
    expect(loadSpeed("user-a")).toBe(1.0);
  });

  it("scopes storage per learner", () => {
    saveSpeed("user-a", 0.5);
    saveSpeed("user-b", 1.8);

    expect(loadSpeed("user-a")).toBe(0.5);
    expect(loadSpeed("user-b")).toBe(1.8);
  });
});
