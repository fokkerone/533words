import { describe, expect, it } from "vitest";
import { initSchema } from "./db";

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
});
