# Grill Session: Flashcard Session (Word Setup + Practice Flow)

Date: 2026-09-16
Spec reviewed: superspec/specs/flashcard-session/spec.md

## Pre-flight

### Wiki conflicts
None.

### Techstack conflicts
None outright, but the techstack profile's production checklist flags a concurrent-write concern (multiple tabs) that the spec didn't originally address — resolved in Q1 by explicitly scoping it out.

### Internal contradictions
One found — "Session Start" implied silent discard of an in-progress session with no confirmation step mentioned elsewhere, while "Session Persistence" implies restoring is the default expectation. Resolved in Q2 by making the silent-discard behavior explicit.

## Questions & Resolutions

### Q1: Does the spec need to guard against concurrent score-update races (two tabs open)?
**Recommended:** No guard needed, explicitly out of scope — single learner, single device/tab assumed.
**Resolved:** Agreed. Added to Out of Scope.
**Impact:** Spec change — Out of Scope bullet added.

### Q2: Should starting a new session while one is in progress require confirmation before discarding remaining words?
**Recommended:** Silent discard, no confirmation — low-stakes action, already-flagged scores are unaffected.
**Resolved:** Agreed.
**Impact:** Spec change — scenario updated to state discard is unconfirmed and prior scores are unaffected.

### Q3: What happens when a score write to Turso fails?
**Recommended:** Flag action fails visibly; word stays unflagged rather than silently losing the write.
**Resolved:** Agreed, with a specific UI requirement: use a shadcn `Alert` component to show the error.
**Impact:** Spec change — new "Score write fails" scenario added; tasks.md Task 3.1 updated to specify the `Alert` component.

### Q4: Does this spec need to define per-environment DB selection (prod vs. preview)?
**Recommended:** Out of scope — deployment/config concern, already tracked in the techstack profile.
**Resolved:** Agreed — same DB used for all environments for now.
**Impact:** Spec change — Out of Scope bullet added noting the same-DB decision.

### Q5: Does an empty word bank need an explicit scenario?
**Recommended:** Yes — add a scenario so app load with zero seeded words shows a message instead of a broken/empty session.
**Resolved:** Agreed.
**Impact:** Spec change — new "Starting a session with an empty word bank" scenario added.

### Q6: Is the reveal action distinct from "Next Word," per DISCUSS.md's flow?
**Recommended:** Yes, already correct in the spec as written.
**Resolved:** Confirmed; added implementation detail (Tailwind fade-in transition) to tasks.md, not spec.md, since it's a UI implementation choice.
**Impact:** tasks.md change only (Task 3.1); no spec.md change.

### Q7: Should completed session data be proactively cleared from localStorage?
**Recommended:** No — leave it until the next "New Session" overwrites it.
**Resolved:** Agreed.
**Impact:** Spec change — explicit SHALL NOT clause added to Session Completion requirement.

### Q8: Can Wave 1 tests run without a real Turso instance?
**Recommended:** Use a Node-only libSQL client against a local file/`:memory:` DB in tests.
**Resolved:** Changed — use a lightweight fake DB client (plain object matching the `execute()` interface) instead, after discussing MSW as an alternative and rejecting it (SQL-over-HTTP wire protocol is too complex to mock reliably vs. a simple fake).
**Impact:** tasks.md change — Task 1.1 and 1.2 test requirements rewritten to specify the fake DB client approach.

### Q9: Should the hook-level DB-call/error-surfacing logic be tested in Task 2.2 or deferred to Task 3.1's component test?
**Recommended:** Test it in Task 2.2, in isolation, using the fake DB client; Task 3.1 only verifies the UI reacts to hook state.
**Resolved:** Agreed.
**Impact:** tasks.md change — Task 2.2 and 3.1 test requirements updated to divide responsibility.

### Q10: Does every Error Behavior bullet have a matching scenario?
**Recommended:** No — two gaps found: flagging a non-current word, and speech-unavailable not blocking the flow.
**Resolved:** Agreed, both added.
**Impact:** Spec change — two new scenarios added ("Flagging a word that is not the current word", "Speech synthesis unavailable").

### Q11: Does the "session-state save fails after a successful score write" Error Behavior bullet have a matching scenario?
**Recommended:** Add one — score change stands, word stays flagged in-memory for the rest of the session, a future reload may not recover that specific local flag record (accepted limitation).
**Resolved:** Agreed.
**Impact:** Spec change — new scenario added under Session Persistence.

### Q12: Given the fake-DB-client approach, does anything besides Task 3.2 (manual verification) actually block on the CSV file and live Turso credentials?
**Recommended:** No — confirm explicitly in tasks.md that Waves 1–3 implementation and tests are unblocked; only the manual walkthrough needs real credentials + CSV.
**Resolved:** Agreed. User is also now providing a Turso API key/URL directly into `.env.local` via a shell command (kept out of the chat transcript for secret hygiene).
**Impact:** tasks.md change — Prerequisites section rewritten to clarify blocking scope.

## Spec Changes Required

All changes below were applied directly to spec.md during the grill session:
- Out of Scope: added concurrent-write guarding exclusion (Q1)
- Out of Scope: added same-DB-across-environments decision (Q4)
- Session Start: "Starting a new session while one is in progress" scenario clarified (no confirmation, prior scores unaffected) (Q2)
- Session Start: new "Starting a session with an empty word bank" scenario added (Q5)
- Flagging a Word: new "Score write fails" scenario added, specifying shadcn `Alert` (Q3)
- Flagging a Word: new "Flagging a word that is not the current word" scenario added (Q10)
- Word Presentation: new "Speech synthesis unavailable" scenario added (Q10)
- Session Completion: explicit SHALL NOT clause added for proactive localStorage clearing (Q7)
- Session Persistence: new "Local session-state save fails after a successful score write" scenario added (Q11)

tasks.md changes:
- Task 1.1, 1.2: test requirements rewritten to use a fake DB client instead of a local/in-memory real libSQL instance (Q8)
- Task 2.2: test requirement extended to cover `useFlagWord()` success/error behavior in isolation (Q9)
- Task 3.1: test requirement updated to only verify UI reaction to hook state, plus fade-in transition and `Alert` component noted (Q6, Q3, Q9)
- Prerequisites: rewritten to clarify only Task 3.2 is blocked by real credentials/CSV (Q12)

## Deferred Questions

None — all raised branches were resolved during this session.

## Verdict

**READY** — All decision branches resolved. Proceed to `/superspecs:pick-spec flashcard-session`.
