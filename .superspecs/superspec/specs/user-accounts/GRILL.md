# Grill Session: User Accounts (Better Auth login/register + per-user scores)

Date: 2026-09-17
Spec reviewed: superspec/specs/user-accounts/spec.md

## Pre-flight

### Wiki conflicts
None beyond the deliberate, already-documented reversal of the "no backend"/"no auth" decisions in `[[techstack/profile]]` — expected and accepted per `DISCUSS.md`.

### Techstack conflicts
None blocking. One real technical risk identified and mitigated (see Q2): Better Auth's Turso/libSQL adapter path (Kysely dialect, not a first-class "Turso adapter") needs to be verified against live documentation during implementation rather than assumed from training data.

### Internal contradictions
Found and resolved: `spec.md`'s "Practice Screen Requires an Active Session" scenario required zero content flash for an unauthenticated visitor, but `page.tsx` is a `"use client"` component with no server-side gate, and `tasks.md`'s Task 2.2 left the gating mechanism undecided ("pick one approach"). A purely client-side check cannot satisfy "never shown, even momentarily." Resolved via Q1.

## Questions & Resolutions

### Q1: How should the practice screen actually be gated, given `page.tsx` is a client component with no server-side check today?
**Recommended:** Next.js Middleware (`middleware.ts`) using Better Auth's documented optimistic cookie-presence check (redirect if the session cookie is absent; no DB round-trip in middleware) — the officially recommended pattern for this exact situation, avoids restructuring `page.tsx` into a server/client split, and keeps automated-test coverage possible by extracting the redirect decision into a small pure function.
**Resolved:** Agreed as recommended.
**Impact:** `tasks.md` Task 2.2 updated to specify this mechanism explicitly instead of leaving it open, including the extracted-pure-function testability approach.

### Q2: How confident are we in the Better Auth ↔ Turso adapter path, and should Task 1.1 verify it live rather than trust a remembered API shape?
**Recommended:** Add an explicit instruction to Task 1.1 to fetch and read current Better Auth documentation (the Vercel guide the user linked, plus `better-auth.com/docs`'s database-adapter page) before writing config code, since library config shapes drift across versions and a subagent working from stale training-data memory risks burning its context budget debugging a wrong config shape instead of building.
**Resolved:** Agreed as recommended.
**Impact:** `tasks.md` Task 1.1 updated with an explicit "verify against live docs first" instruction.

### Q3: Task 1.1 (Better Auth setup) and Task 1.2 (score-table schema) are parallel in Wave 1, but Task 1.2's `user_id` column type needs to match whatever ID type Better Auth's adapter generates for `user.id`. Is that a problem?
**Recommended:** Keep Wave 1 parallel (Better Auth defaults to string/nanoid-style IDs, a stable default across its Kysely-based adapters), pin `user_id TEXT` explicitly in Task 1.2, and add an explicit verification checkpoint at the existing Wave 1 → Wave 2 human checkpoint (confirm Task 1.1's actual `user.id` type matches what Task 1.2 assumed) rather than adding a new coordination mechanism.
**Resolved:** Agreed as recommended.
**Impact:** `tasks.md` Task 1.2 updated to pin `TEXT`; the Wave 1 checkpoint note updated to include this verification.

### Q4: Does Better Auth's default login error already avoid revealing "unknown email" vs. "wrong password," or could it leak that distinction?
**Recommended:** Don't research/trust a specific library internal detail — instead, have Task 2.1 treat any sign-in failure as opaque at the UI layer: always render the same generic "Invalid email or password" text regardless of the underlying error code/message, never surfacing the raw client-side error. This guarantees the spec's non-enumeration requirement structurally, independent of Better Auth's actual internal behavior.
**Resolved:** Agreed as recommended.
**Impact:** `tasks.md` Task 2.1 updated with this explicit instruction.

### Q5: Google OAuth requires credentials only the user can provision — should that block shipping the whole feature?
**Recommended:** Don't block. Task 2.1 builds and unit-tests the Google button/flow against a mocked client (verifying the code path structurally); the feature's Done Criteria treats live Google sign-in verification as a separately-timed manual check, performed once credentials exist, without re-running the rest of the feature's verification. Email+password ships and is fully verified independent of Google credential status.
**Resolved:** Agreed as recommended — user also asked for setup instructions for the Google OAuth credentials to be included.
**Impact:** `tasks.md` Task 1.1 updated with a Google Cloud Console OAuth client walkthrough (consent screen in Testing mode + test users, web application credential type, redirect URIs for dev and prod). `tasks.md` Done Criteria updated to decouple Google sign-in verification timing from the rest of the feature.

### Q6: What happens to the old, unscoped `localStorage` keys (`533words:session`, `533words:speed`, etc.) once per-learner-scoped keys take over?
**Recommended:** Leave them — no cleanup/migration code. They become inert dead keys, cost nothing, and writing one-time migration logic for a handful of orphaned personal-scale `localStorage` entries isn't proportionate.
**Resolved:** Agreed as recommended.
**Impact:** None — confirmed as already-correct scope (Task 3.1 doesn't need cleanup logic; no spec change needed since this was never a stated requirement).

### Q7: The spec's Error Behavior states "The system SHALL NOT permit any learner's session to read or write another learner's score data" as an absolute guarantee — but the client-direct Turso architecture (confirmed via Q1/DISCUSS.md) has no server-side authorization check enforcing this; a technically savvy user with devtools could rewrite the `user_id` in an outgoing query. Is the spec's wording accurate to what the architecture actually delivers?
**Recommended:** Reword the requirement to an application-behavior guarantee ("the application SHALL NOT provide any code path that writes to another learner's score") rather than an unenforceable DB-level guarantee, and add an explicit Non-Functional Requirement documenting this as a known, accepted trust boundary — consistent with the app's existing trust model (the Turso token has always been reachable from the browser; this isn't a new risk class, just a more consequential one now that it's multi-user). Do not reopen the "full backend" architecture decision this late for a hobby app among non-adversarial classmates.
**Resolved:** Agreed as recommended.
**Impact:** `spec.md`'s Error Behavior section reworded; a new Non-Functional Requirement added documenting the accepted trust boundary.

## Spec Changes Required

- Error Behavior: reworded the cross-learner-write guarantee from an absolute "SHALL NOT permit" to an accurate "the application SHALL NOT provide any code path that..." statement (Q7).
- Non-Functional Requirements: added an explicit accepted-risk note about the client-direct architecture's trust boundary (Q7).
- `tasks.md` Task 1.1: added "verify Better Auth's current Turso/Kysely adapter config against live documentation before implementing" (Q2), and a Google Cloud OAuth client setup walkthrough (Q5).
- `tasks.md` Task 1.2: pinned `user_id TEXT` explicitly, with a note to verify against Task 1.1's actual output at the Wave 1 checkpoint (Q3).
- `tasks.md` Task 2.1: added the opaque-error-message instruction (Q4).
- `tasks.md` Task 2.2: replaced the open "pick one approach" framing with a specific middleware + optimistic cookie-check + extracted-pure-function-for-testability instruction (Q1).
- `tasks.md` Done Criteria: decoupled Google sign-in's live verification timing from the rest of the feature's manual verification (Q5).

## Deferred Questions

- [ ] Exact Better Auth env var names (`GOOGLE_CLIENT_ID` vs. provider-specific naming) and the exact session-cookie name middleware checks for — deferred to Task 1.1's live-documentation check (Q2), not resolvable without reading current docs.
- [ ] Password minimum-length/complexity policy — deferred to Better Auth's own defaults; not worth specifying custom rules for a small classmate group.
- [ ] Session expiry/duration — deferred to Better Auth's own defaults for the same reason.

## Verdict

**READY** — All decision branches resolved. Proceed to `/pick-spec`.
