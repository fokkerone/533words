const VOICE_URI_KEY = "533words:voice-uri";

export function saveVoiceURI(voiceURI: string): void {
  try {
    localStorage.setItem(VOICE_URI_KEY, voiceURI);
  } catch {
    // Saving is best-effort; a failed save must not throw.
  }
}

export function loadVoiceURI(): string | null {
  try {
    const raw = localStorage.getItem(VOICE_URI_KEY);
    return raw === null || raw === "" ? null : raw;
  } catch {
    return null;
  }
}

export function clearVoiceURI(): void {
  try {
    localStorage.removeItem(VOICE_URI_KEY);
  } catch {
    // Best-effort; nothing to roll back.
  }
}
