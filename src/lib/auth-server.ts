import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export { getUserId, type SessionLike } from "@/lib/session-user";

/**
 * Reads the active session server-side (layout / Server Component / route
 * handler context) by forwarding the incoming request's headers -- Better
 * Auth uses those to look up and validate the session cookie against the
 * database. Returns `null` when there is no active session.
 *
 * A later task builds Next.js Middleware for route protection; middleware
 * runs in the Edge runtime where this DB-backed check isn't appropriate,
 * so that task should use Better Auth's cookie-existence check instead
 * (`getSessionCookie` from `better-auth/cookies`) for the optimistic
 * redirect, and treat this helper as the source of truth wherever a full
 * Node.js server context is available (layouts, Server Components, Route
 * Handlers).
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
