---
title: Wiki Home
tags: [index, home]
updated: 2026-09-25
---

# Project Wiki

Knowledge base distilled from shipped features — architecture decisions, patterns, trade-offs, gotchas.

> **Obsidian vault** — open `superspec/wiki/` in [Obsidian](https://obsidian.md) for graph view, backlinks, tag search, and hover previews.

## Domains

| Domain | Pages | Last updated |
|--------|-------|-------------|
| [[techstack/profile\|techstack]] | 1 | 2026-09-18 |
| [[auth/Home\|auth]] | 1 | 2026-09-18 |
| [[data/Home\|data]] | 1 | 2026-09-25 |
| [[ui/Home\|ui]] | 2 | 2026-09-25 |
| [[patterns/Home\|patterns]] | 5 | 2026-09-25 |

## Recent Updates

_(last 10 — full history in [[log]])_

- 2026-09-25: [[ui/session-state-pattern]] — updated: header goal-distance message (loading/error-hidden, tablet-breakpoint-hidden) and session-progress indicator (star-progress-display)
- 2026-09-25: [[data/word-bank-schema]] — updated: star total is not bounded below zero, can be negative (star-progress-display)
- 2026-09-25: [[patterns/german-ui-text]] — new: German-UI localization convention — no i18n framework, Login/Logout exception, icon-over-translation, translated-heading/raw-detail error pattern (german-ui)
- 2026-09-24: [[data/word-bank-schema]] — updated: `fetchUserStarTotal`, computed-on-read decision over a maintained cache table (star-total)
- 2026-09-24: [[ui/session-state-pattern]] — updated: `useUserStars` header badge, an independent query rather than derived state (star-total)
- 2026-09-18: [[auth/better-auth-setup]] — new: Better Auth + Turso/Kysely setup, cookie-gated routing, Google OAuth walkthrough (user-accounts)
- 2026-09-18: [[patterns/per-user-scoped-storage]] — new: the localStorage/query-key per-learner scoping convention (user-accounts)
- 2026-09-18: [[data/word-bank-schema]] — updated: `user_word_scores` per-learner table replaces global `words.score` (user-accounts)
- 2026-09-18: [[ui/session-state-pattern]] — updated: `Home`/`PracticeScreen` split for per-learner session resolution (user-accounts)
- 2026-09-18: [[techstack/profile]] — updated: user-accounts shipped (Better Auth, first server-side surface)
- 2026-09-17: [[ui/design-tokens-theming]] — new: design tokens, fluid `clamp()` typography, Tailwind v4 breakpoint tiers, dark/light theme-toggle convention (editorial-redesign)

---

_Maintained by [SuperSpecs](https://github.com/fokkerone/superspecs)_
