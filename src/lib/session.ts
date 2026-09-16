export type Word = {
  id: string;
  text: string;
  score: number;
};

const SESSION_SIZE = 24;

export function startSession(words: Word[]): Word[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SESSION_SIZE);
}

export function pickNextWord(remaining: Word[]): Word | null {
  if (remaining.length === 0) return null;
  const index = Math.floor(Math.random() * remaining.length);
  return remaining[index];
}

export function applyScore(word: Word, correct: boolean): Word {
  return { ...word, score: word.score + (correct ? 1 : -1) };
}
