import { betterAuth } from "better-auth";
import { LibsqlDialect } from "@libsql/kysely-libsql";

/**
 * Better Auth's server instance.
 *
 * Database: reuses the same Turso/libSQL database and env vars as the
 * app's own word-bank data (see `src/lib/db.ts`) -- no second database is
 * provisioned. Better Auth talks to it through Kysely's libSQL dialect
 * (`@libsql/kysely-libsql`), since Better Auth has no first-class "Turso
 * adapter" -- per the current Better Auth docs
 * (better-auth.com/docs/adapters/other-relational-databases), any
 * Kysely-supported dialect can be passed via the `database` option as a
 * Kysely instance.
 *
 * Auth tables (user/session/account/verification) are created by running
 * `npx @better-auth/cli migrate` against this same database (see
 * package.json's `auth:migrate` script) -- not by `src/lib/db.ts`'s
 * `initSchema`, which only owns the `words` table.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: {
    dialect: new LibsqlDialect({
      url: process.env.NEXT_PUBLIC_TURSO_DATABASE_URL!,
      authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN!,
    }),
    type: "sqlite",
  },
  emailAndPassword: {
    enabled: true,
    // No verification step and no reset flow in this pass (see spec:
    // Non-Functional Requirements) -- both left at their disabled default.
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
