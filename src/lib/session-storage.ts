/**
 * Generic JSON-serializable persistence utility for saving/restoring
 * in-progress session state to `localStorage`.
 *
 * Deliberately not coupled to any particular session shape (e.g. the
 * `SessionState` type in `session.ts`) — callers supply the type via the
 * generic parameter, e.g. `saveSession<SessionState>(state)`.
 */

const SESSION_STORAGE_KEY = "533words:session";

export function saveSession<T>(state: T): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Saving is best-effort: a failed save must not throw, and must not
    // roll back any state change that already succeeded elsewhere.
  }
}

export function loadSession<T>(): T | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt data or an unavailable localStorage: treat as "nothing stored"
    // rather than throwing.
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Best-effort; nothing to roll back.
  }
}
