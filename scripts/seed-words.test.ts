import { describe, expect, it } from "vitest";
import { seedWords } from "./seed-words";

type FakeArgs = Record<string, unknown> | unknown[];
type FakeStatement = { sql: string; args?: FakeArgs };

/**
 * Fake DB client that actually tracks inserted rows in memory (a Set of
 * `text` values), so tests can assert on real row counts rather than just
 * on which SQL statements were issued. Mirrors the words table's UNIQUE
 * constraint on `text` by refusing to insert a duplicate.
 */
function makeFakeClient() {
  const calls: FakeStatement[] = [];
  const rows = new Set<string>();
  return {
    calls,
    rows,
    execute: async (stmt: FakeStatement) => {
      calls.push(stmt);
      if (/^\s*SELECT/i.test(stmt.sql)) {
        const args = stmt.args as { text?: string } | unknown[] | undefined;
        const text = Array.isArray(args) ? (args[0] as string) : args?.text;
        const exists = text !== undefined && rows.has(text);
        return {
          rows: exists ? [{ text }] : [],
          columns: ["text"],
          rowsAffected: 0,
        };
      }
      if (/^\s*INSERT/i.test(stmt.sql)) {
        const args = stmt.args as { text?: string } | unknown[] | undefined;
        const text = Array.isArray(args) ? (args[0] as string) : args?.text;
        if (text !== undefined) rows.add(text);
        return { rows: [], columns: [], rowsAffected: 1 };
      }
      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}

describe("seedWords", () => {
  it("inserts every word in a fresh list with a score of zero", async () => {
    const client = makeFakeClient();
    const result = await seedWords(client, ["Fahrrad", "Baum", "Haus"]);

    expect(client.rows.size).toBe(3);
    expect(result.inserted).toBe(3);
    expect(result.skipped).toBe(0);
  });

  it("seeding the same list twice results in exactly 3 rows, not 6", async () => {
    const client = makeFakeClient();
    const words = ["Fahrrad", "Baum", "Haus"];

    await seedWords(client, words);
    const second = await seedWords(client, words);

    expect(client.rows.size).toBe(3);
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(3);
  });

  it("skips only the words that already exist, inserting the rest", async () => {
    const client = makeFakeClient();
    await seedWords(client, ["Fahrrad"]);

    const result = await seedWords(client, ["Fahrrad", "Baum"]);

    expect(client.rows.size).toBe(2);
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
