# Implementation Tasks: Weighted Session Selection

## Context Window Budget
Estimated spec + task tokens: ~6k / 200k ✅

## Wave 1 — Weighted Word Selection

Single self-contained task — `startSession` is a pure function with no external dependencies beyond its own module.

### Task 1.1: Rewrite `startSession` to draw at least half its words from the relatively weakest words

**What:**
- In `src/lib/session.ts`, add a new **exported** pure helper function that performs the weak/rest split — deterministic, no randomness, directly unit-testable on its own:
  ```ts
  export function splitByRelativeScore(words: Word[]): { weak: Word[]; rest: Word[] } {
    const sorted = [...words].sort((a, b) => a.score - b.score);
    const weakCount = Math.ceil(sorted.length / 2);
    return { weak: sorted.slice(0, weakCount), rest: sorted.slice(weakCount) };
  }
  ```
  (Exact naming/shape can differ slightly if you find something cleaner, but it must be exported and independently testable — this is the grilled decision: pull the split logic out of `startSession` so it can be asserted deterministically, e.g. "given these exact words with these exact scores, `weak` contains exactly these ids," rather than only observable through repeated random draws of the full `startSession` output.)
- Replace `startSession`'s implementation (currently a uniform shuffle-and-slice) with weighted selection built on top of `splitByRelativeScore`:
  1. `const { weak, rest } = splitByRelativeScore(words);`
  2. Compute the weak-pool minimum: `Math.ceil(sessionSize / 2)`.
  3. Draw `Math.min(weak.length, weakPoolMinimum)` words at random (no duplicates) from `weak`.
  4. Draw the remaining slots — `Math.min(sessionSize, words.length) - (words already drawn)` — at random (no duplicates) from all words not yet drawn (this can include leftover `weak` words not used in step 3, plus all of `rest`).
  5. Combine both draws into one list and shuffle it (the existing `sort(() => Math.random() - 0.5)` approach is fine to reuse for this final shuffle).
  6. Return that shuffled list.
- Keep `startSession`'s existing external contract unchanged: same signature `(words: Word[], sessionSize: number): Word[]`, same behavior when `words.length <= sessionSize` (returns every word), no duplicate words ever, exactly `min(words.length, sessionSize)` words returned.
- `createSessionState`, `pickNextWord`, `flagWord`, and everything else in `session.ts` are unaffected — do not touch them beyond what `startSession`'s new implementation needs.

**Files to create/modify:** `src/lib/session.ts`, `src/lib/session.test.ts`

**Test requirement:** Write failing tests first, covering every scenario in `spec.md`. Prefer deterministic assertions on `splitByRelativeScore` directly wherever a scenario is fundamentally about the split (not about the randomized draw), per the grilled decision to make this logic independently testable:
- Even-sized word bank splits evenly: `splitByRelativeScore` called directly with 100 words with 100 distinct scores → `weak` is exactly the 50 lowest-scored word ids (assert the exact set, e.g. via sorted id comparison), `rest` is exactly the other 50. Fully deterministic — no repeated draws needed.
- Odd-sized word bank rounds the weak pool up: `splitByRelativeScore` with 101 distinctly-scored words → `weak.length === 51`, `rest.length === 50`.
- All words tied at the same score: `splitByRelativeScore` with 100 words all `score: 0` → `weak.length === 50` and `rest.length === 50` regardless of which specific words land in each (don't assert exact membership, just the counts) — and separately, `startSession`/`createSessionState` with the same tied-score word bank does not throw and still returns the correct session size with no duplicates.
- Standard session draws the expected weak-pool minimum: this scenario is about `startSession`'s randomized draw, so a deterministic single-call assertion isn't possible — use a repeated-draw test here specifically (not for the split itself, which is already covered deterministically above). With a word bank where the lower half is clearly distinguishable by score (e.g. 533 words, distinct scores), call `startSession(words, 24)` many times (~50-100 iterations in one test) and assert every single result includes at least 12 words whose score places them in the bottom half of the *original* bank's score ranking (compute the expected weak-pool id set once via `splitByRelativeScore`, then check overlap count on each draw).
- Small word bank — weak pool can't fill the minimum (merged scenario, per grill): a word bank smaller than `sessionSize` (e.g. `makeWords(10)` with distinct scores, `sessionSize` 24) → `startSession` returns all 10 words (every word in the bank, weak and rest combined), no error, no duplicates. Check `session.test.ts`'s existing `describe("startSession", ...)` block first — a version of this "smaller bank" case likely already exists; extend/adapt it rather than duplicating.
- Remainder can include additional weak-pool words: covered by the same repeated-draw test above asserting the weak-pool overlap count is `>= 12` (not `=== 12`), which allows without requiring it to exceed the minimum on any given draw.
- The assembled session list is shuffled before use: construct a word bank where weak-pool and rest-pool ids are easily distinguishable (e.g. id ranges), call `startSession` many times (~50-100 iterations), and assert that across those draws the two groups are not always laid out as two contiguous blocks (e.g. assert that in at least some draws, a rest-pool id appears before a weak-pool id in the returned array) — avoid an assertion so strict a correctly-shuffled result could fail by chance.
- No word appears twice in the same session: for every test above that calls `startSession`/`createSessionState`, also assert `new Set(session.map(w => w.id)).size === session.length` (existing tests in this file already do this — keep doing it for every new test).

**Also verify:** all pre-existing tests in `describe("startSession", ...)` (session size / duplicate / whole-pool-when-smaller assertions, currently using `makeWords` with all-zero scores) continue to pass unmodified — they exercise `startSession`'s external contract (count, no duplicates, whole-pool-when-smaller), which this task does not change. If any need adjustment because they assumed pure-random behavior in a way that's no longer guaranteed, fix the test to match the new (still count/duplicate-correct) contract rather than changing `startSession`'s behavior to satisfy an outdated assumption.

**Done when:** All new tests pass, all pre-existing tests still pass, `npm run build`/lint clean, no regressions elsewhere in the suite (`page.tsx`/`page.test.tsx` call into `createSessionState`/`startSession` indirectly — a full suite run, not just `session.test.ts`, is required).

## Done Criteria
The feature is DONE when:
- [ ] Task 1.1 complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests
