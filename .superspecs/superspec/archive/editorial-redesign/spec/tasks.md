# Implementation Tasks: Editorial Redesign (Exaggerated Minimalism)

## Context Window Budget
Estimated spec + task tokens: ~9k / 200k ✅

## Wave 1 — Foundation
Two tasks, independent files, run in parallel.

### Task 1.1: Design tokens, font, and breakpoints (light + dark)
**What:** Replace the current shadcn "Nova"/Geist setup with the new design system:
- Load Inter via `next/font/google` in `src/app/layout.tsx`, replacing `Geist`/`Geist_Mono` entirely (remove both, remove their CSS variables). Cover a weight range from at least 400 through 900 (the hero word needs a very heavy weight; body/UI text needs regular/medium weights).
- Rewrite `src/app/globals.css`'s `:root` (light theme) color tokens to a near-monochrome palette (black/white/grey `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--border`, `--input`, `--ring`, etc.) plus exactly one non-neutral accent color (a vermillion, in the `#E3422C`–`#E8452C` range — pick one exact value) used consistently for `--accent` AND `--destructive` (both point at the same non-neutral value — do not keep a separate distinct red for destructive). Match the reference image's specific light-grey background tone (sample it, don't default to pure white) — the reference is at `ideas/idee1.webp`, open/view it yourself before picking values.
- Rewrite the existing `.dark { ... }` block (do not delete it) to a dark-theme version of the same palette: inverted background/foreground (dark background, light foreground), and an accent color adjusted for adequate contrast on dark (does not have to be the identical hex value as the light theme's accent, per the spec's Dark/Light Theme Toggle requirement — pick a value that reads well on your chosen dark background, still recognizably the same vermillion hue). Same rule applies: `--accent` and `--destructive` point at the same dark-theme accent value.
- Define whatever Tailwind/CSS mechanism you judge cleanest for the three fluid breakpoint tiers (mobile/tablet/desktop) plus a fixed-width ceiling above desktop (e.g. Tailwind's default `md`/`lg`/`xl` breakpoints plus a `container`-style max-width utility, or custom `@theme` breakpoint tokens in `globals.css` — Tailwind v4's `@theme` directive is available, this project already uses it). Document your chosen pixel values in a code comment since the spec intentionally left exact values to implementation judgment.
- Do NOT wire up the actual toggle mechanism (which class/attribute switches themes, e.g. Tailwind's existing `@custom-variant dark (&:is(.dark *))` convention already in `globals.css`) beyond making sure the `.dark` selector's tokens are correct — Task 2.1 wires the toggle button and the class-switching logic on `<html>`.

**Files to create/modify:** `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.*` (if this project has one — check; Tailwind v4 often configures via `@theme` in CSS instead) — do not create a `tailwind.config` file if one doesn't already exist, prefer the `@theme` CSS approach already in use.

**Test requirement:** This is a visual/configuration change with no meaningful unit-testable behavior (colors, fonts, and breakpoints aren't something Vitest/jsdom can verify meaningfully). No new test file is required for this task. Verification is: `npm run build` succeeds (this will catch e.g. an invalid font config), `npm run lint` is clean, and a manual visual check (see Done When) — this mirrors how this project has already treated prior visual-only changes.

**Done when:** `npm run build` succeeds, `npm run lint` is clean, no regressions in the existing test suite (`npm run test` still fully green — this task shouldn't break any existing test, since it's CSS/font config only, not component logic). Start the dev server and visually confirm in a browser: Inter is applied, the background/foreground read as the new monochrome-plus-accent palette (not the old Nova/Geist look) in light mode, and manually toggling `.dark` on `<html>` via devtools shows a sensible inverted dark palette too, even though no UI button exists yet to do this (that's Task 2.1). Nothing else needs to be visually correct yet (Wave 2 hasn't restructured the layout).

### Task 1.2: Theme persistence
**What:** A small module for getting/saving the learner's chosen theme (`"light"` or `"dark"`), following the exact established pattern of `src/lib/session-size-settings.ts` / `src/lib/voice-settings.ts` (a dedicated localStorage key, never-throw save/load). Default is `"light"` when nothing is stored (per spec: first-ever use defaults to light, NOT the system's `prefers-color-scheme` — do not read `matchMedia` in this module at all).

Design:
```ts
const THEME_KEY = "533words:theme";  // or similar dedicated key
export type Theme = "light" | "dark";
export function saveTheme(theme: Theme): void { ... }
export function loadTheme(): Theme { ... }
```

**Files to create/modify:** `src/lib/theme-settings.ts` (new)

**Test requirement:** Tests for: save-then-load round-trips a value (`"dark"` in, `"dark"` out); loading with nothing stored returns `"light"`; loading a corrupt/invalid stored value (anything other than exactly `"light"` or `"dark"`) returns `"light"` instead of throwing.

**Done when:** All tests pass, no regressions.

## Wave 2 — Integration
Depends on both Wave 1 tasks (needs the new tokens/font and the theme-persistence module to build against). Single task — the layout restructuring, the auto-advance behavior, and the theme toggle all live in `src/app/page.tsx`/`src/app/layout.tsx`, so splitting them across parallel subagents would create merge conflicts on the same files.

### Task 2.1: Layout restructure, auto-advance behavior, and theme toggle
**What:** Three things, in `src/app/page.tsx`/`src/app/layout.tsx` (and `src/app/page.test.tsx`):

**(a) Auto-advance behavior (the one real logic change — TDD this part rigorously):** In `handleFlag`, after a successful `flagMutation.mutateAsync` call and the local `flagWord`/`saveSession` update (exactly as today), chain a call to the existing next-word logic (`pickNextWord` + `speak(...)`, the same logic currently in `handleNextWord`) — but only if the session isn't now complete (check `isSessionComplete` on the post-flag state first; if complete, do NOT pick/speak a next word, just let the completion UI show, per the spec's "Flagging the last word completes the session instead of advancing" scenario). Remove the standalone `handleNextWord` function and its "Next Word" `Button` entirely — there is no next-word control anywhere in the new UI. A failed flag (the existing catch block) must NOT trigger auto-advance — verify this is naturally true given the ordering (auto-advance only happens after the success path).

**(b) Layout restructure (visual/structural — read `ideas/idee1.webp` yourself for the reference composition, and Task 1.1's chosen tokens/breakpoints):**
- Remove the current centered `Card`/`CardHeader`/`CardContent`/`CardFooter` bounded-width wrapper. Build a fullscreen layout instead: a header region, a hero display region, and a navigation region, stacked vertically, each spanning the fluid width (capped at a fixed max-width above the desktop breakpoint, centered).
- **Header region:** brand text ("533words") on one side; the session-size `Select`, a theme-toggle `Button`, and the "New Session" `Button` on the other side. Always rendered, in every session state (no session / active / complete) — reuse the existing `Select`/`Button` components, just relocate and restyle them.

**(c) Theme toggle:** Add theme state to `page.tsx` (lazy `useState` initialized from `loadTheme()`, same pattern as `rate`/`selectedVoiceURI`/`sessionSize`). On mount (a regular `useEffect` is fine — a brief flash of the light theme before the effect applies a persisted dark preference is an accepted, known rough edge for this spec, not something to solve with a pre-hydration inline script), apply the theme by adding/removing the `dark` class on `document.documentElement` (matching `globals.css`'s existing `@custom-variant dark (&:is(.dark *))` convention from Task 1.1). Toggling the theme button flips the state, persists via `saveTheme`, and updates the `dark` class accordingly.
- **Hero display region:** shows the Play `Button` (large, centered both horizontally and vertically in this region) when there's a current word that hasn't been revealed yet; shows the word's text (large, fluid `clamp()`-sized typography per Task 1.1's tokens) when revealed — these two are mutually exclusive, never both shown. Also contains the existing Speed `Slider` and Voice `Select` as a compact control bar, positioned at the bottom of this same region (not moved elsewhere). When the session is complete, this region's content is up to you to decide sensibly (e.g. show the results summary table here, since there's no current word) — the spec doesn't mandate a specific completed-state layout, just that nothing here should look broken or empty in that state.
- **Navigation region (below the hero region):** the reveal `Button` ("Wort einblenden" or similar) and the two flag `Button`s (👍/👎), replacing the old row that included "Next Word". No "Next Word" control anywhere.
- Restyle (not restructure) the existing loading/error/empty-word-bank `Alert` states, the results-summary table, and the session-complete messaging to use the new design tokens — their content and conditions for showing stay exactly as already speced/shipped, only their visual styling changes to match the new palette/typography.

**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx` (update existing tests broken by removing "Next Word" and add new tests per below)

**Test requirement:**
1. Auto-advance (TDD, RED→GREEN): flagging a word (correct or incorrect) with more words remaining results in a new current word being set and `speak` being called for it, without any separate button click — update/replace any existing test that clicked a "Next Word" button as a separate step.
2. Flagging the last word does NOT call `speak` again / does NOT set a new current word — the session shows as complete instead.
3. A failed flag (mocked rejection) does not advance — the word stays current, unflagged, retryable (this scenario is likely already covered by an existing test; keep it passing, adapt if the DOM structure changed).
4. No "Next Word" button/role exists anywhere in the rendered output, in any session state.
5. Header region: the brand text, the session-size selector, the theme toggle, and the "New Session" control are all present together, in every session state tested (you can reuse/adapt existing tests that already check these controls individually — this is about confirming they coexist in one header region structurally, e.g. via a `header` landmark role or a shared test container).
6. Hero region: before reveal, the Play control is present and the word's text is not in the document; after reveal, the word's text is present and the Play control is not (adapt existing reveal-related tests to this mutual-exclusivity check).
7. Navigation region: the reveal action and both flag actions are present together, structurally grouped (e.g. both inside the same container/landmark), for an active session.
8. Theme toggle (mock `@/lib/theme-settings`, same pattern as the other settings mocks already in this file): mount reflects a persisted theme (mock `loadTheme` to return `"dark"`, assert the `dark` class ends up on `document.documentElement`); activating the toggle flips the class and calls `saveTheme` with the new value; toggling twice returns to the original state.

You will need to update many existing tests in `page.test.tsx` that assume the old "Next Word" + separate flag flow, the old `Card`-based structure, or query by the old layout — go through the existing suite systematically rather than leaving broken tests. Where a test's *assertion* (not just its DOM query) is about to become false (e.g. anything that clicks "Next Word"), rewrite it to match the new auto-advance flow rather than deleting the scenario it was protecting.

**Done when:** All tests pass, no regressions to scenarios from `flashcard-session`/`speech-controls`/`session-size-summary` that are still applicable (session persistence, results summary content, speed/voice controls, empty/error/loading states — restyled but behaviorally identical), `npm run build` succeeds, `npm run lint` is clean. Additionally: start the dev server and manually compare the rendered practice screen against `ideas/idee1.webp` at a few viewport widths (mobile/tablet/desktop) — this is the only way to verify the visual/spatial fidelity the automated tests can't check.

## Done Criteria
The feature is DONE when:
- [ ] Both tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every testable scenario in spec.md has a corresponding passing test (visual-fidelity scenarios are verified manually per each task's Done When, not automated — consistent with the spec's Non-Functional Requirements section)
- [ ] Code review passed with no Critical findings
- [ ] No regressions in previously-shipped, still-applicable scenarios
- [ ] `npm run lint` and `npm run build` succeed
- [ ] Manual visual comparison against `ideas/idee1.webp` confirms the redesign matches its composition/mood at desktop width, and the layout works without horizontal scrolling at mobile/tablet widths
