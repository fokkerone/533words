# Execution Plan: Speech Controls (German Voice, Play Button, Speed)

**Spec:** superspec/specs/speech-controls/spec.md
**Tasks:** superspec/specs/speech-controls/tasks.md
**Context estimate:** ~15k / 200k ✅ (spec+tasks ~2.7k tokens; implementation context — `src/lib/speech.ts`, `src/lib/session-storage.ts` as a pattern reference, `src/app/page.tsx`, `src/app/page.test.tsx` — is small)
**Started:** 2026-09-16

## Execution Strategy

Wave execution order: Wave 1 → Wave 2
Parallelism: Wave 1's two tasks (1.1 `speech.ts`, 1.2 new `speech-settings.ts`) touch disjoint files and can run in parallel. Wave 2 (Task 2.1) depends on both and runs alone.

## Wave Summary

### Wave 1 — Foundation
Parallel: Tasks 1.1, 1.2
Tasks: 1.1 (German voice selection, rate, overlap prevention in `speech.ts`), 1.2 (speed persistence in new `speech-settings.ts`)
Unblocks: Wave 2
**Known, accepted, transient state:** `npm run build` is expected to fail after Task 1.1 alone lands, since `speak`'s new required `rate` parameter breaks the existing `page.tsx` call site until Task 2.1 fixes it (see GRILL.md Q1b). Do not treat this as a Wave 1 regression — verify via `npm run test` only for Wave 1, full build check happens after Wave 2.

### Wave 2 — Integration
Tasks: 2.1 (Play button + speed slider wired into `page.tsx`, updates the `speak()` call site)
Unblocks: shippable feature

## Executor Instructions

Each subagent receives:
1. `superspec/specs/speech-controls/spec.md` (full)
2. `superspec/specs/speech-controls/tasks.md` (their task only)
3. The codebase on the execution branch
4. No prior chat history — all context must come from spec.md + their task description

Task 1.1's subagent updates its own test file's `speak()` calls to pass a rate; it does NOT touch `page.tsx`. Task 2.1's subagent updates the real `page.tsx` call site and is responsible for the full build going green again.

## Human Checkpoints
- After Wave 1: review speech.ts + speech-settings.ts and their tests (build red is expected and fine at this point)
- After Wave 2: full verification (lint, build, tests) before `/superspecs:verify`
