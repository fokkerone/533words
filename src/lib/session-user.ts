/**
 * Pure, framework-free helpers for working with a Better Auth session
 * object. Kept separate from `src/lib/auth-server.ts` (which pulls in
 * `next/headers` and the live `auth` instance) so this logic is testable
 * in isolation, with no env vars or Next.js server context required.
 */

/** The shape this module cares about from a Better Auth session object. */
export type SessionLike = {
  user: {
    id: string;
  };
} | null | undefined;

/**
 * Null/undefined-safe extraction of just the user ID from a session
 * object, so callers that only need the ID don't each have to repeat the
 * `session?.user.id` optional-chaining themselves.
 */
export function getUserId(session: SessionLike): string | null {
  return session?.user.id ?? null;
}
