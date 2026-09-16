# Grill Session: Speech Controls (German Voice, Play Button, Speed)

Date: 2026-09-16
Spec reviewed: superspec/specs/speech-controls/spec.md

## Pre-flight

### Wiki conflicts
None. Consistent with [[ui/session-state-pattern]]'s documented `speak()` call site in `handleNextWord`.

### Techstack conflicts
None. Stays within the Web Speech API per [[techstack/profile]]; adds a shadcn `Slider` component, consistent with existing shadcn/ui usage (confirmed via codebase inspection that it isn't installed yet — tasks.md already accounts for adding it).

### Internal contradictions
One gap found (not a contradiction): tasks.md didn't flag that changing `speak`'s signature to a required `rate` parameter would transiently break `npm run build` between Task 1.1 and Task 2.1 landing. Resolved in Q1b.

## Questions & Resolutions

### Q1: Should `speak`'s new rate parameter be required or optional-with-default?
**Recommended:** Required — a required parameter prevents a future caller from silently forgetting it now that "no configured rate" isn't a meaningful state.
**Resolved:** Agreed, required.
**Impact:** tasks.md change — Task 1.1 specifies the exact signature and clarifies Task 1.1 updates its own tests, Task 2.1 updates the real `page.tsx` call site.

### Q1b: Is a transiently red `npm run build` between Task 1.1 and Task 2.1 acceptable?
**Recommended:** Yes — Task 1.1's Done criteria is test-level, not full-build-level; full build only needs to be green once Wave 2 completes, matching how flashcard-session's own Wave 2 worked.
**Resolved:** Agreed.
**Impact:** tasks.md change — Task 1.1's Done criteria now explicitly notes the expected transient build break and why it's acceptable.

### Q2: Should the 0.5–1.5 speed clamp happen on save, on load, or both?
**Recommended:** Both — clamping on save prevents ever writing an invalid value; clamping on load is cheap defense-in-depth.
**Resolved:** Agreed, both.
**Impact:** tasks.md change — Task 1.2's test requirement now specifies clamping in both places.

### Q3: Should the Play control be available before reveal, after reveal, or both — the existing auto-play already speaks the word pre-reveal, so I assumed Play should also work pre-reveal.
**Recommended (wrong guess):** Available regardless of reveal state.
**Resolved:** Corrected by the user — Play is available ONLY while the word is hidden (pre-reveal); it becomes unavailable once revealed. A real, deliberate product decision, not an assumption to leave implicit.
**Impact:** Spec change (significant) — "Manual Replay" requirement rewritten to state the pre-reveal-only constraint; new scenario "Play control unavailable after reveal" added (later merged, see Q-dedupe); tasks.md Task 2.1 updated to reuse the existing `revealed` local state rather than adding a second flag, and its test requirement extended to cover the disabled-after-reveal case.

### Q4: Does "Overlapping Playback Prevention" still make sense now that Play only works pre-reveal?
**Recommended:** Yes, unchanged — a learner can still trigger overlap by pressing Play rapidly, or pressing it while auto-play from word-selection is still speaking, all within the pre-reveal window.
**Resolved:** Confirmed, no change.
**Impact:** None.

### Q-dedupe: "Play control unavailable after reveal" and "No word available to play" had near-identical THEN clauses — redundant?
**Recommended:** N/A (user-initiated cleanup, not a recommendation-driven question).
**Resolved:** Merged into a single "Play control unavailable" scenario covering both preconditions (no current word OR already revealed) with an OR'd GIVEN.
**Impact:** Spec change — two scenarios merged into one.

### Q5: Does Task 1.1 need a combined test exercising voice-selection + cancel-before-speak + rate together, or is testing each in isolation sufficient?
**Recommended:** Isolation is sufficient — the three mechanisms are orthogonal (no branching interaction between them), so separate tests give full coverage without combinatorial bloat.
**Resolved:** Agreed.
**Impact:** None — tasks.md's existing test list (separate tests per mechanism) stands as written.

## Spec Changes Required

All changes below were applied directly to spec.md during the grill session:
- Manual Replay (Play Control) requirement rewritten: Play is only available pre-reveal, unavailable once the word is revealed (Q3)
- Two "unavailable" scenarios merged into one with an OR'd precondition (Q-dedupe)

tasks.md changes:
- Task 1.1: exact `speak(text, rate)` signature specified; existing test-file call sites to be updated within Task 1.1; production call site deferred to Task 2.1; transient build-break noted as acceptable and expected (Q1, Q1b)
- Task 1.2: clamp-on-both-save-and-load specified (Q2)
- Task 2.1: Play button reuses the existing `revealed` local state; test requirement extended to cover disabled-after-reveal (Q3)

## Deferred Questions

None — all raised branches were resolved during this session.

## Verdict

**READY** — All decision branches resolved. Proceed to `/superspecs:pick-spec speech-controls`.
