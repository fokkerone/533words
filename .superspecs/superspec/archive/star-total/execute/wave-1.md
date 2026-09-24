# Wave 1: Data Layer & Hook

Started: 2026-09-24

Single task (data layer + hook + invalidation wiring are small and tightly coupled — see tasks.md's own reasoning against splitting).

## Task Status

| Task | Status | Review | Notes |
|------|--------|--------|-------|
| 1.1 | ✅ done | ✅ passed | `fetchUserStarTotal` (COALESCE(SUM(score),0)), `useUserStars` hook with its own `STAR_TOTAL_QUERY_KEY`, `useFlagWord`'s `onSuccess` invalidates both query keys now. Live-update wiring verified via a real `QueryClient` + `invalidateQueries` spy, not just a compile-check. |

## Review Log Summary
Approved, no findings. 178/178 tests passing, lint clean, build clean. All three of the task's required confirmations independently re-verified by me: the SQL/COALESCE behavior, the distinct query key, and the invalidation call's actual arguments.

## Completed: 2026-09-24
