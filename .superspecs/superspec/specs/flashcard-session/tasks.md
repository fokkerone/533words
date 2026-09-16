# Implementation Tasks: Flashcard Session (Word Setup + Practice Flow)

## Context Window Budget
Estimated spec + task tokens: ~9k / 200k ✅

## Prerequisites
- Turso database provisioned; `NEXT_PUBLIC_TURSO_DATABASE_URL` and `NEXT_PUBLIC_TURSO_AUTH_TOKEN` (scoped read+write token) set in `.env.local` — **only blocks Task 3.2 (manual verification)**, not Waves 1–3's implementation or tests, which run against a fake DB client
- CSV file of the 533 NRW words, placed at a known path (e.g. `scripts/data/words.csv`), one word per line, no header — **also only blocks Task 3.2**

## Wave 1 — Foundation
Tasks that must complete before Wave 2 can start.

### Task 1.1: Word bank schema
**What:** Create the `words` table in Turso: `id` (text/uuid primary key), `text` (unique, not null), `score` (integer, default 0). Provide a small migration/setup script or inline `CREATE TABLE IF NOT EXISTS` executed via `src/lib/db.ts`.
**Files to create/modify:** `src/lib/db.ts` (add schema init helper), `scripts/migrate.ts` (new)
**Test requirement:** A Vitest test using a lightweight fake DB client (a plain object implementing the same `execute({sql, args})` shape as `@libsql/client/web`, not a real Turso connection or a wire-protocol mock) that running the migration twice does not error and results in exactly one `words` table being created.
**Done when:** Test passes, no regressions.

### Task 1.2: Seed script
**What:** A Node/TS script that reads the CSV word list, and for each line inserts a word row only if a row with that exact text does not already exist (idempotent upsert-or-skip). Logs a summary (inserted count, skipped count).
**Files to create/modify:** `scripts/seed-words.ts` (new), `package.json` (add `"seed": "tsx scripts/seed-words.ts"` script)
**Test requirement:** A Vitest test using the same fake DB client as Task 1.1: seeding a 3-word CSV twice results in exactly 3 rows, not 6 (the fake tracks inserted rows in memory and the test asserts on that).
**Done when:** Test passes, no regressions.

## Wave 2 — Core Logic
Tasks runnable in parallel once Wave 1 is complete.

### Task 2.1: Session pool logic
**What:** Extend `src/lib/session.ts` (existing `startSession`/`pickNextWord`/`applyScore` from the initial scaffold) so `startSession` draws up to 24 unique words from a given word list (fewer if the list has < 24), and word selection removes the picked word from the remaining pool (no replacement). Add a `SessionState` type covering: pool (remaining), current word, flagged words (id → "correct" | "incorrect"), and a `isComplete` derived check.
**Files to create/modify:** `src/lib/session.ts`, `src/lib/session.test.ts` (extend existing tests)
**Test requirement:** Tests for: 24-word pool from a larger bank has no duplicates; pool from a <24-word bank uses all of them; picking a word removes it from the pool so it can't repeat; flagging a word twice does not double-apply the score change; session is complete only when the pool is empty and all drawn words are flagged.
**Done when:** All tests pass, no regressions.

### Task 2.2: Word bank data access (Tanstack Query)
**What:** Hooks wrapping Turso reads/writes via `@libsql/client/web`: fetch all words (for building a session pool), and a mutation to adjust a word's score by +1/-1. Use Tanstack Query for caching/mutation state.
**Files to create/modify:** `src/lib/words.ts` (new — query/mutation functions), `src/hooks/use-words.ts` (new — `useWords()`, `useFlagWord()`)
**Test requirement:** Unit test the score-adjustment function in isolation (given current score N and a flag direction, returns N±1) without needing a live DB connection. Additionally, using the fake DB client from Wave 1, test that `useFlagWord()` calls the write with the expected arguments on success, and surfaces a distinguishable error/failure state (not a silent no-op) when the fake client's write rejects.
**Done when:** Test passes, no regressions.

### Task 2.3: Speech synthesis utility
**What:** A small wrapper around `window.speechSynthesis` that speaks a given word's text, and no-ops safely (does not throw) if the Speech API is unavailable.
**Files to create/modify:** `src/lib/speech.ts` (new)
**Test requirement:** Unit test that calling the speak function when `window.speechSynthesis` is undefined does not throw.
**Done when:** Test passes, no regressions.

### Task 2.4: Session persistence to localStorage
**What:** Functions to save/load `SessionState` (from Task 2.1) to/from `localStorage`, keyed by a fixed session key. Loading returns `null` if nothing is stored or the stored data is invalid/corrupt (does not throw).
**Files to create/modify:** `src/lib/session-storage.ts` (new)
**Test requirement:** Unit tests: save-then-load round-trips a `SessionState`; loading with no stored value returns null; loading corrupt JSON returns null instead of throwing.
**Done when:** Test passes, no regressions.

## Wave 3 — Integration
Final integration tasks, depend on all of Wave 2.

### Task 3.1: Session flow UI
**What:** Build the practice screen: "New Session" action (start/replace session), "Next Word" action (speaks + advances), a reveal action showing the word text with a simple Tailwind fade-in transition, and 👍/👎 flag controls (using existing shadcn `Button`/`Toggle`/`Card` components). On a failed score write, show a shadcn `Alert` with the error and allow retry. Shows a "Session complete" state with a "New Session" action when the pool is exhausted. Wire together session logic (2.1), data access (2.2), speech (2.3), and persistence (2.4): on mount, attempt to restore a session from `localStorage`; if none, either auto-start (per spec, on app load with no session in progress) or wait for explicit start.
**Files to create/modify:** `src/app/page.tsx`, `src/components/session/*.tsx` (new components as needed)
**Test requirement:** A component test (Testing Library) verifying: clicking "Next Word" then the reveal action shows the word text; clicking 👍 disables further flagging on that word; after flagging the last word, a "Session complete" state and "New Session" action are shown; when `useFlagWord()` (mocked/stubbed at the component-test level) reports a failure, the shadcn `Alert` error is displayed. This test relies on Task 2.2's hook-level tests for DB-call correctness — it only verifies the UI reacts correctly to success/error states.
**Done when:** Test passes, no regressions, `npm run build` succeeds.

### Task 3.2: End-to-end manual verification
**What:** With a real (or local) Turso DB seeded via Task 1.2's script, manually run through: start session → next word → speak → reveal → flag correct → flag incorrect → reload mid-session (progress restored) → complete session → start new session. Confirm word-bank scores in Turso reflect the flags made.
**Files to create/modify:** none (verification only, may note findings in `status.md`)
**Test requirement:** N/A — manual verification per the tech stack's "minimal testing" decision (no e2e framework in this project).
**Done when:** All steps in the manual flow behave as specified; any discrepancy is filed as a follow-up, not silently fixed outside the spec.

## Done Criteria
The feature is DONE when:
- [ ] All tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test (2.1–2.4, 3.1) or documented manual verification (3.2)
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests
- [ ] `npm run lint` and `npm run build` succeed
