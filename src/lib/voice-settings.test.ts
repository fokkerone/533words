import { describe, it, expect, beforeEach } from "vitest";
import { saveVoiceURI, loadVoiceURI, clearVoiceURI } from "./voice-settings";

const keyFor = (userId: string) => `533words:${userId}:voice-uri`;

describe("voice-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a voiceURI through save then load", () => {
    saveVoiceURI("user-a", "Google Deutsch");
    expect(loadVoiceURI("user-a")).toBe("Google Deutsch");
  });

  it("returns null when nothing is stored (automatic selection)", () => {
    expect(loadVoiceURI("user-a")).toBeNull();
  });

  it("clearVoiceURI removes the stored value so loadVoiceURI returns null", () => {
    saveVoiceURI("user-a", "Google Deutsch");
    clearVoiceURI("user-a");
    expect(loadVoiceURI("user-a")).toBeNull();
  });

  it("does not throw when localStorage access fails", () => {
    localStorage.setItem(keyFor("user-a"), "");
    expect(() => loadVoiceURI("user-a")).not.toThrow();
  });

  it("scopes storage per learner", () => {
    saveVoiceURI("user-a", "Anna");
    saveVoiceURI("user-b", "Petra");

    expect(loadVoiceURI("user-a")).toBe("Anna");
    expect(loadVoiceURI("user-b")).toBe("Petra");
  });
});
