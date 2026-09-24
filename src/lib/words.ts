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

/**
 * Fetches every word in the word bank, each annotated with the given
 * learner's own score for that word (0 if that learner has never flagged
 * it -- the "implicit 0" / lazy-row requirement).
 *
 * LEFT JOINs against `user_word_scores` scoped to `userId` so a word with
 * no score row for this learner still comes back (with score 0 via
 * COALESCE) rather than being silently dropped, and so no other learner's
 * score is ever read.
 */
export async function fetchWords(client: DbClient, userId: string): Promise<Word[]> {
  const result = (await client.execute({
    sql: `SELECT words.id AS id, words.text AS text, COALESCE(user_word_scores.score, 0) AS score
          FROM words
          LEFT JOIN user_word_scores
            ON user_word_scores.word_id = words.id
            AND user_word_scores.user_id = :userId`,
    args: { userId },
  })) as { rows: WordRow[] };

  return result.rows.map((row) => ({
    id: row.id,
    text: row.text,
    score: row.score,
  }));
}

/**
 * Adjusts a learner's per-word score by +1 (correct) or -1 (incorrect) and
 * persists it to `user_word_scores`. Reads the learner's current score for
 * this word first (0 if no row exists yet, via the same LEFT JOIN +
 * COALESCE pattern as `fetchWords`) so the adjustment is relative to what's
 * actually in the DB, then upserts the new score -- creating the row on
 * the learner's first flag of this word, updating it on every subsequent
 * flag, keyed by (user_id, word_id).
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
  userId: string,
  wordId: string,
  correct: boolean
): Promise<Word> {
  const existing = (await client.execute({
    sql: `SELECT words.id AS id, words.text AS text, COALESCE(user_word_scores.score, 0) AS score
          FROM words
          LEFT JOIN user_word_scores
            ON user_word_scores.word_id = words.id
            AND user_word_scores.user_id = :userId
          WHERE words.id = :wordId`,
    args: { userId, wordId },
  })) as { rows: WordRow[] };

  const row = existing.rows[0];
  if (!row) {
    throw new Error(`writeWordFlag: no word found with id "${wordId}"`);
  }

  const newScore = adjustScore(row.score, correct);

  await client.execute({
    sql: `INSERT INTO user_word_scores (user_id, word_id, score)
          VALUES (:userId, :wordId, :score)
          ON CONFLICT (user_id, word_id) DO UPDATE SET score = :score`,
    args: { userId, wordId, score: newScore },
  });

  return { id: row.id, text: row.text, score: newScore };
}

/**
 * Computes a learner's star total: the sum of their `score` across every
 * `user_word_scores` row, scoped to that learner only. `COALESCE` is
 * required because SQL `SUM` over zero matching rows returns `NULL`, not
 * `0` -- a fresh account with no flagged words must report a total of 0,
 * not null/NaN/undefined.
 */
export async function fetchUserStarTotal(client: DbClient, userId: string): Promise<number> {
  const result = (await client.execute({
    sql: `SELECT COALESCE(SUM(score), 0) AS total FROM user_word_scores WHERE user_id = :userId`,
    args: { userId },
  })) as { rows: { total: number }[] };

  return result.rows[0]?.total ?? 0;
}
