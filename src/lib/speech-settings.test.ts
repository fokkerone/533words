import { describe, it, expect, beforeEach } from "vitest";
import { saveSpeed, loadSpeed } from "./speech-settings";

const SPEECH_SPEED_KEY = "533words:speech-speed";

describe("speech-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value within the valid range", () => {
    saveSpeed(0.75);
    expect(loadSpeed()).toBe(0.75);
  });

  it("returns the 1.0 default when nothing is stored", () => {
    expect(loadSpeed()).toBe(1.0);
  });

  it("clamps an out-of-range value to the nearest bound on save", () => {
    saveSpeed(3.0);
    expect(loadSpeed()).toBe(1.5);

    saveSpeed(-1);
    expect(loadSpeed()).toBe(0.5);
  });

  it("clamps an out-of-range stored value on load, independent of save-time clamping", () => {
    localStorage.setItem(SPEECH_SPEED_KEY, JSON.stringify(9.9));
    expect(loadSpeed()).toBe(1.5);

    localStorage.setItem(SPEECH_SPEED_KEY, JSON.stringify(-9.9));
    expect(loadSpeed()).toBe(0.5);
  });

  it("returns the 1.0 default instead of throwing when stored data is corrupt or non-numeric", () => {
    localStorage.setItem(SPEECH_SPEED_KEY, "not-a-number");
    expect(() => loadSpeed()).not.toThrow();
    expect(loadSpeed()).toBe(1.0);

    localStorage.setItem(SPEECH_SPEED_KEY, "{not valid json");
    expect(() => loadSpeed()).not.toThrow();
    expect(loadSpeed()).toBe(1.0);
  });
});
