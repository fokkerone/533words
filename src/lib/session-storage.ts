/**
 * Generic JSON-serializable persistence utility for saving/restoring
 * in-progress session state to `localStorage`.
 *
 * Deliberately not coupled to any particular session shape (e.g. the
 * `SessionState` type in `session.ts`) — callers supply the type via the
 * generic parameter, e.g. `saveSession<SessionState>(state)`.
 */

function storageKey(userId: string): string {
  return `533words:${userId}:session`;
}

export function saveSession<T>(userId: string, state: T): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Saving is best-effort: a failed save must not throw, and must not
    // roll back any state change that already succeeded elsewhere.
  }
}

export function loadSession<T>(userId: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
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

export function clearSession(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Best-effort; nothing to roll back.
  }
}
