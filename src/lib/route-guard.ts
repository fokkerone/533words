/**
 * Pure, framework-free redirect decision for `src/middleware.ts`.
 *
 * `middleware.ts` runs in the Edge runtime and isn't itself meaningfully
 * unit-testable under jsdom, so the actual decision logic lives here where
 * it can be tested directly. `middleware.ts` stays a thin wrapper that
 * extracts the session cookie value via Better Auth's `getSessionCookie`
 * (an optimistic, DB-free cookie-presence check -- see
 * `src/lib/auth-server.ts` for why a DB-backed check isn't used here) and
 * calls this function with it.
 */

/**
 * Whether an unauthenticated visitor (no session cookie present) should be
 * redirected to `/login`. `getSessionCookie` returns `null` when there is
 * no session cookie; `undefined` is also accepted defensively so callers
 * don't need to normalize first.
 */
export function shouldRedirectToLogin(
  cookieValue: string | null | undefined,
): boolean {
  return !cookieValue;
}
