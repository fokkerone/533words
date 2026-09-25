# Grill Session: Star Progress Display

Date: 2026-09-25
Spec reviewed: superspec/specs/star-progress-display/spec.md

## Pre-flight

### Wiki conflicts
None. The spec reuses existing data (`useUserStars`, `SessionState.total`/`flagOrder`) and follows the established German-UI text convention ([[patterns/german-ui-text]]) without introducing new patterns.

### Techstack conflicts
None. No new libraries, no new network requests, no schema changes — pure client-side display logic on top of already-fetched data, consistent with [[techstack/profile]].

### Internal contradictions
None found in the original draft, though the interview surfaced several unstated edge cases (see below).

## Questions & Resolutions

### Q1: How should the star badge behave when the learner's total score is negative (more incorrect than correct flags overall)?
**Recommended:** Show the negative value directly (e.g. "-5.3") — honest reflection of the actual score, no special-casing needed.
**Resolved:** Confirmed — negative values are shown as-is. Verified via code inspection that `adjustScore` in `src/lib/words.ts` has no floor, so a negative `SUM(score)` is a real, reachable state, not a hypothetical.
**Impact:** Spec change required — add an explicit scenario for a negative star total to the "Header Star Badge Shows a Rescaled Value" requirement.

### Q2: How should the new "Du benötigst noch X Sterne" message avoid overflowing/wrapping awkwardly in the header on mobile viewports?
**Recommended (initial):** Add `flex-wrap` to the star-badge header group so the message wraps to a second line on narrow viewports.
**Resolved (revised mid-interview by direct user instruction):** The goal-distance/goal-reached message is hidden entirely below the `tablet` breakpoint (48rem/768px) via `hidden tablet:inline-flex`, and only shown at `tablet` width and above. The star badge itself (⭐ value) remains visible at all viewport widths — only the message text is breakpoint-gated.
**Impact:** Spec change required — add a Non-Functional Requirement / scenario for mobile visibility of the goal-distance message, distinct from the star badge's own always-visible behavior.

### Q3: Should the goal-distance message show a value while the star total is still loading (fallback 0)?
**Recommended:** Show it using the same 0-fallback the star badge itself already uses, for consistency.
**Resolved:** Rejected — the message SHALL NOT be shown until the real star total has finished loading successfully. During `starsLoading`, the message is hidden (not shown with a "533.0" placeholder).
**Impact:** Spec change required — new scenario + Error Behavior statement.

### Q4: Should the goal-distance message show once the real star total fails to load (`starsError`)?
**Recommended:** Hide permanently, consistent with Q3's resolution — no value was ever successfully loaded, so nothing should be shown.
**Resolved:** Confirmed — hidden permanently on error, same as the loading state. The star badge continues to show its own existing 0.0 fallback in this case, unaffected.
**Impact:** Spec change required — new scenario + Error Behavior statement.

### Q5: Should the session-progress indicator ("X / Y") be announced via `aria-live` on every word change?
**Recommended:** No — avoid interrupting screen-reader users on every advance; plain text + `aria-label` is sufficient and consistent with the rest of the header (the star badge has no `aria-live` either).
**Resolved:** Confirmed — no `aria-live`. Static text with a translated `aria-label`.
**Impact:** No spec change required (already the spec's original intent, now explicitly confirmed rather than assumed).

### Q6 (self-resolved via code inspection, not asked): What session size should test scenarios use to produce a session total of exactly 16 (per the spec's own worked example) given the app's actual default session size is 24, not 16?
**Investigation:** `createSessionState(words, sessionSize)` sets `total = pool.length = min(words.length, sessionSize)` (confirmed in `src/lib/session.ts`). The default session size (`session-size-settings.ts`) is 24. So a test using `makeWords(16)` naturally produces `session.total === 16` regardless of the configured session size, since the pool can never exceed the available word count.
**Resolution:** No question needed — `tasks.md` is updated to instruct the executing subagent to use `makeWords(16)` (or any word count matching the scenario) rather than attempting to configure a session size of 16 directly.
**Impact:** `tasks.md` change only, no `spec.md` change (this is an implementation/test-construction detail, not a behavioral requirement).

## Spec Changes Required

- Requirement "Header Star Badge Shows a Rescaled Value": add a scenario for a negative star total.
- Requirement "Header Shows Distance to the 533 Goal": add a Non-Functional Requirement stating the message is hidden below the `tablet` breakpoint, and add scenarios for (a) hidden while stars are loading, (b) hidden on a stars-loading error.
- Error Behavior: add explicit SHALL NOT statements for the loading/error-hiding behavior of the goal-distance message.
- Glossary: no changes needed.

## Deferred Questions

None — all branches surfaced during the interview were resolved directly, not deferred.

## Verdict

**READY** — All decision branches resolved. Proceed to `/pick-spec`.
