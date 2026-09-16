import { describe, expect, it } from "vitest";
import {
  applyScore,
  createSessionState,
  flagWord,
  isSessionComplete,
  pickNextWord,
  startSession,
  type SessionState,
  type Word,
} from "./session";

function makeWords(count: number): Word[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `w${i}`,
    text: `word${i}`,
    score: 0,
  }));
}

describe("startSession", () => {
  it("returns 24 words when the pool is larger", () => {
    const session = startSession(makeWords(50));
    expect(session).toHaveLength(24);
  });

  it("returns the whole pool when smaller than 24", () => {
    const session = startSession(makeWords(10));
    expect(session).toHaveLength(10);
  });

  it("returns no duplicate words when drawing 24 from a larger bank", () => {
    const session = startSession(makeWords(50));
    const ids = session.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses every word from a bank smaller than 24", () => {
    const words = makeWords(10);
    const session = startSession(words);
    const sessionIds = session.map((w) => w.id).sort();
    const wordIds = words.map((w) => w.id).sort();
    expect(sessionIds).toEqual(wordIds);
  });
});

describe("applyScore", () => {
  it("increments score by 1 when correct", () => {
    const word: Word = { id: "w1", text: "haus", score: 0 };
    expect(applyScore(word, true).score).toBe(1);
  });

  it("decrements score by 1 when incorrect", () => {
    const word: Word = { id: "w1", text: "haus", score: 0 };
    expect(applyScore(word, false).score).toBe(-1);
  });
});

describe("createSessionState", () => {
  it("builds a session state with a pool, no current word, and no flags", () => {
    const state = createSessionState(makeWords(10));
    expect(state.pool).toHaveLength(10);
    expect(state.current).toBeNull();
    expect(state.flagged).toEqual({});
    expect(state.total).toBe(10);
  });
});

describe("pickNextWord", () => {
  it("returns state unchanged (no current word) when the pool is empty", () => {
    const state: SessionState = { pool: [], current: null, flagged: {}, total: 0 };
    const next = pickNextWord(state);
    expect(next.current).toBeNull();
    expect(next.pool).toHaveLength(0);
  });

  it("selects a word from the pool and sets it as current", () => {
    const state = createSessionState(makeWords(5));
    const next = pickNextWord(state);
    expect(next.current).not.toBeNull();
    expect(state.pool.map((w) => w.id)).toContain(next.current?.id);
  });

  it("removes the picked word from the pool so it cannot repeat", () => {
    const state = createSessionState(makeWords(5));
    const next = pickNextWord(state);
    expect(next.pool).toHaveLength(4);
    expect(next.pool.some((w) => w.id === next.current?.id)).toBe(false);
  });
});

describe("flagWord", () => {
  it("flags the current word as correct and clears current", () => {
    const state = createSessionState(makeWords(3));
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const flagged = flagWord(withCurrent, wordId, true);
    expect(flagged.flagged[wordId]).toBe("correct");
    expect(flagged.current).toBeNull();
  });

  it("flags the current word as incorrect", () => {
    const state = createSessionState(makeWords(3));
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const flagged = flagWord(withCurrent, wordId, false);
    expect(flagged.flagged[wordId]).toBe("incorrect");
  });

  it("does not double-apply a flag when the same word is flagged twice", () => {
    const state = createSessionState(makeWords(3));
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const firstFlag = flagWord(withCurrent, wordId, true);
    const secondFlag = flagWord(firstFlag, wordId, false);
    expect(secondFlag.flagged[wordId]).toBe("correct");
    expect(secondFlag).toEqual(firstFlag);
  });

  it("does not change anything when flagging a word that is not current", () => {
    const state = createSessionState(makeWords(3));
    const withCurrent = pickNextWord(state);
    const otherWordId = withCurrent.pool[0].id;
    const result = flagWord(withCurrent, otherWordId, true);
    expect(result).toEqual(withCurrent);
    expect(result.flagged[otherWordId]).toBeUndefined();
  });
});

describe("isSessionComplete", () => {
  it("is false when the pool still has words", () => {
    const state = createSessionState(makeWords(3));
    expect(isSessionComplete(state)).toBe(false);
  });

  it("is false when the pool is empty but a word is still current (unflagged)", () => {
    let state = createSessionState(makeWords(1));
    state = pickNextWord(state);
    expect(state.pool).toHaveLength(0);
    expect(isSessionComplete(state)).toBe(false);
  });

  it("is true only once the pool is empty and every drawn word has been flagged", () => {
    let state = createSessionState(makeWords(2));
    state = pickNextWord(state);
    const firstId = state.current!.id;
    state = flagWord(state, firstId, true);
    expect(isSessionComplete(state)).toBe(false);

    state = pickNextWord(state);
    const secondId = state.current!.id;
    state = flagWord(state, secondId, false);
    expect(isSessionComplete(state)).toBe(true);
  });
});
