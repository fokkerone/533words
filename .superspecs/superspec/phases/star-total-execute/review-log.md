# Review Log: Star Total (per-learner point total in the nav)

Populated during execution — one entry per task review.

## Wave 1

### Task 1.1: Star total data layer, hook, and live-update wiring
**Stage 1 — Spec compliance:** PASS on every requirement this task covers. `fetchUserStarTotal`'s `SELECT COALESCE(SUM(score), 0) AS total ... WHERE user_id = :userId` satisfies "Star Total Query" exactly — verified by a dedicated test with mixed positive/negative scores (sum = 4, not just all-positive), a zero-rows test asserting `0` and `not.toBeNaN()`, and a two-learner isolation test. `STAR_TOTAL_QUERY_KEY = ["user-stars"]` is distinct from `WORDS_QUERY_KEY`, scoped by `userId` the same way `useWords` already is — satisfies "Star Total Is Scoped Per Learner."

**Live-update wiring — genuinely verified, not just compiled:** `useFlagWord`'s `onSuccess` now invalidates both query keys. Critically, the test doesn't just assert the code path exists — it spies on the real `QueryClient.invalidateQueries`, runs an actual mutation against a real `QueryClient` (only `writeWordFlag`/`getDb` mocked), and asserts the exact call arguments including the correct `userId`. This is meaningfully stronger evidence than a compile-check and directly satisfies "Live Update After Flagging."

**Correctly out of scope, correctly left alone:** no changes to `writeWordFlag`'s actual write behavior — only the caller's invalidation list gained one entry, exactly as spec'd. No new DB schema, no new table — confirms the grilled "compute on read" decision was followed, not silently reverted to a cached-table approach.

**Stage 2 — Code quality:** PASS. New `makeStarTotalClient` fake is appropriately separate from the existing `makeFakeClient` (models a flat `SUM`-style query rather than the two-table join `fetchWords`/`writeWordFlag` need) — correct choice rather than forcing one fake to serve two different query shapes. Doc comments on both `fetchUserStarTotal` and `useUserStars` clearly explain the `COALESCE` necessity and the "genuinely separate from `useWords`" design decision, matching the spec's own reasoning.

**Verdict:** ✅ Approved, no findings.

## Wave 2

### Task 2.1: Header star badge
_Pending_
