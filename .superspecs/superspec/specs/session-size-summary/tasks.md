# Implementation Tasks: Session Size Selector & Results Summary

## Context Window Budget
Estimated spec + task tokens: ~5k / 200k ✅

## Wave 1 — Foundation
Tasks that must complete before Wave 2 can start. Independent files, can run in parallel.

### Task 1.1: Parameterize session size and track flag order
**What:** Change `src/lib/session.ts`'s `startSession`/`createSessionState` to accept a session size parameter instead of the hardcoded `SESSION_SIZE = 24` constant — a required parameter (there's always a configured size, same reasoning as `speak()`'s required `rate`; no silent default inside `session.ts` itself, the caller always supplies one). Keep the "fewer words than requested" fallback behavior (use every available word) unchanged, just driven by the parameter instead of the constant.

Also add explicit tracking of the order words were flagged in, alongside the existing `flagged: Record<wordId, FlagValue>` — e.g. a parallel `flagOrder: string[]` array of word IDs, appended to only when `flagWord` actually applies a new flag (not on its existing no-op paths for a non-current or already-flagged word). Preserve every existing `flagWord`/`isSessionComplete` guarantee exactly — this is additive, not a behavior change to the existing logic.

**Files to create/modify:** `src/lib/session.ts`, `src/lib/session.test.ts` (update existing tests for the new required parameter; add new tests for order tracking)
**Test requirement:** Tests for: `createSessionState` with a given size draws up to that many unique words (parameterized version of the existing size tests — verify with at least two different sizes, e.g. 8 and 32, not just 24); the "fewer words than requested" fallback still works at a non-24 size; flagging words in a specific sequence results in `flagOrder` reflecting exactly that sequence; a no-op flag attempt (wrong word, or already-flagged) does not append to `flagOrder` or change existing entries; existing double-flag and non-current-word tests still pass with the new field present.
**Done when:** All tests pass, no regressions.

### Task 1.2: Session size persistence
**What:** A small module for getting/saving the learner's selected session size, following the exact pattern of `src/lib/speech-settings.ts` (not `session-storage.ts`, which is for session *progress*, not this kind of preference). Valid values are exactly `{8, 16, 24, 32, 64}`; loading falls back to the 24 default whenever the stored value is missing, corrupt/non-numeric, or not one of the five valid values — validation happens on load (mirrors how corrupt data is already handled), not by rejecting the save.
**Files to create/modify:** `src/lib/session-size-settings.ts` (new)
**Test requirement:** Tests for: save-then-load round-trips a valid value; loading with nothing stored returns the 24 default; loading a stored value NOT in `{8,16,24,32,64}` (e.g. directly written to `localStorage`, bypassing the save function) returns the 24 default instead of the invalid value; loading corrupt/non-numeric stored data returns the 24 default instead of throwing.
**Done when:** Test passes, no regressions.

## Wave 2 — Integration
Depends on both Wave 1 tasks. Single task (both pieces touch `page.tsx` together).

### Task 2.1: Size selector and results summary wired into the practice screen
**What:** Add a session size selector (shadcn `Select`, already installed — same component used for voice selection) to `src/app/page.tsx`, listing the five fixed sizes. Initialize its value from `session-size-settings.ts` (or the 24 default) on mount. Selecting a value calls `createSessionState(words, selectedSize)` immediately and persists the new size via `session-size-settings.ts`. Extend the existing `startNewSession` function to take the size as a parameter (`startNewSession(size)`) rather than duplicating its discard-and-restart logic in a separate handler — both the existing "New Session" button and the new size selector's change handler call this same function, each passing the currently selected size. The size used for the initial auto-start session (on app load, per the existing flashcard-session behavior) must also come from the persisted/default size, not a hardcoded 24.

Add a results summary: once `isSessionComplete(session)` is true, render a table/list showing every word ID in `session.flagOrder` (from Task 1.1), resolved to its text via the already-fetched `useWords()` data (match by `id`), alongside its `flagged[wordId]` result ("correct"/"incorrect"). Starting a new session (via the size selector or the existing "New Session" button) naturally clears this, since it replaces `session` entirely with a fresh `SessionState` that has no flagged words yet.

**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx` (extend existing tests)
**Test requirement:** Component tests (Testing Library) verifying: the size selector shows 24 as the initial default when nothing is persisted, and a persisted non-default value on mount otherwise; selecting a size discards an in-progress session (a word that was current/revealed is no longer shown) and the new session behaves as if created with that size; the persisted size is saved when changed (verify via the settings module's save function); after completing a small session (e.g. select size 8, or reuse the existing `makeWords(1)` pattern for a 1-word session), a results summary appears listing the word(s) and their correct/incorrect result in presentation order; starting a new session afterward removes the previous results summary from the screen.
**Done when:** Test passes, no regressions, `npm run build` succeeds.

## Done Criteria
The feature is DONE when:
- [ ] All tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests
- [ ] `npm run lint` and `npm run build` succeed
