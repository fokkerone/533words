# Implementation Tasks: Weighted Session Selection

## Context Window Budget
Estimated spec + task tokens: ~6k / 200k ✅

## Wave 1 — Weighted Word Selection

Single self-contained task — `startSession` is a pure function with no external dependencies beyond its own module.

### Task 1.1: Rewrite `startSession` to draw at least half its words from the relatively weakest words

**What:**
- In `src/lib/session.ts`, replace `startSession`'s implementation (currently a uniform shuffle-and-slice) with weighted selection:
  1. Sort a copy of `words` by `score` ascending.
  2. Split that sorted list at the halfway point, rounded up (`Math.ceil(words.length / 2)`), into a "weak pool" (the lower half) and everything else (the "rest of the bank," available for the remainder draw).
  3. Compute the weak-pool minimum: `Math.ceil(sessionSize / 2)`.
  4. Draw `Math.min(weakPool.length, weakPoolMinimum)` words at random (no duplicates) from the weak pool.
  5. Draw the remaining slots — `Math.min(sessionSize, words.length) - (words already drawn)` — at random (no duplicates) from all words not yet drawn (this can include leftover weak-pool words not used in step 4, plus the rest of the bank).
  6. Combine both draws into one list and shuffle it (the existing `sort(() => Math.random() - 0.5)` approach is fine to reuse for this final shuffle).
  7. Return that shuffled list.
- Keep `startSession`'s existing external contract unchanged: same signature `(words: Word[], sessionSize: number): Word[]`, same behavior when `words.length <= sessionSize` (returns every word — in this case the "weak pool" / "remainder" split still happens for internal composition, but since every word ends up drawn anyway, the observable result set is unchanged; only enforce the split logic on the more common overflowing case), no duplicate words ever, exactly `min(words.length, sessionSize)` words returned.
- `createSessionState`, `pickNextWord`, `flagWord`, and everything else in `session.ts` are unaffected — do not touch them beyond what `startSession`'s new implementation needs.

**Files to create/modify:** `src/lib/session.ts`, `src/lib/session.test.ts`

**Test requirement:** Write failing tests first, covering every scenario in `spec.md`:
- Even-sized word bank splits evenly: 100 words with 100 distinct scores → the 50 lowest-scored words are exactly the weak pool (verify by checking which word ids can appear vs. can't across many draws, or by directly testing an internal helper if you factor the split logic into one — your choice, as long as the *observable* behavior from `startSession` itself is what's asserted).
- Odd-sized word bank rounds the weak pool up: 101 distinctly-scored words → weak pool has 51 words.
- All words tied at the same score: e.g. 100 words all with `score: 0` → session creation does not throw, and still returns the correct session size with no duplicates (there's no meaningful way to assert an exact split when everything ties, so focus this test on "doesn't crash, still respects size/no-duplicates" rather than exact pool membership).
- Standard session draws the expected weak-pool minimum: with a word bank where the lower half is clearly distinguishable (e.g. 533 words, first 267 sorted have distinctly lower scores than the rest), a session of size 24 drawn many times (run the draw ~50-100 times in a loop within one test, or use a large enough single sample) always includes at least 12 words whose score places them in the lower half. Prefer a statistical/repeated-draw assertion over a single draw, since the remainder draw is random and could coincidentally pull more or fewer weak words on any single run — the guarantee is a *minimum*, so asserting "at least 12" on every one of many repeated draws is the right shape of test.
- Weak pool smaller than the required minimum: construct a small word bank (e.g. 10 words) where only 2 have distinctly low scores forming an unambiguous weak pool smaller than `ceil(sessionSize/2)` for a large `sessionSize` — actually, since weak pool is *always* half the bank by construction (not a fixed threshold), this scenario can only be reached by a tiny bank where `ceil(bankSize/2) < ceil(sessionSize/2)`, e.g. bank of 10 words (weak pool = 5) with `sessionSize` of 24 (minimum = 12). Verify the session still returns `min(10, 24) = 10` words (i.e. the whole bank), no error, no duplicates.
- Remainder can include additional weak-pool words: not independently testable in isolation from the "at least 12" statistical test above — covered by the same repeated-draw test asserting the weak-pool count is `>= 12` (not `=== 12`), which allows (without requiring) it to exceed the minimum.
- Small word bank draws everything available: word bank smaller than `sessionSize` (e.g. `makeWords(10)` with `sessionSize` 24) → returns all 10 words, regardless of scores. (Likely already covered by an existing test — check `session.test.ts`'s current `describe("startSession", ...)` block before adding a new one; extend/adapt rather than duplicate if an equivalent test already exists.)
- The assembled session list is shuffled before use: construct a case where weak-pool and remainder words are identifiable (e.g. by id ranges) and assert that across a session's returned array, the two groups are not simply concatenated in two contiguous blocks (e.g. check that at least one remainder-group id appears before at least one weak-pool-group id in the returned array, or use a similar interleaving check — avoid an assertion so strict it could rarely fail by chance on a correctly-shuffled result; a repeated-draw / statistical check is fine here too).
- No word appears twice in the same session: for every test above that returns a session, also assert `new Set(session.map(w => w.id)).size === session.length` (many existing tests in this file already do this — keep doing it for every new test).

**Also verify:** all pre-existing tests in `describe("startSession", ...)` (session size / duplicate / whole-pool-when-smaller assertions, currently using `makeWords` with all-zero scores) continue to pass unmodified — they exercise `startSession`'s external contract (count, no duplicates, whole-pool-when-smaller), which this task does not change. If any need adjustment because they assumed pure-random behavior in a way that's no longer guaranteed, fix the test to match the new (still count/duplicate-correct) contract rather than changing `startSession`'s behavior to satisfy an outdated assumption.

**Done when:** All new tests pass, all pre-existing tests still pass, `npm run build`/lint clean, no regressions elsewhere in the suite (`page.tsx`/`page.test.tsx` call into `createSessionState`/`startSession` indirectly — a full suite run, not just `session.test.ts`, is required).

## Done Criteria
The feature is DONE when:
- [ ] Task 1.1 complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests
