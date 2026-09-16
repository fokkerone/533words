---
title: Wiki Log
tags: [log, activity]
---

# Wiki Log

Append-only activity log. Every ingest, query, and lint run appends an entry here.

> grep-friendly: `grep "## \[" log.md` lists all events

---

## [2026-06-25] init | Wiki initialized

- Structure: `raw/` (sources) + `wiki/` (compiled) + `.skills/verify-wiki/SKILL.md` (schema)
- Vault ready to open in Obsidian

## [2026-09-16] techstack | Tech stack profile established

- Created: techstack/profile.md
- Project scaffolded: Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui, Turso client-direct

## [2026-09-16] ingest | flashcard-session: flashcard practice flow

- Created: data/word-bank-schema.md, ui/session-state-pattern.md, patterns/fake-db-client-testing.md
- Updated: techstack/profile.md (open questions resolved, Turso provisioned, word list seeded)
- Domains touched: data, ui, patterns, techstack
- Spec: `superspec/specs/flashcard-session/spec.md`
- Test suite: 42/42 passing, 17/17 spec scenarios covered, no regressions

