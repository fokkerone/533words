/**
 * Selects the preferred German voice from a list of available voices:
 * the first voice whose `lang` starts with "de", preferring an exact
 * "de-DE" match when more than one German voice is available. Returns
 * undefined when no German voice is present, so callers fall back to the
 * browser's own default voice.
 */
function selectGermanVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  const germanVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("de"),
  );
  if (germanVoices.length === 0) {
    return undefined;
  }
  const exactMatch = germanVoices.find(
    (voice) => voice.lang.toLowerCase() === "de-de",
  );
  return exactMatch ?? germanVoices[0];
}

let voicesChangedListenerAttached = false;

/**
 * Ensures a `voiceschanged` listener is attached (once) so that voice
 * selection is re-evaluated once the browser finishes loading its voice
 * list asynchronously. Safe to call repeatedly.
 */
function ensureVoicesChangedListener(): void {
  if (voicesChangedListenerAttached) {
    return;
  }
  try {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof window.speechSynthesis.addEventListener !== "function"
    ) {
      return;
    }
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      // No-op: voice selection is re-run on every speak() call, so simply
      // having fired this event is enough for subsequent calls to pick up
      // the now-populated voice list. This listener's presence is what
      // matters for browsers that require one to be registered.
    });
    voicesChangedListenerAttached = true;
  } catch {
    // Ignore — voice selection will just retry on the next speak() call.
  }
}

/**
 * Speaks the given text aloud using the browser's Speech Synthesis API, if
 * available. Safe no-op when the API is unavailable or unusable on the
 * current device, so callers never need to guard against it throwing.
 *
 * Selects a German voice when one is available (preferring de-DE), applies
 * the given playback rate, and cancels any in-progress speech first so
 * playback never overlaps or queues.
 */
export function speak(text: string, rate: number): void {
  try {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    ensureVoicesChangedListener();

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;

    const voices =
      typeof synth.getVoices === "function" ? synth.getVoices() : [];
    const germanVoice = selectGermanVoice(voices ?? []);
    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    synth.cancel();
    synth.speak(utterance);
  } catch {
    // Speech is a nice-to-have. Any failure here (missing API, permission
    // issues, device quirks) must never interrupt the rest of the flow.
  }
}
