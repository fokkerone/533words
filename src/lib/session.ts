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
  /** Total number of words drawn into this session (pool size at start). */
  total: number;
};

const SESSION_SIZE = 24;

/**
 * Draws up to SESSION_SIZE unique words from the given word list, in
 * shuffled order, with no word appearing more than once.
 */
export function startSession(words: Word[]): Word[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SESSION_SIZE);
}

/** Builds a fresh session state from a word list. */
export function createSessionState(words: Word[]): SessionState {
  const pool = startSession(words);
  return { pool, current: null, flagged: {}, total: pool.length };
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
