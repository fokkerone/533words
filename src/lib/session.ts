export type Word = {
  id: string;
  text: string;
  score: number;
};

export type FlagValue = "correct" | "incorrect";

export type SessionState = {
  /** Words remaining in the session, not yet presented. */
  pool: Word[];
  /** The word currently selected/presented, or null if none is selected. */
  current: Word | null;
  /** Map of word id -> how it was flagged. */
  flagged: Record<string, FlagValue>;
  /** Word ids in the exact order they were flagged. */
  flagOrder: string[];
  /** Total number of words drawn into this session (pool size at start). */
  total: number;
};

/**
 * Splits the word bank into a "weak" pool (the lower half of the bank
 * ranked by the learner's own score, ascending, rounded up on odd
 * counts) and a "rest" pool (everything else). Relative to the current
 * bank and learner — not a fixed score threshold. Pure and
 * deterministic: no randomness, no mutation of the input array.
 */
export function splitByRelativeScore(words: Word[]): { weak: Word[]; rest: Word[] } {
  const sorted = [...words].sort((a, b) => a.score - b.score);
  const weakCount = Math.ceil(sorted.length / 2);
  return { weak: sorted.slice(0, weakCount), rest: sorted.slice(weakCount) };
}

/** Draws `count` unique random words from `words` (no duplicates, no mutation). */
function drawRandom(words: Word[], count: number): Word[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Draws up to sessionSize unique words from the given word list, in
 * shuffled order, with no word appearing more than once. If the word
 * list has fewer than sessionSize words, every word is used.
 *
 * At least ceil(sessionSize / 2) of the drawn words come from the
 * "weak pool" (the learner's relatively lowest-scored half of the
 * bank), provided the weak pool has enough words to fill that
 * minimum. The remaining slots are drawn at random from all words not
 * already drawn (weak or rest), and the combined result is shuffled.
 */
export function startSession(words: Word[], sessionSize: number): Word[] {
  const { weak, rest } = splitByRelativeScore(words);
  const weakPoolMinimum = Math.ceil(sessionSize / 2);

  const weakDrawCount = Math.min(weak.length, weakPoolMinimum);
  const weakDraw = drawRandom(weak, weakDrawCount);
  const weakDrawIds = new Set(weakDraw.map((w) => w.id));

  const remaining = [...weak.filter((w) => !weakDrawIds.has(w.id)), ...rest];
  const targetTotal = Math.min(sessionSize, words.length);
  const remainderCount = Math.max(0, targetTotal - weakDraw.length);
  const remainderDraw = drawRandom(remaining, remainderCount);

  const combined = [...weakDraw, ...remainderDraw];
  return combined.sort(() => Math.random() - 0.5);
}

/** Builds a fresh session state from a word list, drawing up to sessionSize words. */
export function createSessionState(words: Word[], sessionSize: number): SessionState {
  const pool = startSession(words, sessionSize);
  return { pool, current: null, flagged: {}, flagOrder: [], total: pool.length };
}

/**
 * Selects one word from the pool without replacement, removing it from
 * the pool and setting it as the current word. If the pool is empty,
 * returns the state unchanged (current stays null).
 */
export function pickNextWord(state: SessionState): SessionState {
  if (state.pool.length === 0) {
    return { ...state, current: null };
  }
  const index = Math.floor(Math.random() * state.pool.length);
  const word = state.pool[index];
  const newPool = [...state.pool.slice(0, index), ...state.pool.slice(index + 1)];
  return { ...state, pool: newPool, current: word };
}

/**
 * Flags the currently selected word as correct or incorrect. No-op
 * (returns the state unchanged) if the targeted word is not the current
 * word, or if it has already been flagged in this session.
 */
export function flagWord(state: SessionState, wordId: string, correct: boolean): SessionState {
  if (!state.current || state.current.id !== wordId) {
    return state;
  }
  if (Object.prototype.hasOwnProperty.call(state.flagged, wordId)) {
    return state;
  }
  return {
    ...state,
    current: null,
    flagged: { ...state.flagged, [wordId]: correct ? "correct" : "incorrect" },
    flagOrder: [...state.flagOrder, wordId],
  };
}

/**
 * A session is complete only when its pool is empty and every word
 * originally drawn into the session has been flagged.
 */
export function isSessionComplete(state: SessionState): boolean {
  return (
    state.pool.length === 0 &&
    state.current === null &&
    Object.keys(state.flagged).length === state.total
  );
}
