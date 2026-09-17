import { createAuthClient } from "better-auth/react";

/**
 * Better Auth's React client. `baseURL` is omitted -- the client defaults
 * to same-origin requests against `/api/auth/*`, which is correct for both
 * dev and prod since the app and the auth route handler are always served
 * from the same Next.js deployment.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
