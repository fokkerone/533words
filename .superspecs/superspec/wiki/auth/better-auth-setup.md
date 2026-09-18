---
title: Better Auth Setup (Turso/Kysely + Cookie-Gated Routes)
summary: How 533words added real multi-user login/register via Better Auth — reusing the existing Turso DB through a Kysely dialect, gating the whole app behind a cookie-presence check in Next.js 16's proxy.ts, and deferring live Google OAuth verification until real credentials exist.
tags: [auth, user-accounts, turso, nextjs, sessions]
spec: "[[user-accounts]]"
created: 2026-09-18
updated: 2026-09-18
provenance:
  sources: [specs/user-accounts/DISCUSS.md, specs/user-accounts/spec.md, specs/user-accounts/GRILL.md, phases/user-accounts-execute/review-log.md]
  extracted: 65%
  inferred: 30%
  ambiguous: 5%
---

# Better Auth Setup (Turso/Kysely + Cookie-Gated Routes)

## Summary
user-accounts is 533words' first feature with any server-side code. It adds real account registration/login (email+password and Google) via [Better Auth](https://better-auth.com), reusing the app's existing Turso database rather than provisioning a second one, and gates the entire practice screen behind an active session.

## Context
533words started as a single-family tool with an explicit "no backend, no auth" techstack decision (see [[techstack/profile]]). Classmates wanting to use the app too meant real accounts were needed — but the goal was to add the smallest possible server surface, not rebuild the app's data layer. The resulting architecture: Better Auth's own route handler is the *only* server code; everything else (word/score reads and writes) stays client-direct against Turso, just scoped by the signed-in learner's ID pulled from the session.

## Key Decisions

### Minimal backend footprint — one route handler, not a full API layer
**Chose:** A single catch-all Better Auth Route Handler (`/api/auth/[...all]/route.ts`); all other app data stays client-direct via `@libsql/client/web`, scoped by `session.user.id`.
**Over:** Moving word/score reads and writes behind Server Actions or dedicated API routes with server-side authorization checks.
**Because:** the existing Turso token is already a scoped, low-privilege credential reachable from the browser — a full backend rewrite was judged disproportionate for a hobby app among non-adversarial classmates. See [[data/word-bank-schema]] and [[ui/session-state-pattern]] for what the scoped client-direct data layer actually looks like.
**Trade-off:** this is an explicitly accepted trust boundary, not a security guarantee — the application's own code never writes to another learner's score, but nothing at the database level stops a user with browser devtools from crafting a request that does. Documented as a Non-Functional Requirement in `spec.md` rather than glossed over. ^[inferred: this reasoning was surfaced during grilling as GRILL.md Q7, not stated as an assumption upfront]

### Turso/libSQL via a Kysely dialect, not a first-class "Turso adapter"
**Chose:** `betterAuth({ database: { dialect: new LibsqlDialect({ url, authToken }), type: "sqlite" }, ... })`, using `@libsql/kysely-libsql` (the scoped package), reusing the same `NEXT_PUBLIC_TURSO_DATABASE_URL`/`NEXT_PUBLIC_TURSO_AUTH_TOKEN` env vars the word-bank data layer already uses.
**Because:** Better Auth has no first-class Turso adapter; its SQL-database support goes through Kysely. This was confirmed by reading Better Auth's live docs *and* cross-checking the installed package's actual TypeScript source (`node_modules/@better-auth/kysely-adapter`) — not assumed from training data, since library config shapes like this drift across versions.
**Gotcha found along the way:** the Vercel documentation URL originally supplied by the user (`vercel.com/docs/connect/frameworks/better-auth`) turned out to document an unrelated product (Vercel Connect, an OAuth gateway for internal tools) — not a Turso integration guide. Caught by actually reading the page rather than trusting the URL's apparent relevance.
**Auth tables are created separately from `initSchema`:** Better Auth's own `user`/`session`/`account`/`verification` tables are created by `npx @better-auth/cli migrate` (wired as `npm run auth:migrate`), not by `src/lib/db.ts`'s `initSchema` (which only ever owned the `words` table, now also `user_word_scores` — see [[data/word-bank-schema]]). The two migrations are order-independent since SQLite/libSQL doesn't validate FK targets at `CREATE TABLE` time.

### Route gating: cookie-presence check in `proxy.ts`, not a DB-backed check
**Chose:** Next.js Middleware (built as `src/proxy.ts`) using Better Auth's `getSessionCookie()` — an optimistic, DB-free check of whether a session cookie exists — to redirect an unauthenticated visitor to `/login` before any component renders. The actual redirect *decision* is a small pure function (`shouldRedirectToLogin`), unit-tested directly; the middleware/proxy wiring itself is verified manually (`curl` against a running dev server), since it isn't meaningfully unit-testable under jsdom.
**Over:** A DB-backed session check in middleware (too expensive to run on every request at the edge), or restructuring `page.tsx` into a server/client split to do the check at the component level.
**Because:** this is Better Auth's own documented pattern for exactly this situation, and avoids a risky restructure of an already-complex, heavily-tested page component.
**Gotcha — Next.js 16 renamed `middleware.ts` to `proxy.ts`:** building this as `middleware.ts` (as originally speced) produced a real build-time deprecation warning. Confirmed by reading `node_modules/next/dist/docs/.../proxy.md` directly: *"The `middleware` file convention is deprecated and has been renamed to `proxy`."* Same behavior, new file/export name. Worth checking for on any future Next.js upgrade in this project, since the docs bundled in `node_modules` are the fastest way to catch version-specific renames like this.
**A real DB-backed session check still exists** at `src/lib/auth-server.ts`'s `getServerSession()`, for any future context (layouts, Server Components, Route Handlers) that needs a fully-validated session rather than just "a cookie is present."

### Google sign-in: unit-tested structurally, live-verified only once real credentials exist
**Chose:** Both `/login` and `/register` build and unit-test the "Sign in with Google" button/flow against a mocked Better Auth client (asserting `signIn.social({ provider: "google" })` is invoked correctly) without needing real Google OAuth credentials to exist. Live, end-to-end Google verification is explicitly decoupled from the rest of the feature's ship timeline — performed whenever real credentials are provisioned, without re-running the rest of the feature's verification.
**Because:** Google OAuth credentials require manual setup only the project owner can do (Google Cloud Console), and blocking the whole feature on that external dependency wasn't judged reasonable.
**Google Cloud OAuth client setup** (for future reference / re-provisioning): Google Cloud Console → new/existing project → OAuth consent screen (External, **Testing** mode — no Google review needed, add each classmate's email as a **Test user**) → Credentials → OAuth client ID → **Web application** → Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (dev) and the equivalent production URL. Client ID/Secret go into `.env.local` and Vercel's project env vars, never committed.

### Email+password requires a `name` field the app doesn't collect
**Gotcha:** Better Auth's `signUp.email` schema requires a `name` field, but this app has no display-name UI (out of scope per spec — see Non-Goals). Found via a real `npm run build` TypeScript failure, not by guessing the schema. **Resolved:** the email address itself is passed as `name` at signup — used only as a fallback display label (the header shows `name || email`), never presented as a separate identity field.

## Patterns

### `useSession()`'s loading window, handled by splitting the page component
`page.tsx`'s default export (`Home`) is now a thin wrapper: it calls `useSession()`, and while the resolved learner ID (`getUserId(session)`) is still null, renders a minimal loading placeholder with zero word/score/session content — satisfying the spec's "no content shown before a session resolves" requirement at the client-render level (on top of, not instead of, `proxy.ts`'s server-side redirect gate). Once `userId` is known, it mounts a separate `PracticeScreen({ userId })` component, so every downstream hook and localStorage read can treat `userId` as a stable, always-known value rather than defensively handling `null`.

## Interface / Contract

```ts
// src/lib/auth-client.ts (browser)
export const { signIn, signUp, signOut, useSession } = createAuthClient();
// useSession() -> { data: { user: { id, name, email }, session: {...} } | null, isPending, ... }

// src/lib/auth-server.ts (server components / route handlers)
export async function getServerSession(): Promise<Session | null>; // full, DB-validated

// src/lib/session-user.ts (pure, framework-free)
export function getUserId(session: SessionLike): string | null;

// src/lib/route-guard.ts (pure, used by proxy.ts)
export function shouldRedirectToLogin(cookieValue: string | null | undefined): boolean;
```

## Gotchas
- **`better-auth` install required `--legacy-peer-deps`** due to a pre-existing, unrelated `@types/node` version conflict between vitest and this project's pin — confirmed via `git stash` that this predates the auth work, not introduced by it.
- See "Key Decisions" above for the Vercel-doc-URL mismatch, the `middleware.ts` → `proxy.ts` rename, and the `signUp.email` required-`name`-field gotchas — all found via direct verification (reading live docs, package source, or real build errors) rather than assumption.

## Open Questions
- [ ] Password minimum-length/complexity and session expiry are left at Better Auth's own defaults — not customized, not documented numerically anywhere in this project.
- [ ] Whether `ALTER TABLE words DROP COLUMN score` actually succeeded against the real Turso DB, vs. falling back to clearing the column to 0 — only verified via fake-client tests during execution; worth confirming directly if this ever needs to be relied upon (e.g. reclaiming storage).

## Related
- [[data/word-bank-schema]] — the `user_word_scores` table this feature added, and the now-dropped `words.score` column
- [[ui/session-state-pattern]] — the `Home`/`PracticeScreen` split and how `session.ts`'s pure state logic now flows through a per-learner `userId`
- [[patterns/per-user-scoped-storage]] — the `localStorage`/Tanstack-Query-cache-key scoping convention this feature established
- [[techstack/profile]] — updated stack overview reflecting Better Auth and this project's first server-side surface
- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth-server.ts`, `src/lib/session-user.ts`, `src/proxy.ts`, `src/lib/route-guard.ts`, `src/app/login/page.tsx`, `src/app/register/page.tsx` — implementation
