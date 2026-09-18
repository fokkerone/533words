import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWords, WORDS_QUERY_KEY } from "./use-words";
import { fetchWords } from "@/lib/words";
import { getDb } from "@/lib/db";

vi.mock("@/lib/words", () => ({
  fetchWords: vi.fn(),
  writeWordFlag: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

const mockedFetchWords = vi.mocked(fetchWords);

/**
 * `useWords`'s cache-scoping guarantee (spec: "Word/Score Data Fetching Is
 * Scoped Per Learner" -- cached data from one learner's session must never
 * be shown to a different learner without a fresh, correctly-scoped fetch)
 * isn't exercised by `page.test.tsx`, which mocks `@/hooks/use-words`
 * entirely. This test uses the real hook against a real QueryClient (only
 * `fetchWords`/`getDb` are mocked) to verify the Tanstack Query cache
 * itself never conflates two learners' data.
 */
describe("useWords cache scoping", () => {
  beforeEach(() => {
    mockedFetchWords.mockReset();
  });

  function wrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  }

  it("includes the learner's ID in the query key, so two learners never share a cache entry", async () => {
    const queryClient = new QueryClient();
    mockedFetchWords.mockImplementation(async (_client, userId: string) => [
      { id: "1", text: "Fahrrad", score: userId === "learner-a" ? 3 : 0 },
    ]);

    const { result: resultA } = renderHook(() => useWords("learner-a"), {
      wrapper: wrapper(queryClient),
    });
    await waitFor(() => expect(resultA.current.isSuccess).toBe(true));

    const { result: resultB } = renderHook(() => useWords("learner-b"), {
      wrapper: wrapper(queryClient),
    });
    await waitFor(() => expect(resultB.current.isSuccess).toBe(true));

    // Learner B's fetch was NOT served from learner A's cache entry --
    // fetchWords was actually called again with learner B's own ID, and
    // each learner's returned data reflects only their own score.
    expect(mockedFetchWords).toHaveBeenCalledWith(getDb(), "learner-a");
    expect(mockedFetchWords).toHaveBeenCalledWith(getDb(), "learner-b");
    expect(resultA.current.data).toEqual([{ id: "1", text: "Fahrrad", score: 3 }]);
    expect(resultB.current.data).toEqual([{ id: "1", text: "Fahrrad", score: 0 }]);

    // The cache holds two distinct entries, keyed by learner ID -- not one
    // shared entry that the second render overwrote or reused.
    const cacheKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(cacheKeys).toContainEqual([...WORDS_QUERY_KEY, "learner-a"]);
    expect(cacheKeys).toContainEqual([...WORDS_QUERY_KEY, "learner-b"]);
  });

  it("re-fetches fresh data for the same learner ID rather than ever needing to invalidate a wrong cache entry", async () => {
    const queryClient = new QueryClient();
    mockedFetchWords.mockResolvedValue([{ id: "1", text: "Baum", score: 1 }]);

    const { result } = renderHook(() => useWords("learner-a"), {
      wrapper: wrapper(queryClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([{ id: "1", text: "Baum", score: 1 }]);
    expect(mockedFetchWords).toHaveBeenCalledTimes(1);
  });
});
