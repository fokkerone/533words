import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/lib/db";
import { fetchWords, writeWordFlag } from "@/lib/words";

export const WORDS_QUERY_KEY = ["words"] as const;

/**
 * Fetches the full word bank via Tanstack Query, for building a session
 * pool, annotated with the given learner's own per-word scores.
 *
 * `userId` is a required parameter (not optional/defaulted) because every
 * score read the app issues must be explicitly scoped to a specific
 * learner -- there is no meaningful "no learner" fetch now that scoring is
 * per-learner rather than global. The query key includes `userId` so
 * Tanstack Query never serves one learner's cached word/score data to a
 * different learner on the same device.
 */
export function useWords(userId: string) {
  return useQuery({
    queryKey: [...WORDS_QUERY_KEY, userId],
    queryFn: () => fetchWords(getDb(), userId),
  });
}

/**
 * Mutation wrapper around `writeWordFlag`: adjusts the given learner's
 * word-bank score by +1/-1 and persists it. A rejected write surfaces via
 * the mutation's `isError`/`error` state rather than being swallowed, so
 * callers can show an error alert and let the learner retry.
 *
 * `userId` is a required parameter for the same reason as in `useWords`:
 * every score write must be explicitly scoped to a specific learner, never
 * implicit or global.
 */
export function useFlagWord(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wordId, correct }: { wordId: string; correct: boolean }) =>
      writeWordFlag(getDb(), userId, wordId, correct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORDS_QUERY_KEY, userId] });
    },
  });
}
