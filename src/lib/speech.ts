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

/**
 * Speaks the given text aloud using the browser's Speech Synthesis API, if
 * available. Safe no-op when the API is unavailable or unusable on the
 * current device, so callers never need to guard against it throwing.
 *
 * Voice selection: if `voiceURI` is given and matches a currently available
 * voice, that exact voice is used (the learner's manual choice). Otherwise
 * — no `voiceURI`, or it names a voice no longer available on this device —
 * falls back to automatic selection (preferring de-DE, then any de-* voice,
 * then the browser's own default). Applies the given playback rate, and
 * cancels any in-progress speech first so playback never overlaps or
 * queues.
 *
 * Voice selection re-reads `getVoices()` fresh on every call rather than
 * caching it, which is what actually handles browsers (e.g. Chrome) that
 * populate the voice list asynchronously after startup — no `voiceschanged`
 * listener is needed here, since the next `speak()` call simply sees the
 * now-populated list.
 */
export function speak(
  text: string,
  rate: number,
  voiceURI?: string | null,
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

    synth.cancel();
    synth.speak(utterance);
  } catch {
    // Speech is a nice-to-have. Any failure here (missing API, permission
    // issues, device quirks) must never interrupt the rest of the flow.
  }
}
