# Execution Plan: Star Total (per-learner point total in the nav)

**Spec:** superspec/specs/star-total/spec.md
**Tasks:** superspec/specs/star-total/tasks.md
**Context estimate:** ~10k / 200k ✅
**Started:** 2026-09-24

## Execution Strategy

Wave execution order: Wave 1 → Wave 2
Parallelism: neither wave has internal parallelism — each is a single task (small, tightly-coupled pieces per tasks.md's own reasoning against over-splitting).

## Wave Summary

### Wave 1 — Data Layer & Hook
Sequential (single task): Task 1.1
Unblocks: Wave 2

### Wave 2 — Header Integration
Sequential (single task): Task 2.1 (depends on Wave 1's hook existing)

## Executor Instructions

Each subagent receives:
1. spec.md (full)
2. tasks.md (their task only)
3. The codebase (branch: superspec/star-total)
4. No prior chat history

## Human Checkpoints
- After Wave 1: review and approve before Wave 2
- After Wave 2: full verification before ship
