import { describe, expect, it } from "vitest";
import {
  createSessionState,
  flagWord,
  isSessionComplete,
  pickNextWord,
  splitByRelativeScore,
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

/** Words with distinct, ascending scores: w0 has the lowest score. */
function makeScoredWords(count: number): Word[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `w${i}`,
    text: `word${i}`,
    score: i,
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

  it("draws every word (weak + rest) with no error or duplicates when the bank is smaller than sessionSize", () => {
    const words = makeScoredWords(10);
    const session = startSession(words, 24);
    expect(session).toHaveLength(10);
    const ids = session.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(words.map((w) => w.id).sort());
  });

  it("draws at least the weak-pool minimum (>=12 of 24) from the bottom half of scores, across many draws", () => {
    const words = makeScoredWords(533);
    const { weak } = splitByRelativeScore(words);
    const weakIds = new Set(weak.map((w) => w.id));
    const weakPoolMinimum = Math.ceil(24 / 2);

    for (let i = 0; i < 75; i++) {
      const session = startSession(words, 24);
      expect(session).toHaveLength(24);
      const ids = session.map((w) => w.id);
      expect(new Set(ids).size).toBe(ids.length);
      const weakCount = ids.filter((id) => weakIds.has(id)).length;
      expect(weakCount).toBeGreaterThanOrEqual(weakPoolMinimum);
    }
  });

  it("does not throw and returns a valid session when every word shares the same score", () => {
    const words = makeWords(100); // all score: 0
    for (let i = 0; i < 20; i++) {
      const session = startSession(words, 24);
      expect(session).toHaveLength(24);
      const ids = session.map((w) => w.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("shuffles the combined weak/rest draw so the two groups are not always laid out as two contiguous blocks", () => {
    const words = makeScoredWords(533);
    const { weak } = splitByRelativeScore(words);
    const weakIds = new Set(weak.map((w) => w.id));

    let sawRestBeforeWeak = false;
    for (let i = 0; i < 75 && !sawRestBeforeWeak; i++) {
      const session = startSession(words, 24);
      const firstWeakIndex = session.findIndex((w) => weakIds.has(w.id));
      const firstRestIndex = session.findIndex((w) => !weakIds.has(w.id));
      if (firstRestIndex !== -1 && firstWeakIndex !== -1 && firstRestIndex < firstWeakIndex) {
        sawRestBeforeWeak = true;
      }
    }
    expect(sawRestBeforeWeak).toBe(true);
  });
});

describe("splitByRelativeScore", () => {
  it("splits an even-sized, distinctly-scored bank exactly in half by score", () => {
    const words = makeScoredWords(100);
    const { weak, rest } = splitByRelativeScore(words);
    expect(weak).toHaveLength(50);
    expect(rest).toHaveLength(50);
    const weakIds = weak.map((w) => w.id).sort();
    const expectedWeakIds = words
      .slice(0, 50)
      .map((w) => w.id)
      .sort();
    expect(weakIds).toEqual(expectedWeakIds);
    const restIds = rest.map((w) => w.id).sort();
    const expectedRestIds = words
      .slice(50)
      .map((w) => w.id)
      .sort();
    expect(restIds).toEqual(expectedRestIds);
  });

  it("rounds the weak pool up on an odd-sized, distinctly-scored bank", () => {
    const words = makeScoredWords(101);
    const { weak, rest } = splitByRelativeScore(words);
    expect(weak).toHaveLength(51);
    expect(rest).toHaveLength(50);
  });

  it("still splits exactly in half (rounded up) when every word is tied at the same score", () => {
    const words = makeWords(100); // all score: 0
    const { weak, rest } = splitByRelativeScore(words);
    expect(weak).toHaveLength(50);
    expect(rest).toHaveLength(50);
    // membership is unconstrained when tied, but every word must appear exactly once total
    const allIds = [...weak, ...rest].map((w) => w.id).sort();
    expect(allIds).toEqual(words.map((w) => w.id).sort());
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
