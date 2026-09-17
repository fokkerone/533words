const VALID_THEMES = ["light", "dark"] as const;
const DEFAULT_THEME: Theme = "light";

export type Theme = "light" | "dark";

function storageKey(userId: string): string {
  return `533words:${userId}:theme`;
}

export function saveTheme(userId: string, theme: Theme): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(theme));
  } catch {
    // Saving is best-effort: a failed save must not throw.
  }
}

export function loadTheme(userId: string): Theme {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw === null) {
      return DEFAULT_THEME;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "string") {
      return DEFAULT_THEME;
    }
    if (!VALID_THEMES.includes(parsed as Theme)) {
      return DEFAULT_THEME;
    }
    return parsed as Theme;
  } catch {
    return DEFAULT_THEME;
  }
}
