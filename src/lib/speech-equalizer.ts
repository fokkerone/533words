/**
 * The number of anchor points the fake equalizer blob visualizes. Matches
 * the SVG blob path rendered by `SpeechEqualizer` (see
 * `src/components/speech-equalizer.tsx`) — one radius value per anchor
 * around the circle.
 */
const DEFAULT_ANCHOR_COUNT = 28;

/** How many independent "peaks" get smoothly interpolated across all anchors. */
const CONTROL_POINT_COUNT = 124;

/**
 * Floor and ceiling of the randomized "intensity" range (before the word-
 * length bias below), out of a max of 255. A pure `word.length * k` formula
 * makes short words (most German nouns/verbs in this word bank are only a
 * few letters) produce values so low the blob barely deviates from its
 * resting radius — nearly imperceptible. Keeping the random range itself
 * solidly mid-to-high, with only a modest length-based nudge on top,
 * guarantees a clearly visible wobble for every word, not just long ones.
 */
const MIN_INTENSITY = 0;
const MAX_INTENSITY = 420;
/** Cap on how much a longer word can additionally nudge the intensity up. */
const MAX_LENGTH_BIAS = 360;

/** All anchors at rest (nothing being spoken). */
export function restingFrequencies(
  anchorCount: number = DEFAULT_ANCHOR_COUNT,
): number[] {
  return Array(anchorCount).fill(0);
}

export const RESTING_FREQUENCIES: number[] = restingFrequencies();

/** Smoothstep interpolation (eases in/out at each control point, rather than linear). */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * The Web Speech API exposes no real audio data to visualize (see
 * `[[auth/better-auth-setup]]`-adjacent gotcha notes -- speechSynthesis is a
 * black-box TTS engine with no AnalyserNode access, and even the `boundary`
 * event most voices are expected to support is unreliable -- confirmed via
 * manual testing that Chrome's "Google Deutsch" voice never fires it at
 * all). This generates plausible-looking fake "frequency" values (0-255 per
 * anchor, like a real Web Audio AnalyserNode's byte frequency data) for a
 * blob-shaped equalizer, called repeatedly on a timer (`speak()`'s `onTick`
 * callback) rather than per word-boundary -- purely decorative, not a real
 * spectrum analysis.
 *
 * A handful of independent "control" peaks (derived from the word's length,
 * for a loose correlation to what's being said) are smoothly interpolated
 * across every anchor, rather than generating each anchor independently --
 * independent per-anchor noise produces a jagged, spiky shape; interpolating
 * between fewer control points produces an organic, wobbling blob outline.
 */
export function generateFakeFrequencies(
  word: string,
  anchorCount: number = DEFAULT_ANCHOR_COUNT,
): number[] {
  const lengthBias = Math.min(MAX_LENGTH_BIAS, word.length * 4);
  const controls = Array.from({ length: CONTROL_POINT_COUNT }, () => {
    const value =
      MIN_INTENSITY +
      lengthBias +
      Math.random() * (MAX_INTENSITY - MIN_INTENSITY);
    return Math.min(255, Math.max(0, value));
  });

  return Array.from({ length: anchorCount }, (_, i) => {
    const t = (i / anchorCount) * CONTROL_POINT_COUNT;
    const i0 = Math.floor(t) % CONTROL_POINT_COUNT;
    const i1 = (i0 + 1) % CONTROL_POINT_COUNT;
    const frac = smoothstep(t - Math.floor(t));
    return controls[i0] * (1 - frac) + controls[i1] * frac;
  });
}
