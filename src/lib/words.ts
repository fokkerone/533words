import type { DbClient } from "./db";
import type { Word } from "./session";

/**
 * Pure score-adjustment rule: +1 on correct, -1 on incorrect. Isolated from
 * any DB access so it can be unit tested without a live connection.
 */
export function adjustScore(currentScore: number, correct: boolean): number {
  return currentScore + (correct ? 1 : -1);
}

type WordRow = { id: string; text: string; score: number };

/** Fetches every word in the word bank, for building a session pool. */
export async function fetchWords(client: DbClient): Promise<Word[]> {
  const result = (await client.execute({
    sql: "SELECT id, text, score FROM words",
  })) as { rows: WordRow[] };

  return result.rows.map((row) => ({
    id: row.id,
    text: row.text,
    score: row.score,
  }));
}

/**
 * Adjusts a word's word-bank score by +1 (correct) or -1 (incorrect) and
 * persists it. Reads the current score first so the adjustment is relative
 * to what's actually in the DB, then writes the new score.
 *
 * Named distinctly from `session.ts`'s `flagWord` (a pure in-memory session
 * state reducer) since both are needed together when wiring up the UI.
 *
 * Deliberately does NOT catch/swallow errors: if either the read or the
 * write rejects (e.g. a network failure), that rejection propagates to the
 * caller so it can surface a distinguishable error state (per the "Score
 * write fails" scenario) instead of failing silently.
 */
export async function writeWordFlag(
  client: DbClient,
  wordId: string,
  correct: boolean
): Promise<Word> {
  const existing = (await client.execute({
    sql: "SELECT id, text, score FROM words WHERE id = :id",
    args: { id: wordId },
  })) as { rows: WordRow[] };

  const row = existing.rows[0];
  if (!row) {
    throw new Error(`writeWordFlag: no word found with id "${wordId}"`);
  }

  const newScore = adjustScore(row.score, correct);

  await client.execute({
    sql: "UPDATE words SET score = :score WHERE id = :id",
    args: { score: newScore, id: wordId },
  });

  return { id: row.id, text: row.text, score: newScore };
}
