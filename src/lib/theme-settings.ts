const THEME_KEY = "533words:theme";
const VALID_THEMES = ["light", "dark"] as const;
const DEFAULT_THEME: Theme = "light";

export type Theme = "light" | "dark";

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    // Saving is best-effort: a failed save must not throw.
  }
}

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
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
