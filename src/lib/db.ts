import { createClient, type Client, type InArgs } from "@libsql/client/web";

/**
 * Minimal shape of the subset of the libSQL client API this module depends
 * on. Lets `initSchema` run against either the real Turso client or a
 * lightweight fake in tests, without pulling in a wire-protocol mock.
 */
export type DbClient = {
  execute: (stmt: { sql: string; args?: InArgs }) => Promise<unknown>;
};

let _db: Client | null = null;

/**
 * Lazily creates (and memoizes) the real Turso client. Deferred so that
 * importing this module never requires Turso env vars to be present (e.g.
 * in tests that only need `initSchema`).
 */
export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.NEXT_PUBLIC_TURSO_DATABASE_URL!,
      authToken: process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN!,
    });
  }
  return _db;
}

/**
 * Creates the word bank schema if it doesn't already exist. Safe to run
 * repeatedly (e.g. on every deploy) since it uses CREATE TABLE IF NOT
 * EXISTS -- running it twice does not error and never produces more than
 * one "words" table.
 */
export async function initSchema(client: DbClient): Promise<void> {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      text TEXT UNIQUE NOT NULL,
      score INTEGER NOT NULL DEFAULT 0
    )`,
  });

  // Per-learner score, replacing the single global `words.score` column
  // (see `dropWordsScoreColumn` below). Composite-keyed on (user_id,
  // word_id) so each learner has at most one score row per word; a
  // learner/word pair with no row is implicitly score 0.
  //
  // `user_id` references Better Auth's `user` table (`user.id`, confirmed
  // `TEXT NOT NULL PRIMARY KEY`), but that table is created separately by
  // `npx @better-auth/cli migrate` (see `src/lib/auth.ts`), not by this
  // function -- so this FK may be declared before the `user` table exists.
  // That's fine: SQLite/libSQL does not validate FK targets at CREATE
  // TABLE time (only -- optionally -- at DML time, gated behind `PRAGMA
  // foreign_keys`, which this app does not enable), so this statement
  // succeeds regardless of whether `initSchema` or the Better Auth
  // migration has run first.
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS user_word_scores (
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, word_id),
      FOREIGN KEY (word_id) REFERENCES words(id),
      FOREIGN KEY (user_id) REFERENCES user(id)
    )`,
  });
}

/**
 * One-time destructive migration: drops the now-meaningless global
 * `words.score` column now that scoring is per-learner
 * (`user_word_scores`). Safe to re-run -- checks `PRAGMA table_info(words)`
 * first and no-ops if the column is already gone, rather than erroring on
 * a second run.
 *
 * Primary approach is `ALTER TABLE ... DROP COLUMN`, which modern
 * SQLite/libSQL (3.35+, which Turso runs) supports. If that ever fails
 * against a libSQL build without DROP COLUMN support, this falls back to
 * clearing the column to 0 -- which also satisfies the spec's "no
 * learner's score reflects the old global value" requirement, just without
 * removing the now-unused column.
 */
export async function dropWordsScoreColumn(client: DbClient): Promise<void> {
  const info = (await client.execute({
    sql: `PRAGMA table_info(words)`,
  })) as { rows: Array<{ name: string }> };

  const hasScoreColumn = info.rows.some((row) => row.name === "score");
  if (!hasScoreColumn) {
    return;
  }

  try {
    await client.execute({
      sql: `ALTER TABLE words DROP COLUMN score`,
    });
  } catch {
    await client.execute({
      sql: `UPDATE words SET score = 0`,
    });
  }
}
