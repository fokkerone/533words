/**
 * Selects the preferred German voice from a list of available voices, in
 * order: a voice named "Google Deutsch" (the default, when present — a
 * higher-quality cloud voice on Chrome); otherwise a "de-DE" voice;
 * otherwise any other "de-*" voice. Returns undefined when no German voice
 * is present, so callers fall back to the browser's own default voice.
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
  const googleVoice = germanVoices.find(
    (voice) => voice.name.toLowerCase() === "google deutsch",
  );
  if (googleVoice) {
    return googleVoice;
  }
  const exactMatch = germanVoices.find(
    (voice) => voice.lang.toLowerCase() === "de-de",
  );
  return exactMatch ?? germanVoices[0];
}

/**
 * Returns every German-language voice (`lang` starting with "de") available
 * on the device, in the order the browser reports them. Empty array when
 * the Speech Synthesis API is unavailable or no German voices are present.
 * Callers that need to react to the voice list loading asynchronously
 * (e.g. to populate a selection dropdown) should listen for the
 * `speechSynthesis`'s `voiceschanged` event themselves and re-call this.
 */
export function listGermanVoices(): SpeechSynthesisVoice[] {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return [];
    }
    const synth = window.speechSynthesis;
    const voices =
      typeof synth.getVoices === "function" ? synth.getVoices() : [];
    return (voices ?? []).filter((voice) =>
      voice.lang.toLowerCase().startsWith("de"),
    );
  } catch {
    return [];
  }
}

/** How often `onTick` fires while an utterance is speaking, in milliseconds. */
const TICK_INTERVAL_MS = 100;

export type SpeakCallbacks = {
  /**
   * Fired once per spoken word (the browser's `boundary` event, filtered to
   * `name === "word"` — sentence/other boundary kinds are ignored), with the
   * exact substring of `text` being spoken at that moment. Best-effort only:
   * confirmed via manual testing that some real voices — notably Chrome's
   * "Google Deutsch", the voice this app prefers by default — never fire a
   * single `boundary` event for an entire utterance, because network/cloud
   * TTS voices generally don't return word-timing metadata to the browser.
   * Prefer `onTick` for anything that must animate consistently across
   * voices; use this only as an optional, best-effort refinement.
   */
  onBoundary?: (word: string) => void;
  /**
   * Fired on a fixed interval for the entire duration of the utterance —
   * from the moment it actually starts (the `start` event) until it ends,
   * errors, or is cancelled. Unlike `onBoundary`, this is driven purely by
   * a timer, so it fires reliably regardless of whether the current voice
   * reports word boundaries at all. This is the intended driver for a
   * continuous "is speaking" visualization (e.g. the equalizer in
   * `src/lib/speech-equalizer.ts`) that must work for every voice.
   */
  onTick?: () => void;
  /**
   * Fired when the utterance finishes, is cancelled, or errors — callers
   * that started some visual "is speaking" state (e.g. the equalizer) must
   * reset it here so it can never get stuck mid-animation if speech fails.
   * Also where the `onTick` interval (if any) is torn down.
   */
  onEnd?: () => void;
};

/**
 * Speaks the given text aloud using the browser's Speech Synthesis API, if
 * available. Safe no-op when the API is unavailable or unusable on the
 * current device, so callers never need to guard against it throwing.
 *
 * Voice selection: if `voiceURI` is given and matches a currently available
 * voice, that exact voice is used (the learner's manual choice). Otherwise
 * — no `voiceURI`, or it names a voice no longer available on this device —
 * falls back to automatic selection (preferring "Google Deutsch", then
 * de-DE, then any de-* voice, then the browser's own default). Applies the
 * given playback rate, and cancels any in-progress speech first so
 * playback never overlaps or queues.
 *
 * Voice selection re-reads `getVoices()` fresh on every call rather than
 * caching it, which is what actually handles browsers (e.g. Chrome) that
 * populate the voice list asynchronously after startup — no `voiceschanged`
 * listener is needed here, since the next `speak()` call simply sees the
 * now-populated list.
 *
 * `callbacks` is optional and purely additive (backward compatible with
 * every existing call site) — see `SpeakCallbacks` for what each one is
 * for. `onboundary`/`onend`/`onerror` support and exact word-boundary
 * granularity vary by browser/voice; a caller relying on `onBoundary` for
 * anything beyond a decorative visual should degrade gracefully if it never
 * fires.
 */
export function speak(
  text: string,
  rate: number,
  voiceURI?: string | null,
  callbacks?: SpeakCallbacks,
): void {
  try {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;

    const voices =
      typeof synth.getVoices === "function" ? synth.getVoices() : [];
    const requestedVoice = voiceURI
      ? (voices ?? []).find((voice) => voice.voiceURI === voiceURI)
      : undefined;
    const voice = requestedVoice ?? selectGermanVoice(voices ?? []);
    if (voice) {
      utterance.voice = voice;
    }

    if (callbacks?.onBoundary) {
      utterance.onboundary = (event) => {
        if (event.name !== "word") {
          return;
        }
        const word = text.slice(
          event.charIndex,
          event.charIndex + (event.charLength ?? 0),
        );
        callbacks.onBoundary?.(word);
      };
    }

    let tickIntervalId: ReturnType<typeof setInterval> | undefined;
    const stopTicking = () => {
      if (tickIntervalId !== undefined) {
        clearInterval(tickIntervalId);
        tickIntervalId = undefined;
      }
    };
    if (callbacks?.onTick) {
      utterance.onstart = () => {
        tickIntervalId = setInterval(
          () => callbacks.onTick?.(),
          TICK_INTERVAL_MS,
        );
      };
    }
    if (callbacks?.onEnd || callbacks?.onTick) {
      utterance.onend = () => {
        stopTicking();
        callbacks.onEnd?.();
      };
      utterance.onerror = () => {
        stopTicking();
        callbacks.onEnd?.();
      };
    }

    synth.cancel();
    synth.speak(utterance);
  } catch {
    // Speech is a nice-to-have. Any failure here (missing API, permission
    // issues, device quirks) must never interrupt the rest of the flow.
  }
}
