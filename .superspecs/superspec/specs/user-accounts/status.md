# User Accounts (Better Auth login/register + per-user scores) — Status

## Phase
3 — Verify ✅

## Checklist
- [x] Discussion complete (DISCUSS.md)
- [x] Spec written
- [x] Spec fits context window (~18k / 200k)
- [x] Spec grilled and stress-tested (GRILL.md)
- [x] Wiki conflicts: none
- [x] Techstack conflicts: none (one technical risk mitigated via a live-docs-verification instruction, not a conflict)
- [x] Branch created (superspec/user-accounts)
- [x] Subagent execution complete (Wave 1: tasks 1.1, 1.2; Wave 2: tasks 2.1, 2.2, 2.3; Wave 3: task 3.1)
- [x] All tests passing (148/148)
- [x] Code review passed (no Critical findings)
- [x] Wiki imported
- [ ] PR created
- [ ] Archived

## Test Results
- Suite: 148 passing, 0 failing, 0 skipped
- Spec scenarios: 13/15 automated-testable scenarios covered; 2/15 (both Google sign-in scenarios) explicitly manually-verified only, per GRILL.md Q5's decoupling of live Google OAuth verification from this pass's timeline — 15/15 total accounted for
- Regressions: none
- One scenario-coverage gap (Tanstack Query cache scoping) found and closed during `/verify` itself — see `src/hooks/use-words.test.tsx`

## Wiki Pages
- [[auth/better-auth-setup]] — Better Auth + Turso/Kysely setup, cookie-gated routing, Google OAuth walkthrough (new)
- [[patterns/per-user-scoped-storage]] — the localStorage/query-key per-learner scoping convention (new)
- [[data/word-bank-schema]] — updated: `user_word_scores` per-learner table replaces global `words.score`
- [[ui/session-state-pattern]] — updated: `Home`/`PracticeScreen` split for per-learner session resolution
- [[techstack/profile]] — updated: Better Auth, first server-side surface, user-accounts shipped

## Slug
user-accounts

## Started
2026-09-17
