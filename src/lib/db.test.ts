import { describe, expect, it } from "vitest";
import { dropWordsScoreColumn, initSchema } from "./db";

type FakeArgs = Record<string, unknown> | unknown[];
type FakeStatement = { sql: string; args?: FakeArgs };

function makeFakeClient() {
  const calls: FakeStatement[] = [];
  return {
    calls,
    execute: async (stmt: FakeStatement) => {
      calls.push(stmt);
      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}

/**
 * Fake client for `dropWordsScoreColumn` tests: simulates `PRAGMA
 * table_info(words)` responses (whether the `score` column is still
 * present) and lets a test force `ALTER TABLE ... DROP COLUMN` to reject,
 * to exercise the clear-to-0 fallback path.
 */
function makeFakeClientWithScoreColumn(options: {
  scoreColumnPresent: boolean;
  dropColumnThrows?: boolean;
}) {
  const calls: FakeStatement[] = [];
  return {
    calls,
    execute: async (stmt: FakeStatement) => {
      calls.push(stmt);

      if (/PRAGMA table_info\(words\)/i.test(stmt.sql)) {
        const columns = [
          { name: "id" },
          { name: "text" },
          ...(options.scoreColumnPresent ? [{ name: "score" }] : []),
        ];
        return { rows: columns, columns: [], rowsAffected: 0 };
      }

      if (/ALTER TABLE words DROP COLUMN score/i.test(stmt.sql) && options.dropColumnThrows) {
        throw new Error("DROP COLUMN not supported by this libSQL build");
      }

      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}

describe("initSchema", () => {
  it("creates the words table using an idempotent CREATE TABLE IF NOT EXISTS statement", async () => {
    const client = makeFakeClient();
    await initSchema(client);

    const createWordsCalls = client.calls.filter((c) =>
      /CREATE TABLE IF NOT EXISTS words/i.test(c.sql)
    );
    expect(createWordsCalls).toHaveLength(1);
  });

  it("running the migration twice does not error and only ever issues one CREATE TABLE for words per run", async () => {
    const client = makeFakeClient();

    await expect(initSchema(client)).resolves.not.toThrow();
    await expect(initSchema(client)).resolves.not.toThrow();

    const createWordsCalls = client.calls.filter((c) =>
      /CREATE TABLE IF NOT EXISTS words/i.test(c.sql)
    );
    // Two runs, each issuing exactly one (idempotent) CREATE TABLE IF NOT
    // EXISTS words statement -- since the statement is idempotent, a real
    // SQLite/Turso DB ends up with exactly one "words" table regardless of
    // how many times this runs.
    expect(createWordsCalls).toHaveLength(2);
    expect(createWordsCalls.every((c) => /IF NOT EXISTS/i.test(c.sql))).toBe(true);
  });

  it("creates the user_word_scores table using an idempotent CREATE TABLE IF NOT EXISTS statement, keyed by user_id + word_id", async () => {
    const client = makeFakeClient();
    await initSchema(client);

    const createUserWordScoresCalls = client.calls.filter((c) =>
      /CREATE TABLE IF NOT EXISTS user_word_scores/i.test(c.sql)
    );
    expect(createUserWordScoresCalls).toHaveLength(1);

    const sql = createUserWordScoresCalls[0].sql;
    expect(sql).toMatch(/user_id TEXT NOT NULL/i);
    expect(sql).toMatch(/word_id TEXT NOT NULL/i);
    expect(sql).toMatch(/score INTEGER NOT NULL DEFAULT 0/i);
    expect(sql).toMatch(/PRIMARY KEY\s*\(\s*user_id\s*,\s*word_id\s*\)/i);
  });

  it("running the full migration twice does not error (idempotency across both tables)", async () => {
    const client = makeFakeClient();

    await expect(initSchema(client)).resolves.not.toThrow();
    await expect(initSchema(client)).resolves.not.toThrow();

    const createUserWordScoresCalls = client.calls.filter((c) =>
      /CREATE TABLE IF NOT EXISTS user_word_scores/i.test(c.sql)
    );
    expect(createUserWordScoresCalls).toHaveLength(2);
    expect(createUserWordScoresCalls.every((c) => /IF NOT EXISTS/i.test(c.sql))).toBe(true);
  });
});

describe("dropWordsScoreColumn", () => {
  it("drops the words.score column when it is still present", async () => {
    const client = makeFakeClientWithScoreColumn({ scoreColumnPresent: true });

    await dropWordsScoreColumn(client);

    const alterCalls = client.calls.filter((c) =>
      /ALTER TABLE words DROP COLUMN score/i.test(c.sql)
    );
    expect(alterCalls).toHaveLength(1);
  });

  it("is a no-op (does not error, does not re-issue ALTER TABLE) when the score column is already absent", async () => {
    const client = makeFakeClientWithScoreColumn({ scoreColumnPresent: false });

    await expect(dropWordsScoreColumn(client)).resolves.not.toThrow();

    const alterCalls = client.calls.filter((c) =>
      /ALTER TABLE words DROP COLUMN score/i.test(c.sql)
    );
    expect(alterCalls).toHaveLength(0);
  });

  it("running it twice in a row does not error (simulates the column already being dropped on the second run)", async () => {
    const client = makeFakeClientWithScoreColumn({ scoreColumnPresent: true });

    await expect(dropWordsScoreColumn(client)).resolves.not.toThrow();

    // Second run against a fake client that now reports the column absent,
    // like the real DB would after the first run's ALTER TABLE succeeded.
    const secondRunClient = makeFakeClientWithScoreColumn({ scoreColumnPresent: false });
    await expect(dropWordsScoreColumn(secondRunClient)).resolves.not.toThrow();
  });

  it("falls back to clearing score to 0 when ALTER TABLE DROP COLUMN is not supported", async () => {
    const client = makeFakeClientWithScoreColumn({
      scoreColumnPresent: true,
      dropColumnThrows: true,
    });

    await expect(dropWordsScoreColumn(client)).resolves.not.toThrow();

    const updateCalls = client.calls.filter((c) =>
      /UPDATE words SET score = 0/i.test(c.sql)
    );
    expect(updateCalls).toHaveLength(1);
  });
});
