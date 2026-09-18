# Implementation Tasks: User Accounts (Better Auth login/register + per-user scores)

## Context Window Budget
Estimated spec + task tokens: ~16k / 200k ✅

## Wave 1 — Foundation
Two tasks, independent files, run in parallel.

### Task 1.1: Better Auth server setup
**Before writing any code:** fetch and read the *current* Better Auth documentation — the Vercel guide (`vercel.com/docs/connect/frameworks/better-auth`) and `better-auth.com/docs`'s database-adapter page — to confirm the exact current config shape for wiring Better Auth to Turso/libSQL (this goes through a Kysely dialect, e.g. `kysely-libsql`, not a first-class "Turso adapter"). Library config shapes like this drift across versions; do not implement from memory/training data. If the live docs describe a different mechanism than a Kysely dialect, follow what the docs actually say.

**What:** Install and configure Better Auth: the server instance (email+password provider enabled, Google OAuth provider enabled, a libSQL/Turso database adapter pointed at the existing Turso DB — reuse the existing Turso env vars, do not provision a second database), the catch-all Next.js Route Handler (`/api/auth/[...all]/route.ts`) that exposes it, and a small client-side hook/helper for reading the current session (Better Auth ships a React client, e.g. `authClient.useSession()`) plus a server-side helper for reading the session in a layout/middleware context (Task 2.2 will need this). Add `BETTER_AUTH_SECRET` and the Google OAuth client ID/secret to `.env.local` (document as `.env.example`-style comments; do not commit real secret values). No email-verification requirement, no password-reset flow — leave those Better Auth features disabled/unconfigured.

**Google OAuth credential setup (for the human, not the subagent to automate):** document these steps in your task summary so the user can complete them independently of implementation:
1. Google Cloud Console (`console.cloud.google.com`) → create/select a project for 533words.
2. APIs & Services → OAuth consent screen → configure as "External," leave in **Testing** mode (no Google review needed), add each classmate's Google account email under **Test users**.
3. APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: **Web application**.
4. Authorized redirect URIs: add Better Auth's callback path (confirm exact path against the live docs fetched above) for both `http://localhost:3000/...` (dev) and the production Vercel domain.
5. Copy the Client ID/Secret into `.env.local` and into Vercel's project environment variables — never commit real values.

This feature does not require these credentials to exist yet to be implemented and merged — see Task 2.1 and the Done Criteria for how Google sign-in verification is decoupled from the rest of the feature's timeline.

**Files to create/modify:** `src/lib/auth.ts` (or similar — the Better Auth server instance + config), `src/app/api/auth/[...all]/route.ts`, `src/lib/auth-client.ts` (client-side hook/helper), `package.json` (new dependency), `.env.local` (new required vars, not committed), `next.config.ts` if Better Auth needs anything there.

**Test requirement:** This is primarily third-party library configuration — no meaningful unit-testable behavior in the config itself (mirrors how flashcard-session's `db.ts` client construction and editorial-redesign's Task 1.1 font/token config were treated: config-only, verified by build + manual check, not a dedicated test file). If a small pure helper is extracted (e.g. a function that reads a session object and returns just the user ID, or a null/undefined-safe wrapper), write a unit test for that helper specifically.

**Done when:** `npm run build` succeeds, `npm run lint` is clean, no regressions in the existing test suite. Manually verify: hitting `/api/auth/session` (or the equivalent Better Auth endpoint) with no cookie returns an unauthenticated response without crashing; the dev server starts without throwing on missing/misconfigured env vars being read at build time.

### Task 1.2: Per-learner score schema migration
**What:** Add a new table mapping `(user_id, word_id) -> score` (exact naming is your judgment — e.g. `user_word_scores`), created via an idempotent migration (`CREATE TABLE IF NOT EXISTS ...`, following the existing `initSchema` pattern in `src/lib/db.ts`/`scripts/migrate.ts`). Use `user_id TEXT` — Better Auth defaults to string (nanoid-style) primary keys across its Kysely-based adapters, and this is expected to reference Better Auth's own `user` table (created by Task 1.1's adapter). **This assumption must be verified, not just assumed:** at the Wave 1 → Wave 2 human checkpoint, explicitly confirm Task 1.1's actual `user.id` column type matches `TEXT` before Wave 2 begins — if it doesn't, this task's migration needs a follow-up fix before Task 2.3 (Wave 2) builds on it. Additionally: drop the `score` column from the existing `words` table (or clear it to 0 — either satisfies "no learner's score reflects the old global value," but actually removing the column is cleaner since a global score no longer has meaning). This is a one-time destructive migration; make it explicit and idempotent-safe to re-run (e.g. check `PRAGMA table_info` / catch "column already dropped" rather than erroring on a second run).

**Files to create/modify:** `src/lib/db.ts` (or wherever `initSchema` lives), `scripts/migrate.ts`.

**Test requirement:** Using the existing fake-DB-client testing pattern (`src/lib/db.test.ts` or wherever `initSchema` is tested today — check for an existing test file first and extend it, don't duplicate): a test that running the migration twice does not error (idempotency), and a test confirming the new table's `CREATE TABLE IF NOT EXISTS` statement is present/correct. If dropping the `score` column is tested, verify it against a fake client that simulates the column already being absent on a second run.

**Done when:** Tests pass, no regressions, `npm run build`/`npm run lint` clean.

## Wave 2 — Auth UI & Data Layer
Depends on both Wave 1 tasks (needs Better Auth configured and the new score schema in place). Three tasks touching disjoint files — run in parallel.

### Task 2.1: Login and register pages
**What:** `/login` and `/register` pages/routes, each with: an email+password form (submits via Better Auth's client), and a "Sign in with Google" button (Better Auth's client OAuth flow — same button/action serves both first-time and returning Google users, per the spec's "single action" requirement). On success, redirect to the practice screen (`/`). On failure, show an inline error message — specific wording for "email already registered" on the register page, but for **any** login failure, always render the same generic "Invalid email or password" text regardless of what error code/message Better Auth's client actually returns — never surface the raw client-side error message. This guarantees the spec's non-enumeration requirement structurally, independent of Better Auth's internal error semantics (don't research/trust the exact current error shape — just never display it raw). Style using the existing design tokens/typography established by editorial-redesign (`ideas/idee1.webp`-derived palette, Inter, the existing `Button`/`Alert` shadcn components) — these are new pages, not a redesign of anything existing, so keep them visually consistent with the rest of the app but there's no existing layout to preserve.

**Note on Google sign-in testing:** this project may not have live Google OAuth credentials configured yet (see Task 1.1). Build and unit-test the Google button/flow against a mocked Better Auth client — do not treat missing live credentials as a blocker for this task.

**Files to create/modify:** `src/app/login/page.tsx`, `src/app/register/page.tsx`, plus any shared form component you judge worth factoring out (e.g. `src/components/auth-form.tsx`) — only extract if there's genuine duplication, don't force it.

**Test requirement:** Component tests (mocking the Better Auth client, following this project's established mocking pattern from `page.test.tsx`) for: successful email+password registration redirects to `/`; registering with an already-used email shows an error and does not redirect; successful email+password login redirects to `/`; incorrect credentials show a generic error and do not redirect; the Google sign-in button is present and invokes the Better Auth client's Google flow when clicked (mock the client call, don't attempt a real OAuth round-trip in tests).

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean.

### Task 2.2: Route protection for the practice screen
**What:** Require an active session to view the practice screen (`/`), via **Next.js Middleware (`src/middleware.ts`)** using Better Auth's documented optimistic cookie-presence check: if the session cookie is absent, redirect to `/login` before the request reaches any component — no DB round-trip in middleware, just checking whether the cookie exists (confirm the exact cookie name/shape against the live Better Auth docs fetched in Task 1.1). `/login` and `/register` themselves must remain reachable without a session (matcher config must exclude them, or an explicit early-return, to avoid a redirect loop).

To keep this testable despite `middleware.ts` itself not being unit-testable under jsdom: extract the actual redirect decision into a small, pure, exported function (e.g. `shouldRedirectToLogin(cookieValue: string | undefined): boolean` or similar) that `middleware.ts` calls — that pure function is what gets unit-tested directly; `middleware.ts` itself stays a thin wrapper.

**Files to create/modify:** `src/middleware.ts`, plus wherever the extracted pure decision function lives (co-located in the same file or a small `src/lib/route-guard.ts`, your judgment).

**Test requirement:** Unit test the extracted pure decision function directly: no cookie → redirect; a present cookie → no redirect. Manually verify end-to-end (start the dev server, confirm an unauthenticated request to `/` redirects to `/login`, an authenticated request renders normally, and `/login`/`/register` remain reachable without a session) since the actual middleware wiring itself isn't meaningfully unit-testable under jsdom.

**Done when:** The pure decision function's tests pass; manual end-to-end verification confirms the redirect behavior and no redirect loop; no regressions; `npm run build`/`npm run lint` clean.

### Task 2.3: Per-learner score data layer
**What:** Update the word/score data layer to be scoped by the signed-in learner's ID instead of operating on a single global score:
- `fetchWords` (or a new equivalent) SHALL join/left-join against the new per-learner score table for the current learner's ID, so each word comes back with that learner's own score (0 if no row exists yet — this is the "implicit 0" / lazy-row requirement from the spec, so use `LEFT JOIN` + `COALESCE(score, 0)` or equivalent, not an error when no row exists).
- `writeWordFlag` (or a new equivalent) SHALL write to the per-learner score table, creating the row on first flag (`INSERT ... ON CONFLICT DO UPDATE` or an explicit "does a row exist? insert vs. update" check — your judgment, consistent with the existing "read current score, compute new score, write" pattern already established in `src/lib/words.ts`), keyed by `(user_id, word_id)`.
- Both functions need the current learner's ID as an input — thread it through from wherever the caller (Task 3.1's integration into `page.tsx`/`use-words.ts`) has access to the session.

**Files to create/modify:** `src/lib/words.ts`, and update `src/hooks/use-words.ts`'s `useWords`/`useFlagWord` signatures to accept/require the learner's ID (Wave 3 wires this up from the actual session; this task can accept it as an explicit parameter and leave the call site as a to-be-wired TODO if Wave 3 hasn't landed yet — coordinate via the task's "Done when" that the parameter exists and is correctly used, not that the full integration is wired end-to-end, since that's Wave 3's job).

**Test requirement:** Using the existing fake-DB-client pattern (`src/lib/words.test.ts` if it exists, else follow the pattern from `[[patterns/fake-db-client-testing]]`): a test that fetching words for a learner who has never flagged a given word returns score 0 for it; a test that flagging a word for the first time creates a new per-learner score row (not an update); a test that flagging a word a second time updates the existing row rather than creating a duplicate; a test that two different learner IDs produce independent scores for the same word (fetch as learner A after learner B has flagged the same word — A's score is unaffected).

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean.

## Wave 3 — Integration
Depends on all of Wave 2 (needs the auth pages, route protection, and the learner-scoped data layer). Single task — the header user menu and the per-learner `localStorage`/query-key scoping both live in `src/app/page.tsx` and touch the same settings modules, so splitting across parallel subagents would create merge conflicts.

### Task 3.1: Header user menu, per-learner persistence scoping, and full wiring
**What:** Three things, all in `src/app/page.tsx` (and the settings modules):

**(a) Header user menu:** Add the signed-in learner's identity (name or email) and a Logout action to the header, alongside the existing session-size selector, theme toggle, and New Session button (from editorial-redesign — see [[ui/design-tokens-theming]] for the current header layout). Logout calls Better Auth's client sign-out and redirects to `/login`.

**(b) Wire `useWords`/`useFlagWord` to the actual session:** Read the current learner's ID from Better Auth's session hook (Task 1.1) and pass it into Task 2.3's now-learner-aware `useWords`/`useFlagWord`, completing the end-to-end per-learner data flow.

**(c) Scope client-side persistence per learner:** Update `session-storage.ts`, `speech-settings.ts`, `voice-settings.ts`, `session-size-settings.ts`, and `theme-settings.ts` so every `localStorage` key includes the current learner's ID (e.g. `533words:${userId}:session` instead of `533words:session`) — following each module's existing never-throw save/load pattern, just parameterizing the key. Update the Tanstack Query key for words/scores (`WORDS_QUERY_KEY` in `use-words.ts`) to include the learner's ID too, so Tanstack Query's cache never serves one learner's data to another on the same device without a fresh, correctly-scoped fetch.

**Files to create/modify:** `src/app/page.tsx`, `src/lib/session-storage.ts`, `src/lib/speech-settings.ts`, `src/lib/voice-settings.ts`, `src/lib/session-size-settings.ts`, `src/lib/theme-settings.ts`, `src/hooks/use-words.ts`, `src/app/page.test.tsx` (update existing tests broken by the new required-userId parameter and add new tests per below).

**Test requirement:**
1. Header user menu: the learner's identity and a Logout action are present in the header whenever a session is active (mock the session hook, same mocking pattern as the rest of `page.test.tsx`'s settings mocks).
2. Logout: activating it calls Better Auth's client sign-out.
3. Per-learner persistence scoping: for at least one settings module (e.g. `session-storage.ts`), a test that two different learner IDs produce two different, non-colliding `localStorage` keys, and that loading with learner ID A never returns data saved under learner ID B.
4. Query-key scoping: a test (or an assertion within an existing `page.test.tsx` test) that the words query key includes the current learner's ID.
5. No regressions to any already-shipped, still-applicable scenario across flashcard-session/speech-controls/session-size-summary/editorial-redesign now that everything is threaded through a learner ID — update existing tests' setup to supply a mocked signed-in session rather than deleting/skipping them.

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean. Manually verify end-to-end in a browser: register two different accounts (or one email+password and one Google, if a Google OAuth client has been configured), confirm each has independent scores and independent persisted settings/in-progress session on the same browser, and confirm the header shows the correct identity and logout works for each.

## Done Criteria
The feature is DONE when:
- [ ] All five tasks across three waves complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every testable scenario in spec.md has a corresponding passing test (route-protection's redirect decision is unit-tested via its extracted pure function per Task 2.2; the middleware wiring itself and the full HTTP redirect are manually verified — consistent with this project's established manual-verification carve-out for non-unit-testable behavior)
- [ ] Code review passed with no Critical findings
- [ ] No regressions in previously-shipped, still-applicable scenarios
- [ ] `npm run lint` and `npm run build` succeed
- [ ] Manual end-to-end verification with **email+password accounts**: two independent accounts, independent scores, independent persisted state on the same device, working header identity + logout — this can and should be completed even if Google OAuth credentials aren't provisioned yet
- [ ] **Google sign-in verification is decoupled from the rest of this feature's timeline:** it's verified manually as soon as Google OAuth credentials exist (see Task 1.1's setup walkthrough), without needing to re-run the rest of this feature's verification. The feature ships and is considered done once email+password is fully verified, even if Google credentials aren't ready yet.
