# Discussion: User Accounts (Better Auth login/register + per-user scores)

Date: 2026-09-17
Participants: human + AI

## What We're Building

533words is expanding from a single-family flashcard app into something classmates can use too. This feature adds real multi-user accounts via [Better Auth](https://vercel.com/docs/connect/frameworks/better-auth) (email+password and Google sign-in), gates the practice screen behind login, adds a user menu to the header, and restructures the word-scoring data model from a single global `words.score` column into a per-user `user_word_scores`-style join table so each learner tracks their own progress independently — including when multiple learners share the same device/browser.

## Goals
- Real registration/login via Better Auth, supporting both email+password and Google OAuth
- The practice screen (today's entire app) requires a logged-in session; unauthenticated visitors are redirected to `/login`
- A header user menu showing the logged-in learner's identity and a logout action
- Word scores move from a single global counter per word to a per-`(user, word)` score, created lazily on first flag
- All client-side persistence (in-progress session, speed/voice/session-size/theme settings) and Tanstack Query cache keys scoped per logged-in user, so a shared device never leaks one learner's state into another's session

## Non-Goals (explicitly out of scope)
- Password reset / "forgot password" flow — a forgotten password is a dead end for this pass (can be manually resolved via the DB if needed)
- Email verification at registration — accounts are usable immediately after registering, no email-sending infrastructure is introduced
- Roles/permissions (e.g. teacher vs. student, admin dashboard) — every account is equal
- Migrating existing score history — the current global `words.score` data is deleted, every learner (including the original user) starts fresh at 0
- A full backend for app data — word/score reads and writes stay client-direct via `@libsql/client/web`, scoped by `session.user.id`; only Better Auth's own route handler runs server-side
- Profile/settings pages beyond the header user menu (no avatar upload, no display-name editing, etc.)

## Constraints
- **Technical:** Next.js App Router, React 19, TypeScript, Turso (libSQL) via `@libsql/client/web`, Tanstack Query — see [[techstack/profile]]. This feature is the project's *first* server-side code: Better Auth requires a Next.js Route Handler (e.g. `/api/auth/[...all]/route.ts`) to issue/verify sessions and to run its DB adapter against Turso. This reverses two standing techstack decisions ("no backend/API routes", "no auth") on purpose.
- **Scope:** Keep the server surface to exactly what Better Auth requires — no Server Actions/API routes for word/score data; that stays client-direct as today, just scoped by the authenticated user's ID.
- **Other:** New environment secrets needed (`BETTER_AUTH_SECRET`, Google OAuth client ID/secret, existing Turso credentials reused by Better Auth's adapter) — must be added to `.env.local` and Vercel project settings, never committed.

## Key Decisions Made

### Decision: Sign-in methods
**We will:** Support both email+password and Google OAuth via Better Auth.
**Because:** classmates likely already have school Google accounts (fast path, no password to manage), but not everyone can rely on that, so email+password is kept as a fallback.
**We won't:** Support any other social provider for this pass.

### Decision: Backend footprint — minimal
**We will:** Add exactly one server-side surface: Better Auth's Next.js Route Handler, backed by a Turso adapter (Better Auth's own `user`/`session`/`account`/`verification` tables live in the same Turso DB). All existing app data (words, scores) continues to be read/written client-direct from the browser via `@libsql/client/web`, scoped to `session.user.id` obtained from Better Auth's client-side session hook.
**Because:** the DB token is already a scoped, low-privilege token (per the existing techstack profile), and a full Server Actions rewrite of `src/lib/words.ts`/`src/hooks/use-words.ts` is a much bigger change than this feature needs.
**We won't:** Move word/score reads or writes behind server routes/Server Actions in this pass.

### Decision: Score data model — per-user join table, lazy rows
**We will:** Replace the single global `words.score` column with a new table mapping `(user_id, word_id) -> score`. A row is only created the first time a given user flags a given word — an unflagged word implicitly has score 0 for that user, exactly matching today's `DEFAULT 0` behavior.
**Because:** mirrors existing behavior exactly, and avoids a 533-row bulk-insert per new signup.
**We won't:** Pre-populate all 533 rows for every user at registration time.

### Decision: Existing score data — deleted, not migrated
**We will:** Drop/clear the existing global `words.score` values as part of the migration. Every learner, including the original user, starts at 0 once accounts exist.
**Because:** explicitly accepted by the user — simpler than deciding "whose history is this anyway" for a column that was never meant to be per-user.
**We won't:** Attempt to attribute the old global scores to any specific new account.

### Decision: Route protection — everything gated
**We will:** Require a logged-in session to view the practice screen at all; an unauthenticated visitor is redirected straight to `/login`.
**Because:** the entire point of scores is per-user progress tracking — there's no meaningful "guest mode" use case here.
**We won't:** Allow anonymous browsing/practicing without an account.

### Decision: Routes and header UI
**We will:** Add `/login` and `/register` pages (each with an email+password form and a "Sign in with Google" button — Better Auth handles create-vs-reuse for Google automatically), and a header user menu (replacing/extending the existing header controls) showing the logged-in learner's identity plus a Logout action.
**Because:** this is the minimal surface needed for real multi-user login, matching the existing header's placement of session controls (see [[ui/design-tokens-theming]]).
**We won't:** Build a dedicated profile/settings page in this pass.

### Decision: Client-side persistence scoped per user
**We will:** Prefix all `localStorage` keys (in-progress session, speed/voice/session-size/theme settings) with the logged-in user's ID, and include the user ID in all Tanstack Query cache keys for word/score data.
**Because:** on a shared device, logging in as a different classmate must never resume/leak another learner's in-progress session, settings, or results.
**We won't:** Keep any of the existing global/unscoped `localStorage` keys or query keys as-is — this touches `session-storage.ts`, `speech-settings.ts`, `voice-settings.ts`, `session-size-settings.ts`, `theme-settings.ts`, and `use-words.ts`.

### Decision: No email verification required
**We will:** Let a newly registered email+password account log in immediately, with no confirmation email step.
**Because:** no email-sending infrastructure exists in this project yet, and requiring verification would mean standing one up just for this feature; for a small voluntary group of classmates, an unverified-email risk is low-stakes.
**We won't:** Configure an email provider (Resend, SMTP, etc.) as part of this pass.

## Open Questions
- [ ] Exact table/column names for the new score join table and any renaming of `words` — left to `/spec` and implementation.
- [ ] Whether a Google Cloud OAuth client (client ID/secret) already exists for this project, or needs to be created by the user before `/branch`/`/subagent` execution can actually test the Google sign-in path end-to-end.
- [ ] Whether Better Auth's Turso/libSQL adapter needs a specific Kysely dialect package added as a new dependency — to be confirmed during `/spec`'s techstack alignment check.

## Success Criteria
- [ ] A new user can register with email+password or Google and is immediately logged in and practicing.
- [ ] An unauthenticated visitor hitting `/` is redirected to `/login`.
- [ ] Flagging a word writes/updates that learner's own score row, never another learner's.
- [ ] Two different accounts used on the same browser never see each other's in-progress session, settings, or results — verified by logging in as two different test accounts sequentially on the same device.
- [ ] The header shows a user menu with the logged-in learner's identity and a working Logout action.
- [ ] `npm run test`, `npm run lint`, `npm run build` all pass; existing fake-DB-client testing convention ([[patterns/fake-db-client-testing]]) extended to the new schema/scoped queries.

## Risks
- **First server-side code in this project:** Better Auth's route handler is genuinely new surface area (previously zero API routes existed) — mitigated by relying on Better Auth's own hardened session/auth implementation rather than hand-rolling anything.
- **Wide-reaching refactor:** scoping `localStorage` keys and query keys by user ID touches nearly every existing settings module and `page.tsx` itself — mitigated by tackling it as its own well-defined task in `/spec`'s task breakdown, following the existing settings-module pattern rather than inventing a new one.
- **New required secrets:** `BETTER_AUTH_SECRET` and Google OAuth credentials must be provisioned and kept out of git — same discipline already established for the Turso token (see [[techstack/profile]]).
- **Google OAuth setup is partly outside this codebase's control:** the user needs to create/configure a Google Cloud OAuth client before the Google sign-in path can be tested end-to-end; email+password can be fully tested without it.

## Wiki References
- [[techstack/profile]] — current stack; documents the "no backend/no auth" decisions this feature deliberately reverses, and the scoped-Turso-token precedent this feature's secret-handling should follow
- [[data/word-bank-schema]] — the current `words(id, text, score)` schema being restructured
- [[ui/session-state-pattern]] — the `SessionState`/`flagWord` logic that currently reads/writes `Word.score` directly and will need to become user-scoped
- [[patterns/fake-db-client-testing]] — the testing convention to extend to the new schema and scoped queries
- [[ui/design-tokens-theming]] — the current header layout (session controls on the right) the new user menu should follow
