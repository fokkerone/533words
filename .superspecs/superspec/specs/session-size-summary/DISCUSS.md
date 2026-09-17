# Discussion: Session Size Selector & Results Summary

Date: 2026-09-17
Participants: human + AI

## What We're Building

Two related additions to the practice screen. First, a dropdown lets the learner choose how many words a session draws (8, 16, 24, 32, or 64; default 24) — always visible, and choosing a value immediately starts a fresh session with that size, discarding any in-progress session without confirmation (matching the existing "New Session" button's behavior). Second, once a session is complete, a results table lists every word drawn into that session alongside how it was flagged (correct/incorrect), in the order the words were presented during the session.

## Goals
- A session size selector (8/16/24/32/64, default 24) always visible on the practice screen.
- Selecting a size immediately starts a new session of that size, discarding any in-progress session without confirmation.
- The chosen session size persists across reloads and future sessions (localStorage), following the same pattern as speed and voice settings.
- A results table appears once a session is complete, listing every word from that session with its correct/incorrect result, in presentation order.

## Non-Goals (explicitly out of scope)
- Editing/changing the size of an already-in-progress session without discarding it — changing the selector always starts fresh.
- Historical results across multiple past sessions — only the just-completed session's results are shown.
- Sorting/filtering the results table (e.g. toggle to show only incorrect words) — presentation order only, per the discussion.
- Exporting or sharing the results table.
- Changing what counts as a valid session size beyond the five fixed values (8/16/24/32/64) — no free-text/arbitrary count input.

## Constraints
- **Technical:** `src/lib/session.ts`'s `createSessionState`/`startSession` currently hardcode `SESSION_SIZE = 24` — this needs to become a parameter. `SessionState.flagged` is currently an unordered `Record<wordId, FlagValue>`, which doesn't preserve presentation order reliably as a matter of explicit contract — needs an explicit ordered structure (e.g. a `flagOrder: string[]` array alongside `flagged`, or restructuring `flagged` itself) to satisfy the "in the order words were presented" requirement without relying on incidental object-key-insertion-order behavior.
- **Technical:** the results table needs each flagged word's *text*, not just its ID — `SessionState` doesn't store this once a word leaves the pool. Resolve by looking up flagged word IDs against the already-fetched full word bank (`useWords()`'s data) in `page.tsx`, rather than changing what `SessionState` stores.
- **Scope:** session size persistence follows the existing `speech-settings.ts`/`voice-settings.ts` pattern (a small dedicated localStorage-backed module), not the generic `session-storage.ts` (which is for session *progress*, not this kind of learner preference).

## Key Decisions Made

### Decision: Size selector always visible, immediate discard on change
**We will:** show the size dropdown at all times (like the existing speed/voice controls), and changing it immediately starts a fresh session at the new size, discarding any in-progress session without a confirmation prompt.
**Because:** matches the existing "New Session" button's established no-confirmation behavior — consistent UX, and confirmed directly by the user.
**We won't:** hide the selector during an active session, or ask for confirmation before discarding.

### Decision: Session size persists like speed/voice
**We will:** persist the chosen session size to localStorage via a small dedicated settings module, defaulting to 24 when nothing is stored.
**Because:** confirmed by the user; consistent with the established pattern for learner preferences (as opposed to session *progress*, which uses the generic `session-storage.ts`).
**We won't:** reset to 24 on every reload, or store it as part of `SessionState`/session progress.

### Decision: Results table ordered by presentation order
**We will:** list the session's words in the order they were actually presented (picked) during the session, not alphabetically or grouped by correct/incorrect.
**Because:** confirmed directly by the user.
**We won't:** sort by correctness or alphabetically.

### Decision: Word text resolved via the word bank, not stored in SessionState
**We will:** look up each flagged word's text from `useWords()`'s already-fetched data in `page.tsx`, keyed by the word ID already present in `SessionState.flagged`.
**Because:** avoids duplicating word text into `SessionState` (which currently only needs IDs once a word is flagged) and avoids a `[[ui/session-state-pattern]]`-breaking change to what the pure state layer stores.
**We won't:** add a `text` field to flagged entries in `SessionState`, or fetch word text separately from Turso at session-completion time.

## Open Questions
- [ ] Exact internal representation for tracking flag order (e.g. `flagOrder: string[]` array added to `SessionState` alongside the existing `flagged` record, vs. restructuring `flagged` into an ordered array of `{wordId, value}` entries) — implementation detail for the spec/tasks, not a product decision.
- [ ] Exact visual layout of the results table (columns, styling) — functional presentation only, consistent with this project's established "no visual polish" stance; to be resolved during implementation, not specced in detail.

## Success Criteria
- [ ] A session size dropdown (8/16/24/32/64, default 24) is visible on the practice screen at all times.
- [ ] Changing the dropdown immediately starts a new session of the selected size, discarding any in-progress session.
- [ ] The selected session size is still in effect after a page reload.
- [ ] A word bank with fewer words than the selected size still works (uses every available word, per the existing "too few words" scenario from flashcard-session — this behavior is unchanged, just parameterized by the new size instead of the hardcoded 24).
- [ ] Once a session completes, a table lists every word drawn into that session with its correct/incorrect result, in the order presented.

## Risks
- **Breaking the existing hardcoded-24 test suite:** `src/lib/session.ts`'s tests currently assume `SESSION_SIZE = 24` implicitly via `createSessionState`/`startSession`'s current signatures. Making size a parameter is a signature change — mitigated by treating it the same way the earlier `speak(text, rate)` required-parameter change was handled (update call sites and tests together, no silent default).
- **Flag-order tracking interacting with existing double-flag/non-current-word no-op guarantees:** the new order-tracking structure must not weaken `flagWord`'s existing "no-op if not current or already flagged" guarantees — needs explicit scenario coverage in the spec, not just added incidentally.

## Wiki References
- [[ui/session-state-pattern]] — the `SessionState` shape and the hardcoded `SESSION_SIZE` this feature parameterizes; also documents the `flagWord` no-op guarantees that must be preserved
- [[patterns/web-speech-voice-selection]] — the sibling "required vs. optional, small dedicated settings module" pattern the session-size persistence follows
- [[data/word-bank-schema]] — confirms the word bank's `Word` shape (`id`, `text`, `score`) used for the results-table text lookup
