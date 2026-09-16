/**
 * Speaks the given text aloud using the browser's Speech Synthesis API, if
 * available. Safe no-op when the API is unavailable or unusable on the
 * current device, so callers never need to guard against it throwing.
 */
export function speak(text: string): void {
  try {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech is a nice-to-have. Any failure here (missing API, permission
    // issues, device quirks) must never interrupt the rest of the flow.
  }
}
