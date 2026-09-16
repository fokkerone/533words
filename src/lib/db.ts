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
}
