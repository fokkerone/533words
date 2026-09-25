# Execution Plan: German UI (localize all remaining English chrome)

**Spec:** superspec/specs/german-ui/spec.md
**Tasks:** superspec/specs/german-ui/tasks.md
**Context estimate:** ~8k / 200k ✅
**Started:** 2026-09-25

## Branch

Branch name: `superspec/german-ui`
Type: branch
Worktree path: N/A
Created from: main @ dae8e28
Created: 2026-09-25

## Execution Strategy

Wave execution order: Wave 1 → Wave 2
Parallelism: neither wave has internal parallelism — each is a single task (large shared files per task, consistent with how this project has always treated `page.tsx`/auth-page integration work).

## Wave Summary

### Wave 1 — Practice Screen
Sequential (single task): Task 1.1
Unblocks: Wave 2

### Wave 2 — Auth Pages
Sequential (single task): Task 2.1 (fully disjoint files from Wave 1, but sequenced after it per this project's single-agent execution mode)

## Executor Instructions

Each subagent receives:
1. spec.md (full)
2. tasks.md (their task only)
3. The codebase (branch: superspec/german-ui)
4. No prior chat history

## Human Checkpoints
- After Wave 1: review and approve before Wave 2
- After Wave 2: full verification before ship (including the user's own manual German-text completeness pass, per GRILL.md Q1)
