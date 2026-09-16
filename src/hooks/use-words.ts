import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/lib/db";
import { fetchWords, flagWord } from "@/lib/words";

export const WORDS_QUERY_KEY = ["words"] as const;

/** Fetches the full word bank via Tanstack Query, for building a session pool. */
export function useWords() {
  return useQuery({
    queryKey: WORDS_QUERY_KEY,
    queryFn: () => fetchWords(getDb()),
  });
}

/**
 * Mutation wrapper around `flagWord`: adjusts a word's word-bank score by
 * +1/-1 and persists it. A rejected write surfaces via the mutation's
 * `isError`/`error` state rather than being swallowed, so callers can show
 * an error alert and let the learner retry.
 */
export function useFlagWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wordId, correct }: { wordId: string; correct: boolean }) =>
      flagWord(getDb(), wordId, correct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORDS_QUERY_KEY });
    },
  });
}
