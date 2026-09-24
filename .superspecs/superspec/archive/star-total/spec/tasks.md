# Implementation Tasks: Star Total (per-learner point total in the nav)

## Context Window Budget
Estimated spec + task tokens: ~5k / 200k ✅

## Wave 1 — Data Layer & Hook
Single task — the DB query function and its Tanstack Query hook are small enough, and tightly enough coupled, that splitting them across parallel subagents would add coordination overhead without real benefit.

### Task 1.1: Star total data layer, hook, and live-update wiring

**What:** Three small, tightly related pieces:

**(a) Data layer function:** in `src/lib/words.ts`, add a function that computes a learner's total score via SQL `SUM`, e.g. `fetchUserStarTotal(client: DbClient, userId: string): Promise<number>`. Use `SELECT COALESCE(SUM(score), 0) AS total FROM user_word_scores WHERE user_id = :userId` (or equivalent) — the `COALESCE` is required because SQL `SUM` over zero matching rows returns `NULL`, not `0`, and the spec requires a fresh account to show 0. Follow the existing query style already in this file (named `:params`, cast the fake-client's `rows` result).

**(b) Tanstack Query hook:** in `src/hooks/use-words.ts`, add `useUserStars(userId: string)` — a `useQuery` wrapping `fetchUserStarTotal`, with its own query key (e.g. `["user-stars", userId]` or similar — pick a name clearly distinct from `WORDS_QUERY_KEY`, exported as a constant the same way `WORDS_QUERY_KEY` already is, following the established `[...QUERY_KEY, userId]` per-learner-scoping pattern used by `useWords`).

**(c) Live-update wiring:** update `useFlagWord`'s `onSuccess` to also call `queryClient.invalidateQueries` for the new star-total query key (scoped to the same `userId`), alongside its existing `WORDS_QUERY_KEY` invalidation — so a successful flag refreshes both the word bank and the star total.

**Files to create/modify:** `src/lib/words.ts`, `src/hooks/use-words.ts`.

**Test requirement:** Using the existing fake-DB-client pattern (`src/lib/words.test.ts`): a test that a learner with several known score rows gets back the correct sum (including a mix of positive and negative values, to exercise "negative totals" per the spec); a test that a learner with zero rows gets back exactly `0`, not `null`/`NaN`/`undefined`; a test that a different learner's rows are never included in another learner's sum (two learners, verify each gets only their own total). For the hook and invalidation wiring, follow the pattern already established in `src/hooks/use-words.test.tsx` (a real `QueryClient`, only `fetchUserStarTotal`/`getDb` mocked) — a test that `useUserStars`'s query key includes `userId` (two learners never share a cache entry, mirroring the existing `useWords` cache-scoping test); a test that a successful `useFlagWord` mutation invalidates the star-total query key for that learner (e.g. assert `invalidateQueries` was called with a key including the star-total query key and the correct `userId`, or that a subsequent read is marked stale/refetched).

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean.

## Wave 2 — Header Integration
Depends on Wave 1 (needs the hook to exist). Single task — touches `page.tsx`, which every other feature in this project has also treated as a single-task integration point once shared state/UI is involved.

### Task 2.1: Header star badge

**What:** Wire `useUserStars(userId)` into `PracticeScreen` (`src/app/page.tsx`) and render a badge showing the total next to the learner's identity in the header (alongside the existing session-size selector, theme toggle, New Session, identity, and Logout). Show the raw signed value once loaded (e.g. a learner with -3 shows "-3", not "0" or hidden). While the query is loading or has errored, show **"0"** as the fallback value (grilled decision — consistent with how other header/session settings already default to a concrete value rather than a blank state) — the rest of the header (session-size selector, theme toggle, New Session, Logout) SHALL remain fully functional regardless of the badge's fetch state.

**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx` (add new tests, update the existing mocking setup — `page.test.tsx` already mocks `@/hooks/use-words`'s `useWords`/`useFlagWord`; you'll need to add a mock for the new `useUserStars` export too, and set up a sensible default return value in the shared `beforeEach` so existing tests that don't care about the star total don't all need updating individually).

**Test requirement:**
1. Badge shows the learner's current total when the header is inspected (mock `useUserStars` to return a known value, assert it's present in the header).
2. A negative total displays as negative (mock a negative value, assert the actual negative number appears, not "0" or hidden).
3. A fresh account (mock `useUserStars` returning `0`) shows "0", not blank.
4. Flagging a word successfully triggers the same invalidation path already covered by Wave 1's tests — at the `page.tsx` integration level, this can be a lighter test: confirm the component doesn't break/crash when `useFlagWord`'s mutation succeeds and `useUserStars`'s mocked return value subsequently changes (re-render reflects the new mocked total), since the actual invalidation mechanism itself is already covered by Wave 1.
5. When `useUserStars` is in a loading or error state (mock accordingly), the badge shows "0" (the grilled fallback value) and the rest of the header (session-size selector, theme toggle, New Session, Logout) remains present and functional — no crash, no blocking.
6. No regressions to any already-shipped, still-applicable scenario in `page.test.tsx` now that `useUserStars` is mocked alongside the other hooks.

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean. Manually verify in a browser: sign in, confirm the badge shows the correct total (cross-check against a direct DB query if easy to do), flag a word, confirm the badge updates without a reload.

## Done Criteria
The feature is DONE when:
- [ ] Both tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in previously-shipped, still-applicable scenarios
- [ ] `npm run lint` and `npm run build` succeed
- [ ] Manual verification: a real signed-in account shows the correct total, flagging updates it live, a fresh second account shows 0 and stays independent from the first
