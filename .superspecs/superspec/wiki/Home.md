---
title: Wiki Home
tags: [index, home]
updated: 2026-09-17
---

# Project Wiki

Knowledge base distilled from shipped features — architecture decisions, patterns, trade-offs, gotchas.

> **Obsidian vault** — open `superspec/wiki/` in [Obsidian](https://obsidian.md) for graph view, backlinks, tag search, and hover previews.

## Domains

| Domain | Pages | Last updated |
|--------|-------|-------------|
| [[techstack/profile\|techstack]] | 1 | 2026-09-18 |
| [[auth/Home\|auth]] | 1 | 2026-09-18 |
| [[data/Home\|data]] | 1 | 2026-09-18 |
| [[ui/Home\|ui]] | 2 | 2026-09-18 |
| [[patterns/Home\|patterns]] | 4 | 2026-09-18 |

## Recent Updates

_(last 10 — full history in [[log]])_

- 2026-09-18: [[auth/better-auth-setup]] — new: Better Auth + Turso/Kysely setup, cookie-gated routing, Google OAuth walkthrough (user-accounts)
- 2026-09-18: [[patterns/per-user-scoped-storage]] — new: the localStorage/query-key per-learner scoping convention (user-accounts)
- 2026-09-18: [[data/word-bank-schema]] — updated: `user_word_scores` per-learner table replaces global `words.score` (user-accounts)
- 2026-09-18: [[ui/session-state-pattern]] — updated: `Home`/`PracticeScreen` split for per-learner session resolution (user-accounts)
- 2026-09-18: [[techstack/profile]] — updated: user-accounts shipped (Better Auth, first server-side surface)
- 2026-09-17: [[ui/design-tokens-theming]] — new: design tokens, fluid `clamp()` typography, Tailwind v4 breakpoint tiers, dark/light theme-toggle convention (editorial-redesign)
- 2026-09-17: [[ui/session-state-pattern]] — updated: `advance()` auto-advance consumer pattern (editorial-redesign)
- 2026-09-17: [[techstack/profile]] — updated: editorial-redesign shipped (Inter font, Exaggerated Minimalism style, Tailwind v4 breakpoints)
- 2026-09-17: [[ui/session-state-pattern]] — updated: configurable session size, flag-order tracking, results-summary lookup pattern (session-size-summary)
- 2026-09-17: [[patterns/web-speech-voice-selection]] — new: German voice selection, overlap prevention, and a real async-loading race found via manual browser testing

---

_Maintained by [SuperSpecs](https://github.com/fokkerone/superspecs)_
