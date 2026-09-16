import { describe, it, expect, beforeEach } from "vitest";
import { saveSession, loadSession, clearSession } from "./session-storage";

const SESSION_STORAGE_KEY = "533words:session";

describe("session-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value through save then load", () => {
    type Dummy = { pool: string[]; current: string | null; flagged: Record<string, boolean> };
    const state: Dummy = { pool: ["a", "b"], current: "c", flagged: { d: true } };

    saveSession(state);
    const loaded = loadSession<Dummy>();

    expect(loaded).toEqual(state);
  });

  it("returns null when nothing is stored", () => {
    expect(loadSession()).toBeNull();
  });

  it("returns null instead of throwing when stored data is corrupt JSON", () => {
    localStorage.setItem(SESSION_STORAGE_KEY, "{not valid json");

    expect(loadSession()).toBeNull();
  });

  it("clearSession removes the stored value so loadSession returns null", () => {
    saveSession({ foo: "bar" });
    clearSession();

    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
