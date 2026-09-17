# Review Log: User Accounts (Better Auth login/register + per-user scores)

Populated during execution — one entry per task review.

## Wave 1

### Task 1.1: Better Auth server setup
**Stage 1 — Spec compliance:** PASS. Email+password and Google providers both configured on the Better Auth server instance (`src/lib/auth.ts`); no email-verification or password-reset flow enabled, matching the spec's Non-Functional Requirements exactly. Secrets (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`) supplied via env vars only, `.env.local` confirmed gitignored and not staged — verified independently via `git check-ignore -v .env.local`.

**Technical risk from GRILL.md Q2 — resolved correctly:** the subagent didn't trust a remembered API shape. It found the Vercel guide the user linked was actually irrelevant (documents Vercel Connect/OAuth gateway, not Turso), caught this itself, and got the real config from `better-auth.com/docs` plus cross-checking the installed package's actual TypeScript source (`node_modules/@better-auth/kysely-adapter/dist/index.mjs`) — a more rigorous verification than just reading docs. Used `@libsql/kysely-libsql` (the scoped package) after presumably finding the unscoped `kysely-libsql` insufficient/wrong — reasonable diligence.

**`user.id` type (GRILL.md Q3 checkpoint):** confirmed via running the real migration against Turso and querying `sqlite_master`: `id text not null primary key`. Matches Task 1.2's `TEXT` assumption exactly — verified, not just asserted. **Wave 1 → Wave 2 checkpoint requirement satisfied.**

**Stage 2 — Code quality:** PASS. `src/lib/session-user.ts` (the extracted pure `getUserId()` helper) properly TDD'd — 3 tests (present session, null, undefined), all meaningful. Good separation of concerns: `session-user.ts` has zero framework/env dependencies (testable in isolation), `auth-server.ts` wraps it with the `next/headers`-dependent server session getter. `auth-server.ts`'s doc comment correctly anticipates the next task's needs (flags that Edge-runtime middleware should use `getSessionCookie` from `better-auth/cookies` for the optimistic check, not this DB-backed helper) — useful forward-looking guidance for Task 2.2 without overstepping into building it.

**Pre-existing issue found, not introduced:** installing `better-auth` required `--legacy-peer-deps` due to a pre-existing `@types/node` version conflict between vitest and the project's pin — the subagent verified via `git stash` that this conflict predates its changes, not something it introduced. Correctly reported rather than silently worked around.

**Verdict:** ✅ Approved, no findings.

### Task 1.2: Per-learner score schema migration
**Stage 1 — Spec compliance:** PASS. `user_word_scores (user_id TEXT, word_id TEXT, score INTEGER DEFAULT 0, PRIMARY KEY (user_id, word_id))` correctly models the spec's "lazy row, implicit 0" requirement — a composite PK means at most one row per (learner, word), and absence of a row is the implicit-0 state, matching `fetchWords`'s future `LEFT JOIN`/`COALESCE` plan exactly. `dropWordsScoreColumn` satisfies "Prior Global Scores Are Not Carried Forward" — removing the column (not just zeroing it) is the cleaner choice and matches the task's stated preference.

**FK reasoning verified correct:** the subagent's claim that SQLite/libSQL doesn't validate FK targets at `CREATE TABLE` time (only at DML time, gated behind `PRAGMA foreign_keys`, which this app doesn't enable) is accurate — this correctly resolves the Wave-1-parallel ordering concern from GRILL.md Q3 without needing to serialize anything. `user_id` type (`TEXT`) correctly carried forward from Task 1.1's verified `user.id` type.

**Stage 2 — Code quality:** PASS. Excellent test coverage for `dropWordsScoreColumn` specifically — not just the happy path, but the column-already-absent no-op, running twice in sequence, and the DROP-COLUMN-unsupported fallback (forced via a fake client that makes `ALTER TABLE` throw). This is exactly the kind of edge-case coverage a destructive, hard-to-undo migration needs. `scripts/migrate.ts` updated consistently and documents the order-independence with Task 1.1's separate Better Auth migration.

**Known, honestly-disclosed residual risk (not a Critical finding):** `ALTER TABLE ... DROP COLUMN` against libSQL/Turso specifically has only been verified against the fake-client test pattern, not the real Turso DB from this environment — the subagent flagged this itself rather than overclaiming, and the fallback path (clear to 0) means even a real-world failure degrades gracefully and still satisfies the spec's requirement. Worth confirming during this feature's manual end-to-end verification (Wave 3) by actually running `npm run migrate` against the real Turso DB.

**Verdict:** ✅ Approved, no Critical findings. One item carried to manual verification: confirm `DROP COLUMN` actually succeeds (vs. falls back) against the real Turso DB.

## Wave 2

### Task 2.1: Login and register pages
_Pending_

### Task 2.2: Route protection for the practice screen
_Pending_

### Task 2.3: Per-learner score data layer
_Pending_

## Wave 3

### Task 3.1: Header user menu, per-learner persistence scoping, and full wiring
_Pending_
