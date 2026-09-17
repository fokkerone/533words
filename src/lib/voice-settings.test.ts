import { describe, it, expect, beforeEach } from "vitest";
import { saveVoiceURI, loadVoiceURI, clearVoiceURI } from "./voice-settings";

const VOICE_URI_KEY = "533words:voice-uri";

describe("voice-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a voiceURI through save then load", () => {
    saveVoiceURI("Google Deutsch");
    expect(loadVoiceURI()).toBe("Google Deutsch");
  });

  it("returns null when nothing is stored (automatic selection)", () => {
    expect(loadVoiceURI()).toBeNull();
  });

  it("clearVoiceURI removes the stored value so loadVoiceURI returns null", () => {
    saveVoiceURI("Google Deutsch");
    clearVoiceURI();
    expect(loadVoiceURI()).toBeNull();
  });

  it("does not throw when localStorage access fails", () => {
    localStorage.setItem(VOICE_URI_KEY, "");
    expect(() => loadVoiceURI()).not.toThrow();
  });
});
