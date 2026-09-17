function storageKey(userId: string): string {
  return `533words:${userId}:voice-uri`;
}

export function saveVoiceURI(userId: string, voiceURI: string): void {
  try {
    localStorage.setItem(storageKey(userId), voiceURI);
  } catch {
    // Saving is best-effort; a failed save must not throw.
  }
}

export function loadVoiceURI(userId: string): string | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw === null || raw === "" ? null : raw;
  } catch {
    return null;
  }
}

export function clearVoiceURI(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Best-effort; nothing to roll back.
  }
}
