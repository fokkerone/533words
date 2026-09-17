import { describe, expect, it } from "vitest";
import {
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
  it("returns 24 words when the pool is larger and size is 24", () => {
    const session = startSession(makeWords(50), 24);
    expect(session).toHaveLength(24);
  });

  it("returns up to the given size when the pool is larger (size 8)", () => {
    const session = startSession(makeWords(50), 8);
    expect(session).toHaveLength(8);
  });

  it("returns up to the given size when the pool is larger (size 32)", () => {
    const session = startSession(makeWords(50), 32);
    expect(session).toHaveLength(32);
  });

  it("returns the whole pool when smaller than 24", () => {
    const session = startSession(makeWords(10), 24);
    expect(session).toHaveLength(10);
  });

  it("returns the whole pool when smaller than a non-24 size", () => {
    const session = startSession(makeWords(5), 32);
    expect(session).toHaveLength(5);
  });

  it("returns no duplicate words when drawing 24 from a larger bank", () => {
    const session = startSession(makeWords(50), 24);
    const ids = session.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns no duplicate words when drawing 8 from a larger bank", () => {
    const session = startSession(makeWords(50), 8);
    const ids = session.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses every word from a bank smaller than 24", () => {
    const words = makeWords(10);
    const session = startSession(words, 24);
    const sessionIds = session.map((w) => w.id).sort();
    const wordIds = words.map((w) => w.id).sort();
    expect(sessionIds).toEqual(wordIds);
  });

  it("uses every word from a bank smaller than a non-24 size", () => {
    const words = makeWords(5);
    const session = startSession(words, 32);
    const sessionIds = session.map((w) => w.id).sort();
    const wordIds = words.map((w) => w.id).sort();
    expect(sessionIds).toEqual(wordIds);
  });
});

describe("createSessionState", () => {
  it("builds a session state with a pool, no current word, and no flags", () => {
    const state = createSessionState(makeWords(10), 24);
    expect(state.pool).toHaveLength(10);
    expect(state.current).toBeNull();
    expect(state.flagged).toEqual({});
    expect(state.flagOrder).toEqual([]);
    expect(state.total).toBe(10);
  });

  it("draws up to the given size (8) when the bank is larger", () => {
    const state = createSessionState(makeWords(50), 8);
    expect(state.pool).toHaveLength(8);
    expect(state.total).toBe(8);
  });

  it("draws up to the given size (32) when the bank is larger", () => {
    const state = createSessionState(makeWords(50), 32);
    expect(state.pool).toHaveLength(32);
    expect(state.total).toBe(32);
  });
});

describe("pickNextWord", () => {
  it("returns state unchanged (no current word) when the pool is empty", () => {
    const state: SessionState = {
      pool: [],
      current: null,
      flagged: {},
      flagOrder: [],
      total: 0,
    };
    const next = pickNextWord(state);
    expect(next.current).toBeNull();
    expect(next.pool).toHaveLength(0);
  });

  it("selects a word from the pool and sets it as current", () => {
    const state = createSessionState(makeWords(5), 24);
    const next = pickNextWord(state);
    expect(next.current).not.toBeNull();
    expect(state.pool.map((w) => w.id)).toContain(next.current?.id);
  });

  it("removes the picked word from the pool so it cannot repeat", () => {
    const state = createSessionState(makeWords(5), 24);
    const next = pickNextWord(state);
    expect(next.pool).toHaveLength(4);
    expect(next.pool.some((w) => w.id === next.current?.id)).toBe(false);
  });
});

describe("flagWord", () => {
  it("flags the current word as correct and clears current", () => {
    const state = createSessionState(makeWords(3), 24);
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const flagged = flagWord(withCurrent, wordId, true);
    expect(flagged.flagged[wordId]).toBe("correct");
    expect(flagged.current).toBeNull();
  });

  it("flags the current word as incorrect", () => {
    const state = createSessionState(makeWords(3), 24);
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const flagged = flagWord(withCurrent, wordId, false);
    expect(flagged.flagged[wordId]).toBe("incorrect");
  });

  it("does not double-apply a flag when the same word is flagged twice", () => {
    const state = createSessionState(makeWords(3), 24);
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const firstFlag = flagWord(withCurrent, wordId, true);
    const secondFlag = flagWord(firstFlag, wordId, false);
    expect(secondFlag.flagged[wordId]).toBe("correct");
    expect(secondFlag).toEqual(firstFlag);
  });

  it("does not append to flagOrder when the same word is flagged twice", () => {
    const state = createSessionState(makeWords(3), 24);
    const withCurrent = pickNextWord(state);
    const wordId = withCurrent.current!.id;
    const firstFlag = flagWord(withCurrent, wordId, true);
    const secondFlag = flagWord(firstFlag, wordId, false);
    expect(secondFlag.flagOrder).toEqual([wordId]);
  });

  it("does not change anything when flagging a word that is not current", () => {
    const state = createSessionState(makeWords(3), 24);
    const withCurrent = pickNextWord(state);
    const otherWordId = withCurrent.pool[0].id;
    const result = flagWord(withCurrent, otherWordId, true);
    expect(result).toEqual(withCurrent);
    expect(result.flagged[otherWordId]).toBeUndefined();
  });

  it("does not append to flagOrder when flagging a word that is not current", () => {
    const state = createSessionState(makeWords(3), 24);
    const withCurrent = pickNextWord(state);
    const otherWordId = withCurrent.pool[0].id;
    const result = flagWord(withCurrent, otherWordId, true);
    expect(result.flagOrder).toEqual(withCurrent.flagOrder);
    expect(result.flagOrder).toEqual([]);
  });

  it("records flagOrder in exactly the sequence words were flagged", () => {
    let state = createSessionState(makeWords(4), 24);

    state = pickNextWord(state);
    const firstId = state.current!.id;
    state = flagWord(state, firstId, true);

    state = pickNextWord(state);
    const secondId = state.current!.id;
    state = flagWord(state, secondId, false);

    state = pickNextWord(state);
    const thirdId = state.current!.id;
    state = flagWord(state, thirdId, true);

    expect(state.flagOrder).toEqual([firstId, secondId, thirdId]);
  });

  it("does not reorder or lose entries when a no-op flag is attempted mid-sequence", () => {
    let state = createSessionState(makeWords(4), 24);

    state = pickNextWord(state);
    const firstId = state.current!.id;
    state = flagWord(state, firstId, true);

    // no-op: word already flagged
    state = flagWord(state, firstId, false);

    state = pickNextWord(state);
    const secondId = state.current!.id;

    // no-op: not the current word
    const notCurrentId = state.pool[0]?.id ?? "nonexistent";
    state = flagWord(state, notCurrentId, true);

    state = flagWord(state, secondId, true);

    expect(state.flagOrder).toEqual([firstId, secondId]);
    expect(state.flagged[firstId]).toBe("correct");
    expect(state.flagged[secondId]).toBe("correct");
  });
});

describe("isSessionComplete", () => {
  it("is false when the pool still has words", () => {
    const state = createSessionState(makeWords(3), 24);
    expect(isSessionComplete(state)).toBe(false);
  });

  it("is false when the pool is empty but a word is still current (unflagged)", () => {
    let state = createSessionState(makeWords(1), 24);
    state = pickNextWord(state);
    expect(state.pool).toHaveLength(0);
    expect(isSessionComplete(state)).toBe(false);
  });

  it("is true only once the pool is empty and every drawn word has been flagged", () => {
    let state = createSessionState(makeWords(2), 24);
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
