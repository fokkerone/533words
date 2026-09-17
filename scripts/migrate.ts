/**
 * One-off migration script: creates the word bank schema in the real Turso
 * database. Safe to re-run -- uses CREATE TABLE IF NOT EXISTS, and the
 * words.score column drop below checks for the column's presence before
 * touching it.
 *
 * Usage: npx tsx scripts/migrate.ts
 * Requires NEXT_PUBLIC_TURSO_DATABASE_URL / NEXT_PUBLIC_TURSO_AUTH_TOKEN to
 * be set in the environment (e.g. via .env.local). Independent of whether
 * `npx @better-auth/cli migrate` (see src/lib/auth.ts) has been run yet --
 * order between the two does not matter.
 */
import { dropWordsScoreColumn, getDb, initSchema } from "../src/lib/db";

async function main() {
  const db = getDb();
  await initSchema(db);
  console.log("Schema up to date: words and user_word_scores tables ready.");

  await dropWordsScoreColumn(db);
  console.log(
    "words.score column dropped (or already absent / cleared to 0 as fallback) -- scoring is now per-learner via user_word_scores."
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
