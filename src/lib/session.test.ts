import { describe, expect, it } from "vitest";
import { applyScore, pickNextWord, startSession, type Word } from "./session";

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
});

describe("pickNextWord", () => {
  it("returns null when there are no words left", () => {
    expect(pickNextWord([])).toBeNull();
  });

  it("returns one of the remaining words", () => {
    const words = makeWords(5);
    const picked = pickNextWord(words);
    expect(words).toContainEqual(picked);
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
