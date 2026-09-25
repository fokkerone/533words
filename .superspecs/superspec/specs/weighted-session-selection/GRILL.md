# Grill Session: Weighted Session Selection

Date: 2026-09-25
Spec reviewed: superspec/specs/weighted-session-selection/spec.md

## Pre-flight

### Wiki conflicts
None. This is a pure extension of `session.ts`'s existing framework-free, pure-function design (see [[ui/session-state-pattern]]) — no new architecture, no new dependencies.

### Techstack conflicts
None. No database, network, or schema changes — operates entirely on the `Word[]` array already returned by `fetchWords` (see [[data/word-bank-schema]]).

### Internal contradictions
One found and resolved during the interview (see Q2 below) — a redundant scenario that was mathematically unreachable as an independent case.

## Questions & Resolutions

### Q1: Should the weak/strong split logic be pulled into a separately exported, deterministically-testable function, or left inline inside `startSession` and tested only via repeated/statistical draws?
**Recommended:** Pull it into an exported helper (e.g. `splitByRelativeScore(words): { weak, rest }`) — enables exact, deterministic assertions on pool membership and counts, rather than relying on repeated random draws to statistically infer correctness.
**Resolved:** Confirmed — exported helper function. `startSession` calls it and layers the randomized draw + shuffle on top.
**Impact:** `tasks.md` updated — Task 1.1 now specifies the exported `splitByRelativeScore` function and restructures the test plan to use deterministic assertions for split-related scenarios, reserving repeated-draw/statistical tests only for the parts that are inherently random (the weak-pool minimum draw itself, and the final shuffle). No `spec.md` change — this is an implementation/testability detail, not a behavioral requirement.

### Q2: Are "Weak pool smaller than the required minimum" and "Small word bank draws everything available" actually two independent scenarios, or the same case described twice?
**Investigation:** `weakPool.length = ceil(bankSize / 2)` and `weakPoolMinimum = ceil(sessionSize / 2)` both scale monotonically with their respective inputs. `weakPool.length < weakPoolMinimum` is therefore only reachable when `bankSize < sessionSize` — which is exactly the condition for "small word bank." The two scenarios describe the same mathematical case from two different angles.
**Resolved:** Merged into one scenario ("Small word bank — weak pool can't fill the minimum") in `spec.md`. The separate "Small word bank draws everything available" scenario and its corresponding Error Behavior bullet were removed as duplicates.
**Impact:** `spec.md` changed — one scenario removed, the remaining one reworded to explicitly state the mathematical equivalence so a future reader doesn't reintroduce the duplicate. `tasks.md`'s test plan updated to reflect a single merged test case.

## Spec Changes Required

- Removed the redundant "Weak pool smaller than the required minimum" scenario; renamed and reworded "Small word bank draws everything available" (now under the correct requirement) to cover both angles explicitly.
- Simplified the corresponding Error Behavior bullet to state the mathematical equivalence directly instead of listing two conditions as if independent.

## Deferred Questions

None — the feature's scope is small and well-bounded; both substantive questions were resolved directly rather than deferred.

## Verdict

**READY** — All decision branches resolved. Proceed to `/pick-spec`.
