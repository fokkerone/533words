# Review Log: Editorial Redesign (Exaggerated Minimalism)

Populated during execution — one entry per task review.

## Wave 1

### Task 1.1: Design tokens, font, and breakpoints (light + dark)
**Stage 1 — Spec compliance:** PASS. Inter loaded via `next/font/google`, full variable weight axis (100–900), replacing Geist entirely. Light and dark palettes both defined with a single non-neutral accent value shared between `--accent`/`--destructive` per theme (light `#e3452c`, dark `#ff5c3d` — different numeric values between themes, correctly matching the grilled "adjusted for contrast, not necessarily identical" decision). `--background` sampled from the actual reference image rather than defaulting to white. Breakpoint tiers defined via Tailwind v4's `--breakpoint-*` convention (768px/1024px) plus a `.container-editorial` 1440px ceiling utility — technically correct usage of Tailwind v4's breakpoint customization mechanism.

**Stage 2 — Code quality:** PASS, with one good catch. The subagent found and fixed a real latent bug: the old code set `--font-geist-sans` on `<html>`, but `globals.css`'s `@theme inline` block read from `--font-sans` — a naming mismatch that likely meant Geist was never actually applied via Tailwind's `font-sans` utility (it would have silently fallen back to the system font stack). Fixed by consistently using `--font-sans` throughout. This wasn't explicitly asked for but is squarely a "genuine bug found while integrating" case the task instructions told the subagent to report — correctly fixed since it directly blocked the task's own goal (Inter must actually apply). 105/105 tests, lint clean, build clean, no automated test required (correctly justified per the task's documented TDD exception).

**Verdict:** ✅ Approved, no findings.

### Task 1.2: Theme persistence
**Stage 1 — Spec compliance:** PASS. `loadTheme`/`saveTheme` follow the established never-throw settings-module pattern exactly; defaults hardcoded to `"light"` with zero reference to `matchMedia`/system preference anywhere in the module — matches the spec's explicit "first-ever use defaults to light, not system preference" requirement precisely.

**Stage 2 — Code quality:** PASS. Clean, minimal, mirrors `session-size-settings.ts`'s structure closely. Test coverage includes the specific edge case of a valid-JSON-but-invalid-theme-string value (e.g. `"blue"`), not just corrupt JSON — a slightly more thorough test than the task's minimum ask. No findings.

**Verdict:** ✅ Approved, no findings.

## Wave 2

### Task 2.1: Layout restructure, auto-advance behavior, and theme toggle
**Stage 1 — Spec compliance:** PASS. Verified against every requirement: `handleFlag` calls `flagWord` then `advance()` (shared `pickNextWord`+`speak` helper) only when `!isSessionComplete`, matching all three Auto-Advance scenarios exactly; header (`role="banner"`) unconditionally renders brand+session-size+theme-toggle+New-Session together; hero region shows Play XOR revealed word text, with speed/voice controls only when not complete (correctly hidden at completion, matching the spec's literal wording); nav region (`role="group"`) holds Reveal+Correct+Incorrect with zero "Next Word" control anywhere (explicitly tested); theme toggle applies/removes `dark` on `document.documentElement`, persists via `saveTheme`, initializes from `loadTheme()`. Confirmed live in a real browser: dark/light toggle works, word reveal shows huge fluid typography matching the reference's headline treatment, and auto-advance genuinely fires on flag with no extra click.

**Judgment call — auto-picking the first word of a session:** the subagent extended `advance()` to also run at session start (`startNewSession` and the auto-start effect), not just post-flag. This wasn't explicitly required by the Auto-Advance requirement's wording (which only covers the flag action), but is a necessary consequence of removing "Next Word" entirely — without it, a session would start with `current: null` and no way to ever reach the first word. Verified this is correct and necessary, not scope creep.

**Stage 2 — Code quality:** PASS. 113/113 tests (36 in `page.test.tsx`, up from 28), lint clean, build clean. Test suite systematically updated rather than patched — old "Next Word"-flow tests were rewritten to match auto-advance, not deleted. `beforeEach` correctly resets `document.documentElement`'s `dark` class between tests, avoiding cross-test leakage. No modifications to any out-of-scope file; subagent reported (and I found none myself) no bugs in code outside its scope.

**Testability gap, honestly flagged and independently confirmed:** the subagent could not get real mobile/tablet-width rendering verified via this session's browser automation (`resize_window` reports success but the actual viewport doesn't shrink in this sandboxed environment) and explicitly said so rather than claiming it passed. I reproduced the same limitation independently (`window.innerWidth` stayed ~1100px despite requesting 390px) and instead verified the underlying mechanism directly: the generated CSS for `.tablet\:px-8` is a standard `@media (min-width: 48rem)` rule (confirmed via `document.styleSheets` inspection) — normal, well-tested Tailwind output, not custom/fragile code. This gives reasonable confidence the responsive behavior is structurally sound, though true narrow-viewport visual confirmation still needs a real device/browser outside this sandboxed session.

**Verdict:** ✅ Approved, no Critical findings. One open item carried forward: mobile/tablet visual rendering should be spot-checked in a real browser outside this environment before considering the feature's manual-verification Done criteria fully satisfied.
