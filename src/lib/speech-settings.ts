const SPEECH_SPEED_KEY = "533words:speech-speed";
const MIN_SPEED = 0.1;
const MAX_SPEED = 2.0;
const DEFAULT_SPEED = 1.0;

function clamp(speed: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}

export function saveSpeed(speed: number): void {
  try {
    localStorage.setItem(SPEECH_SPEED_KEY, JSON.stringify(clamp(speed)));
  } catch {
    // Saving is best-effort: a failed save must not throw, and must not
    // roll back any state change that already succeeded elsewhere.
  }
}

export function loadSpeed(): number {
  try {
    const raw = localStorage.getItem(SPEECH_SPEED_KEY);
    if (raw === null) {
      return DEFAULT_SPEED;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "number" || Number.isNaN(parsed)) {
      return DEFAULT_SPEED;
    }
    return clamp(parsed);
  } catch {
    return DEFAULT_SPEED;
  }
}
