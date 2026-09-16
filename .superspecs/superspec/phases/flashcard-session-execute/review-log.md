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
_Pending_

### Task 2.2: Word bank data access
_Pending_

### Task 2.3: Speech synthesis utility
_Pending_

### Task 2.4: Session persistence to localStorage
_Pending_

## Wave 3

### Task 3.1: Session flow UI
_Pending_

### Task 3.2: End-to-end manual verification
_Pending_
