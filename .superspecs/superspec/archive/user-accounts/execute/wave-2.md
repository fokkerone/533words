# Wave 2: Auth UI & Data Layer

Started: 2026-09-17
Completed: 2026-09-18

Logically independent (disjoint files: Task 2.1 → `src/app/login|register`, `src/components/auth-form.tsx`; Task 2.2 → `src/proxy.ts`, `src/lib/route-guard.ts`; Task 2.3 → `src/lib/words.ts`, `src/hooks/use-words.ts`). Executed sequentially, same single-agent/no-worktree reasoning as Wave 1.

## Task Status

| Task | Status | Review | Notes |
|------|--------|--------|-------|
| 2.1 | ✅ done | ✅ passed | Login/register pages, shared `AuthForm` shell, generic non-enumerating error copy. Caught (via a real build failure, not assumption) that Better Auth's `signUp.email` requires a `name` field this app doesn't collect — defaulted to email. |
| 2.2 | ✅ done | ✅ passed | Route protection. Genuine deviation: built as `src/proxy.ts` not `middleware.ts` — Next.js 16 deprecated and renamed the convention, confirmed independently by me reading the actual Next.js docs bundled in `node_modules`. Redirect behavior independently re-verified live via `curl`. |
| 2.3 | ✅ done | ✅ passed | `fetchWords`/`writeWordFlag` scoped by required `userId`, `LEFT JOIN`/`COALESCE` for implicit-0, `INSERT ... ON CONFLICT DO UPDATE` for lazy row creation. `page.tsx` now fails to build with two `TS2554` errors — expected and documented, to be resolved by Wave 3. |

## Review Log Summary
All three tasks approved, no Critical findings across the wave. 138/138 tests passing at wave end, lint clean. `npm run build` currently fails (expected, temporary) due to `page.tsx` not yet passing a learner ID to `useWords`/`useFlagWord` — this is exactly what Wave 3's Task 3.1 resolves.

Two Low, non-blocking nits noted (not worth a fix-up cycle): `AuthForm`'s shared password field uses `autoComplete="current-password"` for both login and register (register would ideally use `new-password`); `route-guard.ts`'s doc comment still references the pre-rename `src/middleware.ts` filename in two places.

Independent verification beyond trusting subagent reports: read the actual Next.js 16 deprecation doc in `node_modules` to confirm Task 2.2's `proxy.ts` rename was warranted; started the real dev server and ran live `curl` checks confirming the unauthenticated-redirect and reachable-without-session behavior myself; reproduced Task 2.3's expected build failure directly.

## Completed: 2026-09-18
