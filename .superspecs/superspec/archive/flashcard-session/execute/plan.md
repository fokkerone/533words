# Execution Plan: Flashcard Session (Word Setup + Practice Flow)

**Spec:** superspec/specs/flashcard-session/spec.md
**Tasks:** superspec/specs/flashcard-session/tasks.md
**Context estimate:** ~30k / 200k ✅ (spec+tasks ~4k words / ~4k tokens; implementation context from existing scaffold — `src/lib/session.ts`, `src/lib/db.ts`, `src/app/layout.tsx`, `src/app/providers.tsx`, shadcn components, `package.json` — is small)
**Started:** 2026-09-16

## Execution Strategy

Wave execution order: Wave 1 → Wave 2 → Wave 3
Parallelism: Wave 1 tasks are sequential (1.2 seed script reuses 1.1's schema/DB helper). Wave 2 tasks (2.1–2.4) are independent of each other and can run in parallel. Wave 3's Task 3.1 depends on all of Wave 2; Task 3.2 depends on 3.1 plus the Prerequisites (Turso credentials — already provided and verified; CSV file — still pending from the user).

## Wave Summary

### Wave 1 — Foundation
Sequential: Tasks 1.1 → 1.2
Tasks: 1.1 (word bank schema), 1.2 (seed script)
Unblocks: Wave 2

### Wave 2 — Core Logic
Parallel: Tasks 2.1, 2.2, 2.3, 2.4 (no shared files, no interdependencies)
Tasks: 2.1 (session pool logic), 2.2 (word bank data access / Tanstack Query hooks), 2.3 (speech synthesis utility), 2.4 (localStorage persistence)
Unblocks: Wave 3

### Wave 3 — Integration
Tasks: 3.1 (session flow UI, sequential after all Wave 2), 3.2 (manual verification, blocked on the CSV file being provided — Turso credentials already confirmed working)

## Executor Instructions

Each subagent receives:
1. `superspec/specs/flashcard-session/spec.md` (full)
2. `superspec/specs/flashcard-session/tasks.md` (their task only)
3. The codebase on the execution branch
4. No prior chat history — all context must come from spec.md + their task description

Wave 1 and Wave 2 subagents must use the fake DB client approach specified in tasks.md (Q8 from GRILL.md) — not a real Turso connection and not a wire-protocol mock (e.g. MSW) — for their tests.

## Human Checkpoints
- After Wave 1: review schema + seed script and their tests before Wave 2 starts
- After Wave 2: review session logic, data hooks, speech utility, and persistence layer together before Wave 3 starts
- After Wave 3: full verification (lint, build, tests, manual walkthrough once CSV is available) before `/superspecs:ship`

## Known Blockers
- CSV file of the 533 NRW words has not yet been provided — Task 3.2 (manual verification) cannot fully complete without it, though the rest of the feature can be built and tested.

## Branch

Branch name: `superspec/flashcard-session`
Type: branch
Worktree path: N/A
Created from: main @ 24a7648
Created: 2026-09-16

Note: repo had no git history before this spec — `main` was initialized fresh with a single baseline commit (project scaffold + planning docs for this spec) before branching.
