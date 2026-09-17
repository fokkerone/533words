import { describe, expect, it } from "vitest";
import { adjustScore, fetchWords, writeWordFlag } from "./words";

type FakeArgs = Record<string, unknown> | unknown[];
type FakeStatement = { sql: string; args?: FakeArgs };

/**
 * Fake DB client modeling the two-table shape used by the per-learner
 * scoring model: a `words` table (id/text only -- the `score` column has
 * been dropped, see `dropWordsScoreColumn` in `db.ts`) and a
 * `user_word_scores` table keyed by (user_id, word_id). Mirrors the
 * LEFT JOIN + COALESCE fetch and INSERT ... ON CONFLICT DO UPDATE write
 * that `words.ts` actually issues, without a live DB connection.
 */
function makeFakeClient(
  words: { id: string; text: string }[] = [],
  scores: { userId: string; wordId: string; score: number }[] = []
) {
  const calls: FakeStatement[] = [];
  const wordRows = new Map(words.map((w) => [w.id, { ...w }]));
  // key: `${userId}:${wordId}`
  const scoreRows = new Map(scores.map((s) => [`${s.userId}:${s.wordId}`, s.score]));

  function scoreFor(userId: string, wordId: string): number {
    return scoreRows.get(`${userId}:${wordId}`) ?? 0;
  }

  return {
    calls,
    wordRows,
    scoreRows,
    execute: async (stmt: FakeStatement) => {
      calls.push(stmt);
      const args = stmt.args as
        | { userId?: string; wordId?: string; score?: number }
        | undefined;

      if (/^\s*SELECT/i.test(stmt.sql)) {
        if (args?.wordId !== undefined) {
          // Single-word fetch (writeWordFlag's read step)
          const word = wordRows.get(args.wordId);
          if (!word) {
            return { rows: [], columns: [], rowsAffected: 0 };
          }
          return {
            rows: [
              {
                id: word.id,
                text: word.text,
                score: scoreFor(args.userId!, word.id),
              },
            ],
            columns: ["id", "text", "score"],
            rowsAffected: 0,
          };
        }

        // Fetch-all (fetchWords)
        const rows = Array.from(wordRows.values()).map((word) => ({
          id: word.id,
          text: word.text,
          score: scoreFor(args?.userId ?? "", word.id),
        }));
        return { rows, columns: ["id", "text", "score"], rowsAffected: 0 };
      }

      if (/^\s*INSERT INTO user_word_scores/i.test(stmt.sql)) {
        const { userId, wordId, score } = args as {
          userId: string;
          wordId: string;
          score: number;
        };
        const key = `${userId}:${wordId}`;
        const isNewRow = !scoreRows.has(key);
        scoreRows.set(key, score);
        return { rows: [], columns: [], rowsAffected: isNewRow ? 1 : 1 };
      }

      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}

/** A fake client whose write (INSERT/upsert) always rejects, to test failure surfacing. */
function makeFailingWriteClient(words: { id: string; text: string }[]) {
  const wordRows = new Map(words.map((w) => [w.id, { ...w }]));
  return {
    execute: async (stmt: FakeStatement) => {
      if (/^\s*SELECT/i.test(stmt.sql)) {
        const args = stmt.args as { wordId?: string } | undefined;
        const word = args?.wordId !== undefined ? wordRows.get(args.wordId) : undefined;
        return {
          rows: word ? [{ id: word.id, text: word.text, score: 0 }] : [],
          columns: ["id", "text", "score"],
          rowsAffected: 0,
        };
      }
      if (/^\s*INSERT INTO user_word_scores/i.test(stmt.sql)) {
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
  it("returns each word annotated with the given learner's own score", () => {
    const client = makeFakeClient(
      [
        { id: "1", text: "Fahrrad" },
        { id: "2", text: "Baum" },
      ],
      [{ userId: "learner-a", wordId: "1", score: 2 }]
    );

    return fetchWords(client, "learner-a").then((words) => {
      expect(words).toEqual([
        { id: "1", text: "Fahrrad", score: 2 },
        { id: "2", text: "Baum", score: 0 },
      ]);
    });
  });

  it("returns score 0 for a word the learner has never flagged (implicit 0, no error)", async () => {
    const client = makeFakeClient([{ id: "1", text: "Fahrrad" }], []);

    const words = await fetchWords(client, "learner-a");

    expect(words).toEqual([{ id: "1", text: "Fahrrad", score: 0 }]);
  });

  it("keeps two learners' scores for the same word independent", async () => {
    const client = makeFakeClient(
      [{ id: "1", text: "Fahrrad" }],
      [{ userId: "learner-b", wordId: "1", score: 5 }]
    );

    const wordsForA = await fetchWords(client, "learner-a");
    const wordsForB = await fetchWords(client, "learner-b");

    expect(wordsForA).toEqual([{ id: "1", text: "Fahrrad", score: 0 }]);
    expect(wordsForB).toEqual([{ id: "1", text: "Fahrrad", score: 5 }]);
  });
});

describe("writeWordFlag", () => {
  it("creates a new per-learner score row the first time a learner flags a word", async () => {
    const client = makeFakeClient([{ id: "1", text: "Fahrrad" }], []);

    const result = await writeWordFlag(client, "learner-a", "1", true);

    expect(result.score).toBe(1);
    expect(client.scoreRows.get("learner-a:1")).toBe(1);
    expect(client.scoreRows.size).toBe(1);
  });

  it("updates the existing row (no duplicate) the second time the same learner flags the word", async () => {
    const client = makeFakeClient([{ id: "1", text: "Fahrrad" }], []);

    await writeWordFlag(client, "learner-a", "1", true);
    const second = await writeWordFlag(client, "learner-a", "1", true);

    expect(second.score).toBe(2);
    expect(client.scoreRows.get("learner-a:1")).toBe(2);
    // Still exactly one row for this (user, word) pair -- no duplicate created.
    expect(client.scoreRows.size).toBe(1);
  });

  it("writes the adjusted score when marked incorrect", async () => {
    const client = makeFakeClient(
      [{ id: "1", text: "Fahrrad" }],
      [{ userId: "learner-a", wordId: "1", score: 2 }]
    );

    const result = await writeWordFlag(client, "learner-a", "1", false);

    expect(result.score).toBe(1);
    expect(client.scoreRows.get("learner-a:1")).toBe(1);
  });

  it("does not affect a different learner's score for the same word", async () => {
    const client = makeFakeClient(
      [{ id: "1", text: "Fahrrad" }],
      [{ userId: "learner-b", wordId: "1", score: 5 }]
    );

    await writeWordFlag(client, "learner-a", "1", true);

    expect(client.scoreRows.get("learner-a:1")).toBe(1);
    expect(client.scoreRows.get("learner-b:1")).toBe(5);
  });

  it("surfaces a distinguishable error instead of silently swallowing a failed write", async () => {
    const client = makeFailingWriteClient([{ id: "1", text: "Fahrrad" }]);

    await expect(writeWordFlag(client, "learner-a", "1", true)).rejects.toThrow(
      "network error: write failed"
    );
  });

  it("throws when the word itself does not exist", async () => {
    const client = makeFakeClient([], []);

    await expect(writeWordFlag(client, "learner-a", "missing", true)).rejects.toThrow(
      /no word found/
    );
  });
});
