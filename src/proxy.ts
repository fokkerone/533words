import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { shouldRedirectToLogin } from "@/lib/route-guard";

/**
 * Requires an active session to view the practice screen (`/`).
 *
 * Named/filed as `proxy.ts` (not `middleware.ts`): Next.js 16 deprecated
 * the `middleware` file convention and renamed it to `proxy` (same
 * behavior, new file/export name -- see
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
 * Building this as `middleware.ts` produced a build-time deprecation
 * warning, so it was renamed per AGENTS.md's instruction to heed
 * deprecation notices in this Next.js version.
 *
 * Uses Better Auth's documented optimistic cookie-presence check
 * (`getSessionCookie`) rather than `getServerSession()` from
 * `src/lib/auth-server.ts`: proxy still defaults to running close to the
 * edge of the request path with no guaranteed DB access pattern, and this
 * check is a same-request cookie read with no DB round-trip. It only
 * proves a session cookie exists, not that it's still valid -- the actual
 * page/layout is still free to do a real DB-backed check if it needs one.
 *
 * `/login` and `/register` are excluded via the `matcher` config below (as
 * is everything else that must stay reachable without a session), so this
 * function only ever runs for routes that require auth.
 */
export function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request);

  if (shouldRedirectToLogin(cookie)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Runs on every route except:
   * - `/login`, `/register` -- must stay reachable without a session
   *   (excluding them here also avoids a redirect loop with `/login`
   *   itself)
   * - `/api/auth/*` -- Better Auth's own API route (sign-in/sign-up/
   *   sign-out/session endpoints); must never be blocked by this check
   * - `/_next/*` -- Next.js internals (static chunks, HMR, image
   *   optimizer)
   * - common static asset files (favicon, images, etc.)
   */
  matcher: [
    "/((?!login|register|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
