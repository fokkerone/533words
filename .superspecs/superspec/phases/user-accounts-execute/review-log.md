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
**Stage 1 — Spec compliance:** PASS. Both scenarios verified for registration (success redirects to `/`, already-used email shows a specific error without redirecting) and login (success redirects, incorrect credentials show a generic error). The non-enumeration requirement is satisfied structurally exactly as GRILL.md Q4 intended: `GENERIC_LOGIN_ERROR` is a hardcoded constant, never Better Auth's `error.message`/`error.code` — verified by a test that feeds a fake error containing an internal-detail string and asserts it never renders. Google sign-in uses a single `signIn.social({ provider: "google" })` action for both first-time and returning users, matching the spec's "single action" requirement.

**Diligence on the Better Auth API surface:** rather than guessing method signatures, the subagent ran `createAuthClient()` directly in Node to confirm the real shape, and found — via a real `npm run build` typecheck failure, not by assumption — that Better Auth's `signUp.email` schema requires a `name` field this app has no UI for; resolved by defaulting `name` to the email address, documented inline as a deliberate fallback (out of scope: dedicated display-name field). This is exactly the kind of live-verification discipline GRILL.md Q2 asked for, applied here even though Q2 was written about Task 1.1 specifically.

**Stage 2 — Code quality:** PASS. Good separation: `AuthForm` owns only field state/visual shell, page components own the Better Auth call + error-code interpretation — appropriately not over-extracted (the task's own guidance was "only extract if there's genuine duplication," followed correctly). Register's error handling distinguishes the one recognized safe code (`USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`) from everything else, which falls back to a generic message rather than ever risking a raw error leak. Test mocking follows this project's established `page.test.tsx` convention. 8 new tests, each testing a distinct behavior (not padding).

**Low, non-blocking nit:** `AuthForm`'s password field is shared between login and register with `autoComplete="current-password"` — technically correct for login, but browser password managers generally handle registration flows better with `autoComplete="new-password"` (offers to generate/save a new password rather than autofill an old one). Cosmetic UX polish, not a spec violation; not worth a fix-up cycle for this pass.

**Verdict:** ✅ Approved, no Critical findings.

### Task 2.2: Route protection for the practice screen
**Stage 1 — Spec compliance:** PASS. Independently re-verified the core scenario myself: started the real dev server and confirmed `curl http://localhost:3000/` unauthenticated returns `307` to `/login`, while `/login` and `/register` both return `200` without a session. This satisfies "Unauthenticated visit redirects to login" and "no redirect loop" directly, not just on the subagent's word.

**Genuine, well-substantiated deviation from the task's literal instruction:** the task said `src/middleware.ts`, but the subagent found this produces a real Next.js 16 build-time deprecation warning and correctly followed `AGENTS.md`'s explicit instruction to consult `node_modules/next/dist/docs/` and heed deprecation notices. I independently confirmed the deprecation is real by reading `node_modules/next/dist/docs/.../proxy.md` myself — it explicitly states "The `middleware` file convention is deprecated and has been renamed to `proxy`." Correct call, correctly justified, not an unauthorized scope change.

**Testability approach matches GRILL.md Q1 exactly:** `shouldRedirectToLogin` extracted as a pure function, unit-tested directly (3 tests: absent/null/present cookie); `proxy.ts` itself stays a thin wrapper, appropriately left to manual/curl verification since it isn't meaningfully unit-testable under jsdom. `getSessionCookie`'s signature was verified against the installed package's `.d.mts` file rather than assumed.

**Stage 2 — Code quality:** PASS. Matcher correctly excludes `/login`, `/register`, `/api/auth/*`, Next.js internals, and static assets — verified by the redirect-loop-free `curl` checks above. Doc comments in both `proxy.ts` and `route-guard.ts` clearly explain the optimistic-cookie-vs-DB-backed-check distinction, correctly pointing at `auth-server.ts`'s `getServerSession()` as the place for a real DB-backed check if one is ever needed.

**Low, non-blocking nits:** (1) `route-guard.ts`'s doc comment still says "`src/middleware.ts`" in two places — a stale reference from before the proxy.ts rename; (2) one test is labeled "redirects when the session cookie is an empty string" but actually passes `null`, not `""` — a minor test-description/input mismatch, not a real gap since `null` is the documented `getSessionCookie` return value for "no cookie" anyway. Neither affects correctness; not worth a fix-up cycle.

**Verdict:** ✅ Approved, no Critical findings. Independently re-verified the redirect/no-redirect-loop behavior myself via a live `curl` check against the actual dev server, not just accepting the subagent's report.

### Task 2.3: Per-learner score data layer
**Stage 1 — Spec compliance:** PASS. `fetchWords`'s `LEFT JOIN ... COALESCE(user_word_scores.score, 0)` correctly implements the "implicit 0 for an unflagged word" requirement without erroring on a missing row. `writeWordFlag`'s `INSERT ... ON CONFLICT (user_id, word_id) DO UPDATE` correctly satisfies "row created on first flag, updated (not duplicated) on subsequent flags" in a single atomic statement — a cleaner solution than the task's suggested "check if row exists, branch" approach, and still fully consistent with the existing "read current score, compute, write" pattern. `userId` made a required parameter on all four touched functions (`fetchWords`, `writeWordFlag`, `useWords`, `useFlagWord`) — correctly reasoned: the spec's Error Behavior clause leaves no valid "unscoped" call, and making it required surfaces the gap at compile time rather than accepting a silent placeholder.

**Query-key scoping (Word/Score Data Fetching Is Scoped Per Learner) done here, ahead of Wave 3:** `useWords`/`useFlagWord` already fold `userId` into `WORDS_QUERY_KEY` (`[...WORDS_QUERY_KEY, userId]`), which is technically listed as Wave 3's job in tasks.md but is a natural, low-risk consequence of making `userId` a required hook parameter — not scope creep, just finishing the same change coherently in one place instead of leaving the hooks half-scoped.

**Expected temporary build failure — correctly anticipated and reported, not glossed over:** independently reproduced myself — `npm run build` fails with exactly `src/app/page.tsx(43,54): error TS2554: Expected 1 arguments, but got 0` and the same at line 44, because `page.tsx` still calls `useWords()`/`useFlagWord()` with no arguments. This is precisely the documented, deliberate consequence of Wave 2's three tasks running in parallel against disjoint files — Wave 3 (Task 3.1) is what wires the real session into these call sites. Not a defect in this task.

**Stage 2 — Code quality:** PASS. Test coverage is excellent and matches the task's four required scenarios exactly, plus two extra edge cases carried over from the original `words.test.ts` (write failure propagation, missing-word error) — nothing dropped in the rewrite. The fake DB client correctly models the two-table join shape (`words` + `user_word_scores`) rather than a simplified stand-in, keeping the test meaningfully close to the real query shape.

**Verdict:** ✅ Approved, no Critical findings. `npm run build`'s failure is expected and will resolve once Task 3.1 (Wave 3) wires `page.tsx` to the real session.

## Wave 3

### Task 3.1: Header user menu, per-learner persistence scoping, and full wiring
_Pending_
