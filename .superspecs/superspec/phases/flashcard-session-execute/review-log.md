# Review Log: Flashcard Session (Word Setup + Practice Flow)

Populated during execution — one entry per task review.

## Wave 1

### Task 1.1: Word bank schema
**Stage 1 — Spec compliance:** PASS. `initSchema` creates the `words` table (id/text/score) via idempotent `CREATE TABLE IF NOT EXISTS`; test verifies calling it twice doesn't throw and issues the idempotent statement each time. Minor note: the fake DB client records issued SQL statements rather than modeling actual table-existence state, so "exactly one table results" is verified indirectly (via the statement's idempotency) rather than directly — acceptable given the fake-client constraint from the grill session, not worth blocking on.

**Stage 2 — Code quality:** PASS. Clean, lint passes, no regressions (8/8 tests). One necessary deviation: `src/lib/db.ts`'s `db` export was changed from an eager `createClient(...)` call to a lazy, memoized `getDb()`, because the eager version threw `LibsqlError: URL_INVALID` at import time under Vitest (no env vars loaded). Verified no other file imported the old `db` export, so this was a safe, in-scope fix, not scope creep.

**Follow-up applied (orchestrator, not the subagent):** added `tsx` as a devDependency + `npm run migrate` script, since the subagent had relied on an ad-hoc `npx tsx` fetch. Committed separately (`10700ac`).

**Verdict:** ✅ Approved, no Critical findings.

### Task 1.2: Seed script
**Stage 1 — Spec compliance:** PASS. `seedWords(client, words)` does SELECT-then-INSERT-if-absent per word, exactly matching the "skip existing words by text" decision from DISCUSS.md/GRILL.md. Test directly matches the spec's literal example: seeding a 3-word list twice results in 3 rows, not 6. CLI wrapper correctly does not fabricate a CSV or hardcode word data — fails clearly if the file is missing, defaults to `scripts/data/words.csv`, one-word-per-line parsing per the DISCUSS.md CSV format decision.

**Stage 2 — Code quality:** PASS. Clean, lint passes, 11/11 tests (no regressions to Task 1.1's 8). Fake client in the test tracks real row state (a `Set<string>`) rather than just recording issued SQL, which is a stronger test than Task 1.1's — asserts on actual row counts as the spec's scenario literally describes. `main()` is correctly guarded from running on import (via `import.meta.url` check) so importing `seedWords` in tests triggers no real I/O or `getDb()` call. Noted, not blocking: the SELECT-then-INSERT pattern has a theoretical race under concurrent runs, but concurrent writes are explicitly Out of Scope in spec.md (Q1 from the grill).

**Verdict:** ✅ Approved, no Critical findings.

## Wave 2

### Task 2.1: Session pool logic
**Stage 1 — Spec compliance:** PASS. `SessionState`/`createSessionState`/`pickNextWord`/`flagWord`/`isSessionComplete` implement Session Start, Word Presentation, and Flagging exactly per spec: no-replacement pool draw, flagging a non-current word is a no-op, double-flagging is a no-op, completion requires empty pool + every drawn word flagged.

**Stage 2 — Code quality:** PASS after one fix. `pickNextWord`'s signature changed from `(Word[]) => Word|null` to `(SessionState) => SessionState` — a justified, in-scope redesign, not scope creep. Found in review: `applyScore` was left over from the original scaffold, duplicated `words.ts`'s `adjustScore`, and had zero callers once `flagWord` became a pure reducer that doesn't touch `Word.score`. Removed (orchestrator fix, see commit `b65b61b`).

**Verdict:** ✅ Approved (after cleanup), no Critical findings.

### Task 2.2: Word bank data access
**Stage 1 — Spec compliance:** PASS. `adjustScore` is the pure +1/-1 rule; `flagWord`(now `writeWordFlag`)/`fetchWords` do real DB reads/writes with no try/catch, so a rejected `execute()` propagates — exactly matching the "Score write fails" scenario's requirement to surface a distinguishable error rather than swallow it. `useFlagWord()`'s `isError`/`error` mutation state gives Task 3.1 what it needs to show the shadcn `Alert`.

**Stage 2 — Code quality:** PASS after one fix. Found in review: this file's `flagWord` had the same name as `session.ts`'s `flagWord` (different signature/purpose — DB write vs. pure state reducer), which would have forced Task 3.1 to alias-import one. Renamed to `writeWordFlag` (orchestrator fix, see commit `b65b61b`), updated its test file and `use-words.ts` accordingly.

**Verdict:** ✅ Approved (after cleanup), no Critical findings.

### Task 2.3: Speech synthesis utility
**Stage 1 — Spec compliance:** PASS. `speak()` matches the "Speech synthesis unavailable" scenario exactly — checks for `window`/`speechSynthesis`/`SpeechSynthesisUtterance` availability, and wraps the whole call in try/catch so a throwing `speak()` call (real-world device/permission quirks) also can't propagate, going beyond the literal "API unavailable" case to the spec's broader intent ("speech capability unavailable or fails").

**Stage 2 — Code quality:** PASS. Clean, minimal, no unnecessary abstraction. No findings.

**Verdict:** ✅ Approved, no Critical findings.

### Task 2.4: Session persistence to localStorage
**Stage 1 — Spec compliance:** PASS. `saveSession`/`loadSession`/`clearSession` satisfy the persistence requirement's edge cases: missing key, corrupt JSON, and a throwing `localStorage` call (private browsing, quota) all resolve to `null`/no-throw rather than crashing — matching the spec's "a failed session-state save SHALL NOT roll back a score change that already succeeded" intent (this file makes the save itself safe; the ordering guarantee is Task 3.1's responsibility when it wires DB write before local save).

**Stage 2 — Code quality:** PASS. Good design call: kept generic (`<T>`) rather than importing `SessionState` from the concurrently-being-written `session.ts`, avoiding a cross-task dependency race. No findings.

**Verdict:** ✅ Approved, no Critical findings.

## Wave 3

### Task 3.1: Session flow UI
_Pending_

### Task 3.2: End-to-end manual verification
_Pending_
