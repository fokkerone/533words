/**
 * One-off migration script: creates the word bank schema in the real Turso
 * database. Safe to re-run -- uses CREATE TABLE IF NOT EXISTS.
 *
 * Usage: npx tsx scripts/migrate.ts
 * Requires NEXT_PUBLIC_TURSO_DATABASE_URL / NEXT_PUBLIC_TURSO_AUTH_TOKEN to
 * be set in the environment (e.g. via .env.local).
 */
import { getDb, initSchema } from "../src/lib/db";

async function main() {
  await initSchema(getDb());
  console.log("Schema up to date: words table ready.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
