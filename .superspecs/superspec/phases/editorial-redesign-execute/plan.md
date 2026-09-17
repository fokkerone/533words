# Execution Plan: Editorial Redesign (Exaggerated Minimalism)

**Spec:** superspec/specs/editorial-redesign/spec.md
**Tasks:** superspec/specs/editorial-redesign/tasks.md
**Context estimate:** ~40k / 200k ✅ (spec+tasks ~5k tokens; implementation context for Wave 2 — full `src/app/page.tsx` (381 lines), `src/app/page.test.tsx` (653 lines), `src/app/globals.css` (129 lines), `ideas/idee1.webp` reference image — is the largest yet in this project but still comfortably under budget)
**Started:** 2026-09-17

## Execution Strategy

Wave execution order: Wave 1 → Wave 2
Parallelism: Wave 1's two tasks (1.1 tokens/font/dark-palette in `layout.tsx`/`globals.css`, 1.2 new `theme-settings.ts`) touch disjoint files with no shared imports (confirmed in grill Q3) and run in parallel. Wave 2 (Task 2.1) depends on both and runs alone — it's the largest single integration task attempted in this project (layout restructure + auto-advance behavior + theme toggle, all in `page.tsx`).

## Wave Summary

### Wave 1 — Foundation
Parallel: Tasks 1.1, 1.2
Tasks: 1.1 (Inter font, light+dark design tokens, breakpoints), 1.2 (theme persistence — `theme-settings.ts`)
Unblocks: Wave 2
**Note:** Task 1.1 is a visual/config change with no automated test (documented and justified in tasks.md) — verified via `npm run build` + manual devtools check, not TDD. Task 1.2 is a normal TDD task following the established settings-module pattern.

### Wave 2 — Integration
Tasks: 2.1 (layout restructure — header/hero/nav regions; auto-advance on flag, replacing the "Next Word" button; theme toggle wiring)
Unblocks: shippable feature

## Executor Instructions

Each subagent receives:
1. `superspec/specs/editorial-redesign/spec.md` (full)
2. `superspec/specs/editorial-redesign/tasks.md` (their task only)
3. The codebase on the execution branch
4. No prior chat history — all context must come from spec.md + their task description

Task 2.1's subagent must view `ideas/idee1.webp` directly (not rely on a text description) for the layout composition reference, and must update the extensive existing `page.test.tsx` suite (28 tests as of Wave 1) systematically rather than leaving broken tests — many existing tests assume the old "Next Word" button flow and the old `Card`-bounded layout.

## Human Checkpoints
- After Wave 1: review the new light/dark tokens (via devtools toggle) and `theme-settings.ts` tests
- After Wave 2: full verification (lint, build, tests, manual browser comparison against the reference image at mobile/tablet/desktop widths) before `/superspecs:verify`
