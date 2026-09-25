# Review Log: German UI (localize all remaining English chrome)

Populated during execution — one entry per task review.

## Wave 1

### Task 1.1: Translate the practice screen and its tests
**Stage 1 — Spec compliance:** PASS on every requirement. Independently re-verified the full practice-screen translation table via a targeted grep for all visible strings/aria-labels in `page.tsx` — everything is German, "Logout" and "533words" correctly left untouched. Error-message structure preserved exactly as required (only the fallback string literals translated, `AlertTitle` gets the German heading, `AlertDescription`'s raw `error.message`/`err.message` branch untouched) — satisfies "Error Messages Show a Translated Heading, With the Raw Detail Preserved" precisely.

**Play icon:** correctly imported from `lucide-react` matching the codebase's existing `ChevronDownIcon` convention, `fill="currentColor"` for a solid triangle, sized proportionally across breakpoints, `aria-label="Abspielen"` added to the now-textless button. The new dedicated test (icon-only, no visible "Play" text, correct aria-label) is exactly the right kind of test for this one genuinely-new-behavior change, distinct from the pure string-swap tests elsewhere.

**Confirmed the out-of-scope item was respected:** the duplicate `<SpeechEqualizer amplitudes={amplitude} />` rendering (a pre-existing, unrelated leftover from the speech-equalizer feature) is still exactly duplicated, untouched — verified directly by reading the relevant lines myself, not just trusting the subagent's claim.

**Stage 2 — Code quality:** PASS. ~35 `getByRole("button", { name: /^play$/i })` call sites updated to `/^abspielen$/i` — a large, mechanical but correctly-executed diff. Good judgment tightening several previously-loose dual-language regexes (e.g. `/theme|dark|light|dunkel|hell/i` → the actual new aria-label pattern) rather than leaving permissive matchers that would have silently tolerated a partial translation.

**Verdict:** ✅ Approved, no findings. Independently re-verified: grepped `page.tsx` for leftover English myself (none found beyond the two exceptions), read the duplicate-SpeechEqualizer lines directly, ran the full suite/lint/build myself (186/186, clean, clean).

## Wave 2

### Task 2.1: Translate the login/register pages and their tests
_Pending_
