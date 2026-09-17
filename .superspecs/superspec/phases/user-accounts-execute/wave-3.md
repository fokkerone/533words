# Wave 3: Integration

Started: 2026-09-18
Single task — touches shared files (`page.tsx`, all five settings modules) that Wave 2's disjoint-file tasks couldn't safely split further.

## Task Status

| Task | Status | Review | Notes |
|------|--------|--------|-------|
| 3.1 | ✅ done | ✅ passed | Header user menu (identity + logout), `page.tsx` split into `Home`/`PracticeScreen` to handle the session-loading window cleanly, all five settings modules scoped per learner ID, `useWords`/`useFlagWord` wired to the real session — fixes Wave 2's deliberate temporary build breakage. |

## Review Log Summary
Approved, no Critical findings. 146/146 tests passing, lint clean, `npm run build` now succeeds (confirmed independently — this was the wave that had to resolve the two `TS2554` errors left open at the end of Wave 2).

Live end-to-end verification was performed against the real dev Turso DB: two real accounts registered, independent scores/settings/sessions confirmed both in `localStorage` and in `user_word_scores` rows, header identity and logout confirmed working for both, and a pre-existing (unrelated) infra gap — the `user_word_scores` migration had never actually been run against the dev DB — found and fixed along the way. Google sign-in was not tested, correctly deferred per GRILL.md Q5 pending real OAuth credentials.

## Completed: 2026-09-18
