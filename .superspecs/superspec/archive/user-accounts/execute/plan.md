# Execution Plan: User Accounts (Better Auth login/register + per-user scores)

**Spec:** superspec/specs/user-accounts/spec.md
**Tasks:** superspec/specs/user-accounts/tasks.md
**Context estimate:** ~18k / 200k ✅
**Started:** 2026-09-17

## Branch

Branch name: `superspec/user-accounts`
Type: branch
Worktree path: N/A
Created from: main @ 23483d9
Created: 2026-09-17

## Execution Strategy

Wave execution order: Wave 1 → Wave 2 → Wave 3
Parallelism: Wave 1 (Tasks 1.1, 1.2) and Wave 2 (Tasks 2.1, 2.2, 2.3) each run in parallel — disjoint files. Wave 3 (Task 3.1) is a single task since it touches shared files (`page.tsx`, all settings modules).

## Wave Summary

### Wave 1 — Foundation
Sequential / Parallel: Parallel
Tasks: 1.1 (Better Auth server setup, incl. live-docs verification and Google OAuth setup walkthrough), 1.2 (per-learner score schema migration, `user_id TEXT`)
Unblocks: Wave 2
**Checkpoint requirement:** before Wave 2 starts, explicitly verify Task 1.1's actual `user.id` column type matches Task 1.2's `TEXT` assumption (per GRILL.md Q3) — do not just assume it matched.

### Wave 2 — Auth UI & Data Layer
Sequential / Parallel: Parallel
Tasks: 2.1 (login/register pages, opaque error messages, mocked-Google-client testing), 2.2 (middleware-based route protection with an extracted, unit-testable pure redirect-decision function), 2.3 (per-learner score data layer — scoped fetch/write, lazy row creation)
Unblocks: Wave 3

### Wave 3 — Integration
Tasks: 3.1 (header user menu + logout, wiring the session into `useWords`/`useFlagWord`, scoping all `localStorage` keys and the Tanstack Query cache key per learner ID)

## Executor Instructions

Each subagent receives:
1. spec.md (full)
2. tasks.md (their task only)
3. The codebase (branch: superspec/user-accounts)
4. No prior chat history

Task 1.1's subagent additionally must fetch and read live Better Auth documentation before implementing (see tasks.md) rather than relying on training-data memory of the library's API shape.

## Human Checkpoints
- After Wave 1: review and approve before Wave 2 — including the `user.id` type verification above
- After Wave 2: review and approve before Wave 3
- After Wave 3: full verification before ship — noting that Google sign-in's live verification is explicitly decoupled from the rest of the feature's ship timeline (per GRILL.md Q5); email+password verification alone is sufficient to consider the feature done
