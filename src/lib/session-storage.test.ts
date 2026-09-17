import { describe, it, expect, beforeEach } from "vitest";
import { saveSession, loadSession, clearSession } from "./session-storage";

const keyFor = (userId: string) => `533words:${userId}:session`;

describe("session-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value through save then load", () => {
    type Dummy = { pool: string[]; current: string | null; flagged: Record<string, boolean> };
    const state: Dummy = { pool: ["a", "b"], current: "c", flagged: { d: true } };

    saveSession("user-a", state);
    const loaded = loadSession<Dummy>("user-a");

    expect(loaded).toEqual(state);
  });

  it("returns null when nothing is stored", () => {
    expect(loadSession("user-a")).toBeNull();
  });

  it("returns null instead of throwing when stored data is corrupt JSON", () => {
    localStorage.setItem(keyFor("user-a"), "{not valid json");

    expect(loadSession("user-a")).toBeNull();
  });

  it("clearSession removes the stored value so loadSession returns null", () => {
    saveSession("user-a", { foo: "bar" });
    clearSession("user-a");

    expect(loadSession("user-a")).toBeNull();
    expect(localStorage.getItem(keyFor("user-a"))).toBeNull();
  });

  it("scopes storage per learner: two learner IDs never collide, and loading one never returns the other's data", () => {
    saveSession("user-a", { value: "a-data" });
    saveSession("user-b", { value: "b-data" });

    expect(localStorage.getItem(keyFor("user-a"))).not.toBeNull();
    expect(localStorage.getItem(keyFor("user-b"))).not.toBeNull();
    expect(localStorage.getItem(keyFor("user-a"))).not.toEqual(
      localStorage.getItem(keyFor("user-b")),
    );

    expect(loadSession("user-a")).toEqual({ value: "a-data" });
    expect(loadSession("user-b")).toEqual({ value: "b-data" });

    clearSession("user-a");
    expect(loadSession("user-a")).toBeNull();
    expect(loadSession("user-b")).toEqual({ value: "b-data" });
  });
});
