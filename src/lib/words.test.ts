import { describe, expect, it } from "vitest";
import { adjustScore, fetchWords, flagWord } from "./words";

type FakeArgs = Record<string, unknown> | unknown[];
type FakeStatement = { sql: string; args?: FakeArgs };

/**
 * Fake DB client that tracks real word rows in memory (id/text/score),
 * mirroring the pattern used in scripts/seed-words.test.ts -- asserts on
 * actual data outcomes rather than just recorded SQL calls.
 */
function makeFakeClient(seed: { id: string; text: string; score: number }[] = []) {
  const calls: FakeStatement[] = [];
  const rows = new Map(seed.map((r) => [r.id, { ...r }]));
  return {
    calls,
    rows,
    execute: async (stmt: FakeStatement) => {
      calls.push(stmt);
      if (/^\s*SELECT/i.test(stmt.sql)) {
        const args = stmt.args as { id?: string } | unknown[] | undefined;
        const id = Array.isArray(args) ? (args[0] as string) : args?.id;
        if (id === undefined) {
          // SELECT all
          return {
            rows: Array.from(rows.values()),
            columns: ["id", "text", "score"],
            rowsAffected: 0,
          };
        }
        const row = rows.get(id);
        return {
          rows: row ? [row] : [],
          columns: ["id", "text", "score"],
          rowsAffected: 0,
        };
      }
      if (/^\s*UPDATE/i.test(stmt.sql)) {
        const args = stmt.args as
          | { id?: string; score?: number }
          | unknown[]
          | undefined;
        const id = Array.isArray(args) ? (args[1] as string) : args?.id;
        const score = Array.isArray(args) ? (args[0] as number) : args?.score;
        const row = id !== undefined ? rows.get(id) : undefined;
        if (row && score !== undefined) {
          row.score = score;
        }
        return { rows: [], columns: [], rowsAffected: row ? 1 : 0 };
      }
      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}

/** A fake client whose write (UPDATE) always rejects, to test failure surfacing. */
function makeFailingWriteClient(seed: { id: string; text: string; score: number }[]) {
  const rows = new Map(seed.map((r) => [r.id, { ...r }]));
  return {
    execute: async (stmt: FakeStatement) => {
      if (/^\s*SELECT/i.test(stmt.sql)) {
        const args = stmt.args as { id?: string } | undefined;
        const row = args?.id !== undefined ? rows.get(args.id) : undefined;
        return {
          rows: row ? [row] : [],
          columns: ["id", "text", "score"],
          rowsAffected: 0,
        };
      }
      if (/^\s*UPDATE/i.test(stmt.sql)) {
        throw new Error("network error: write failed");
      }
      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}

describe("adjustScore", () => {
  it("increases the score by 1 when correct", () => {
    expect(adjustScore(5, true)).toBe(6);
  });

  it("decreases the score by 1 when incorrect", () => {
    expect(adjustScore(5, false)).toBe(4);
  });

  it("handles negative scores", () => {
    expect(adjustScore(-3, false)).toBe(-4);
  });
});

describe("fetchWords", () => {
  it("returns all words from the word bank", async () => {
    const client = makeFakeClient([
      { id: "1", text: "Fahrrad", score: 2 },
      { id: "2", text: "Baum", score: -1 },
    ]);

    const words = await fetchWords(client);

    expect(words).toEqual([
      { id: "1", text: "Fahrrad", score: 2 },
      { id: "2", text: "Baum", score: -1 },
    ]);
  });
});

describe("flagWord", () => {
  it("writes the adjusted score to the DB when marked correct", async () => {
    const client = makeFakeClient([{ id: "1", text: "Fahrrad", score: 2 }]);

    const result = await flagWord(client, "1", true);

    expect(result.score).toBe(3);
    expect(client.rows.get("1")?.score).toBe(3);
    const updateCall = client.calls.find((c) => /^\s*UPDATE/i.test(c.sql));
    expect(updateCall).toBeDefined();
  });

  it("writes the adjusted score to the DB when marked incorrect", async () => {
    const client = makeFakeClient([{ id: "1", text: "Fahrrad", score: 2 }]);

    const result = await flagWord(client, "1", false);

    expect(result.score).toBe(1);
    expect(client.rows.get("1")?.score).toBe(1);
  });

  it("surfaces a distinguishable error instead of silently swallowing a failed write", async () => {
    const client = makeFailingWriteClient([{ id: "1", text: "Fahrrad", score: 2 }]);

    await expect(flagWord(client, "1", true)).rejects.toThrow(
      "network error: write failed"
    );
  });
});
