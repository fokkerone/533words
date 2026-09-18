# Wave 1: Foundation

Started: 2026-09-17

Logically independent (disjoint files: Task 1.1 touches `src/lib/auth*.ts`, the auth route handler, `package.json`; Task 1.2 touches `src/lib/db.ts`, `scripts/migrate.ts`). Executed sequentially since this project uses a plain branch, not a worktree, per the subagent skill's single-agent-mode guidance.

## Task Status

| Task | Status | Review | Notes |
|------|--------|--------|-------|
| 1.1 | ✅ done | ✅ passed | Better Auth server setup (email+password + Google), Kysely/libSQL dialect against the existing Turso DB, extracted `getUserId()` pure helper. Confirmed `user.id` is `TEXT` via real migration + `sqlite_master` query — satisfies the Wave 1→2 checkpoint requirement from GRILL.md Q3. |
| 1.2 | ✅ done | ✅ passed | `user_word_scores` per-learner score table (composite PK, `user_id TEXT` matching Task 1.1's confirmed type) + `dropWordsScoreColumn` destructive migration with a tested DROP-COLUMN-unsupported fallback. |

## Review Log Summary
Both tasks approved, no Critical findings. 122/122 tests passing, lint clean, build clean, `npm run build`'s route listing confirms `/api/auth/[...all]` registers correctly.

**Wave 1 → Wave 2 checkpoint (GRILL.md Q3) — satisfied:** Task 1.1 independently confirmed `user.id TEXT NOT NULL PRIMARY KEY` by running the real Better Auth migration against Turso and querying `sqlite_master`; Task 1.2 correctly used `TEXT` for `user_word_scores.user_id`. No mismatch.

**Carried to manual verification (Wave 3):** confirm `ALTER TABLE words DROP COLUMN score` actually succeeds against the real Turso DB (vs. falling back to clear-to-0) — only verified via fake-client tests so far, honestly disclosed by Task 1.2's subagent.

## Completed: 2026-09-17
