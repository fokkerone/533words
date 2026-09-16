# Implementation Tasks: Speech Controls (German Voice, Play Button, Speed)

## Context Window Budget
Estimated spec + task tokens: ~6k / 200k ✅

## Wave 1 — Foundation
Tasks that must complete before Wave 2 can start.

### Task 1.1: German voice selection, rate, and overlap prevention in speech.ts
**What:** Change `src/lib/speech.ts`'s `speak` function signature to `speak(text: string, rate: number)` — `rate` is a required second parameter, not optional with a default, since after this feature ships there is always a configured rate (default 1.0) and a required parameter prevents a future caller from silently forgetting it. This is a breaking signature change; the existing single production call site (`handleNextWord` in `src/app/page.tsx`) and the 3 existing tests in `speech.test.ts` currently call `speak(text)` only — Task 1.1 updates `speech.test.ts`'s calls to pass a rate (e.g. `1.0`) so Wave 1 stays green in isolation; Task 2.1 (Wave 2) updates the real call site in `page.tsx` to pass the configured rate from the new speed control. Select a German voice (`lang` starting with `de`, preferring `de-DE` if multiple) from `window.speechSynthesis.getVoices()`, falling back to the default voice silently if none is found. Handle the case where `getVoices()` returns an empty list synchronously by listening for the `voiceschanged` event and re-selecting once voices load. Before starting new playback, cancel any in-progress speech (`window.speechSynthesis.cancel()`) so playback never overlaps or queues. Preserve the existing no-throw guarantee (try/catch around all Web Speech API interaction).
**Files to create/modify:** `src/lib/speech.ts`, `src/lib/speech.test.ts` (extend existing tests)
**Test requirement:** Tests for: a German voice is selected when present in a mocked voice list (preferring `de-DE` over other `de-*` voices); the default/first voice is used when no German voice is present (no throw, no error); `speechSynthesis.cancel()` is called before `speak()` on the utterance; the configured `rate` is applied to the created `SpeechSynthesisUtterance`; calling `speak` before `voiceschanged` has fired still eventually selects the correct voice once it does (simulate firing the event in the test).
**Done when:** All tests pass, no regressions to the existing 3 speech.ts tests. Note: `npm run build` is expected to fail after this task alone (the existing `page.tsx` call site won't compile against the new required `rate` parameter) — that's fixed by Task 2.1, not required here. Task 1.1's Done criteria is test-level, not full-build-level; the feature's overall Done Criteria (full build green) only applies once Wave 2 completes.

### Task 1.2: Speed persistence
**What:** A small module for getting/saving the learner's configured playback speed, clamped to the 0.5–1.5 range, defaulting to 1.0 when nothing is stored. Follows the existing no-throw-on-storage-failure pattern established in `src/lib/session-storage.ts`, but as its own dedicated key/module (not reusing `session-storage.ts`'s fixed session key).
**Files to create/modify:** `src/lib/speech-settings.ts` (new)
**Test requirement:** Tests for: save-then-load round-trips a value; loading with nothing stored returns the 1.0 default; a value outside 0.5–1.5 is clamped to the nearest bound on both save AND load (clamp in both places — defense in depth against a bad value getting into storage some other way); loading corrupt/invalid (non-numeric) stored data returns the 1.0 default instead of throwing.
**Done when:** Test passes, no regressions.

## Wave 2 — Integration
Depends on both Wave 1 tasks.

### Task 2.1: Play control and speed slider wired into the practice screen
**What:** Add a Play button and a speed slider (0.5x–1.5x) to `src/app/page.tsx`. The Play button speaks the current word aloud (using the Task 1.1 `speak` function with the currently configured rate) and is disabled/inert both when there is no current word (before the first pick, or once a session is complete) AND once the current word has been revealed (`page.tsx` already tracks a local `revealed` boolean — reuse it, don't add a second flag). Per the grilled spec: Play is only available pre-reveal, matching the existing auto-play-before-reveal flow. The speed slider's displayed value is initialized from `speech-settings.ts`'s stored value (or the 1.0 default) on mount, and every change both updates the rate used for subsequent playback and persists it via `speech-settings.ts`. The existing automatic read-aloud on word selection (`handleNextWord`) must also use the currently configured rate/voice logic — i.e. both automatic and manual playback go through the same Task 1.1 `speak` call with the same rate.
**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx` (extend existing tests). Add a shadcn `Slider` component if not already present (`npx shadcn@latest add slider`).
**Test requirement:** Component tests (Testing Library) verifying: the Play button is disabled when no word is current, calls the speech module when a word is current and not yet revealed, and becomes disabled again once the word is revealed; changing the speed slider persists the new value (verify via `speech-settings.ts`'s load function after the change) and the next playback call receives that rate; on mount, a previously persisted speed is reflected in the slider's initial value. Mock `src/lib/speech.ts`'s `speak` (as the existing test file already does) rather than the real Web Speech API.
**Done when:** Test passes, no regressions, `npm run build` succeeds.

## Done Criteria
The feature is DONE when:
- [ ] All tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests
- [ ] `npm run lint` and `npm run build` succeed
