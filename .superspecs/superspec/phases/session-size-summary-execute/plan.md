# Execution Plan: Session Size Selector & Results Summary

**Spec:** superspec/specs/session-size-summary/spec.md
**Tasks:** superspec/specs/session-size-summary/tasks.md
**Context estimate:** ~15k / 200k ✅ (spec+tasks ~2.6k tokens; implementation context — `src/lib/session.ts`, `src/app/page.tsx`, `src/lib/speech-settings.ts` as a pattern reference — is small)
**Started:** 2026-09-17

## Execution Strategy

Wave execution order: Wave 1 → Wave 2
Parallelism: Wave 1's two tasks (1.1 `session.ts`, 1.2 new `session-size-settings.ts`) touch disjoint files with no shared imports (confirmed in grill Q4) and can run in parallel. Wave 2 (Task 2.1) depends on both and runs alone.

## Wave Summary

### Wave 1 — Foundation
Parallel: Tasks 1.1, 1.2
Tasks: 1.1 (parameterize session size + flag order tracking in `session.ts`), 1.2 (session size persistence in new `session-size-settings.ts`)
Unblocks: Wave 2

### Wave 2 — Integration
Tasks: 2.1 (size selector + results summary wired into `page.tsx`, extends `startNewSession` to take a size parameter per grill Q3)
Unblocks: shippable feature

## Executor Instructions

Each subagent receives:
1. `superspec/specs/session-size-summary/spec.md` (full)
2. `superspec/specs/session-size-summary/tasks.md` (their task only)
3. The codebase on the execution branch
4. No prior chat history — all context must come from spec.md + their task description

Task 1.1's subagent updates its own test file's `createSessionState`/`startSession` calls to pass an explicit size (breaking signature change, same pattern as the earlier `speak(text, rate)` change) — it does NOT touch `page.tsx`. Task 2.1's subagent updates the real `page.tsx` call sites and is responsible for the full build going green.

## Human Checkpoints
- After Wave 1: review session.ts (size param + flagOrder) and session-size-settings.ts and their tests
- After Wave 2: full verification (lint, build, tests) before `/superspecs:verify`

## Branch

Branch name: `superspec/session-size-summary`
Type: branch
Worktree path: N/A
Created from: main @ dd27aa7
Created: 2026-09-17
