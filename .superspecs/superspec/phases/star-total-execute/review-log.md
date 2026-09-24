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
**Stage 1 — Spec compliance:** PASS on every requirement. Badge shows the correct total, negative values displayed as-is (dedicated test asserting "-3" appears and "0" does not), fresh account shows "0" not blank, loading/error states fall back to "0" without blocking the rest of the header (New Session was actually clicked in the error-state test and confirmed still starts a session — a real functional check, not just a presence assertion), badge updates after a successful flag without reload.

**Independently re-verified live in a real browser, not just trusting the test suite:** registered a real account via `/register`, confirmed the badge showed "⭐ 0" for the brand-new account, flagged a word correct, and watched the badge update to "⭐ 1" immediately with no reload — the exact end-to-end path the task's own "Done When" asked for manual verification of. The subagent had explicitly and honestly flagged that it could not perform this step (no test-account credentials available to it) rather than skipping the disclosure — correctly reported the gap instead of glossing over it, and I closed it directly since email+password registration works fine in this environment (no Google OAuth needed).

**Stage 2 — Code quality:** PASS. Badge placed sensibly (identity block, before the name/email — matches the DISCUSS.md decision of "next to identity"), styled consistently with the header's existing muted/pill conventions, `tabular-nums` is a nice touch to prevent digit-width jitter as the value changes. `displayedStarTotal`'s fallback logic (`starsLoading || starsError || starTotal === undefined ? 0 : starTotal`) is a single, clear, correctly-scoped computation. Test suite updated the shared `beforeEach` with a sensible `useUserStars` default so none of the 39 pre-existing tests needed individual changes — good hygiene, avoids unnecessary diff noise.

**Verdict:** ✅ Approved, no findings. Both the automated suite and a genuine live end-to-end browser check (registration → fresh-account 0 → flag → live update to 1) pass.
