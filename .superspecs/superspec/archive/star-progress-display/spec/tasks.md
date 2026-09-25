# Implementation Tasks: Star Progress Display

## Context Window Budget
Estimated spec + task tokens: ~5k / 200k ✅

## Wave 1 — Header Star Display + Session Progress

Both tasks touch the same two files (`src/app/page.tsx`, `src/app/page.test.tsx`), so they run sequentially within this single wave, not in parallel.

### Task 1.1: Rescale the header star badge and add the goal-distance / goal-reached message
**What:**
- In `src/app/page.tsx`, find the header star badge (`aria-label='Sterne gesamt'`, currently renders `{displayedStarTotal}` as a raw integer inside a `⭐` span, using the existing 0-fallback for `starsLoading`/`starsError`).
- Change the badge's displayed value to `(displayedStarTotal / 10).toFixed(1)` instead of the raw integer. This includes negative totals (e.g. raw total -53 → badge shows "-5.3") — do not clamp at 0.
- Add a new element directly adjacent to the star badge (inside the same `flex items-center gap-2 border-l border-border pl-2` header group) that shows one of:
  - `Du benötigst noch {(533 - starTotal / 10).toFixed(1)} Sterne` — when a real `starTotal` has loaded and `starTotal / 10 < 533`
  - `Ziel erreicht! 🎉` — when a real `starTotal` has loaded and `starTotal / 10 >= 533`
  - Nothing at all — while `starsLoading` is true, or `starsError` is true, or `starTotal` is `undefined`. **Do not use `displayedStarTotal`'s 0-fallback for this element** — that fallback is specific to the star badge only; this new message must be driven by the real, unfallbacked `starTotal`/`starsLoading`/`starsError` values already destructured from `useUserStars(userId)`.
- Give this new element a class that hides it below the `tablet` breakpoint and shows it at `tablet` and above, following the project's existing `tablet:`/`desktop:` Tailwind variant convention (see `--breakpoint-tablet: 48rem` in `globals.css`) — e.g. `hidden tablet:inline-flex` (or equivalent). The star badge itself keeps no such class; it stays visible at every width.
- Do not add a separate numeric badge for the distance value — it must be embedded in the sentence text itself.
- Keep the existing `aria-label='Sterne gesamt'` on the star badge unchanged; the goal message is plain visible German text, no additional aria-label needed beyond what's naturally readable, and no `aria-live`.

**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx`

**Test requirement:** Write failing tests first, covering:
- The star badge shows a rescaled, one-decimal value (e.g. mock `useUserStars` to return `{ data: 53, isLoading: false, isError: false }`, assert the badge shows "5.3")
- A total of 0 shows "0.0" (not "0")
- A negative total (e.g. raw -53) shows "-5.3" on the badge
- Below the goal, with `starTotal` loaded (e.g. total 53 → rescaled 5.3): the header shows the exact text "Du benötigst noch 527.7 Sterne"
- At the goal (rescaled total exactly 533.0, e.g. raw total 5330, loaded): the header shows "Ziel erreicht! 🎉" and does NOT show any "Du benötigst noch" text
- Above the goal (e.g. raw total 5400 → rescaled 540.0, loaded): the header shows "Ziel erreicht! 🎉" and does NOT show any negative-value text
- While `useUserStars` reports `isLoading: true`: neither the "Du benötigst noch..." text nor "Ziel erreicht! 🎉" is present anywhere in the header, even though the star badge itself still shows its "0.0" fallback
- While `useUserStars` reports `isError: true`: same as the loading case — neither message is present, star badge still shows "0.0"

**Done when:** All new tests pass, `npm run build`/lint clean, no regressions in the existing star-badge tests (update any existing assertions that hardcoded the old raw-integer display format).

### Task 1.2: Add the session-progress indicator above the current word
**What:**
- In `src/app/page.tsx`, inside the section that renders the practice word area (the block currently containing the pre-reveal Play button/`SpeechEqualizer` and the post-reveal word `<p>`), add a compact progress indicator immediately above that block.
- Visible text: `{session.flagOrder.length + 1} / {session.total}` (e.g. "1 / 16" for the first word, "16 / 16" for the last).
- Add a German `aria-label` on this element, e.g. `` `Wort ${session.flagOrder.length + 1} von ${session.total}` ``.
- Render this indicator only when `session?.current` is truthy — the same condition already used to decide whether to show the Play button / revealed word. It must not render:
  - During the loading state (`isLoading` body branch)
  - During the error state (`isError` body branch)
  - When the word bank is empty (`words.length === 0` body branch)
  - In the "Sitzung abgeschlossen" results view (the `complete && session` branch) — there is no current word there.

**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx`

**Test requirement:** Write failing tests first, covering:
- First word of a session (no words flagged yet) shows "1 / 16". **Note on achieving `session.total === 16` in tests:** `session.total` is set by `createSessionState` to `min(words.length, configuredSessionSize)` (see `src/lib/session.ts`). The app's default configured session size is 24 (see `src/lib/session-size-settings.ts`), not 16 — so the simplest way to get a session total of exactly 16 in a test is to supply exactly 16 words via the existing `makeWords(16)` test helper and leave the session-size configuration at its default; do not attempt to mock/change the configured session size just to hit this number.
- After one word has been flagged, the next current word's indicator shows "2 / 16"
- The final word of a 16-word session shows "16 / 16"
- The indicator is visible both before reveal (Play button showing) and after reveal (word text showing) for the same current word
- The indicator is NOT present during the loading state
- The indicator is NOT present during the error state
- The indicator is NOT present when the word bank is empty
- The indicator is NOT present in the completed-session results view

**Done when:** All new tests pass, `npm run build`/lint clean, no regressions in any existing test (including Task 1.1's).

## Done Criteria
The feature is DONE when:
- [ ] Both tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests
- [ ] Manual visual check in a browser (goal-distance text is cleanly hidden below `tablet` width and displays without overflow at `tablet`/`desktop` widths; progress indicator doesn't crowd the hero word display) — your own responsibility, not an automated test, consistent with the manual-verification precedent set in german-ui
