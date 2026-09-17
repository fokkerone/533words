const SESSION_SIZE_KEY = "533words:session-size";
const VALID_SIZES = [8, 16, 24, 32, 64];
const DEFAULT_SIZE = 24;

export function saveSessionSize(size: number): void {
  try {
    localStorage.setItem(SESSION_SIZE_KEY, JSON.stringify(size));
  } catch {
    // Saving is best-effort: a failed save must not throw, and must not
    // roll back any state change that already succeeded elsewhere.
  }
}

export function loadSessionSize(): number {
  try {
    const raw = localStorage.getItem(SESSION_SIZE_KEY);
    if (raw === null) {
      return DEFAULT_SIZE;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "number" || Number.isNaN(parsed)) {
      return DEFAULT_SIZE;
    }
    if (!VALID_SIZES.includes(parsed)) {
      return DEFAULT_SIZE;
    }
    return parsed;
  } catch {
    return DEFAULT_SIZE;
  }
}
