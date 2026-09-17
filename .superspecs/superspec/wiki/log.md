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

## [2026-09-17] ingest | speech-controls: German voice, Play button, speed, manual voice selection

- Created: patterns/web-speech-voice-selection.md, patterns/jsdom-radix-polyfills.md
- Updated: techstack/profile.md (speech-controls shipped, dev-server LAN access gotcha documented)
- Domains touched: patterns, techstack
- Spec: `superspec/specs/speech-controls/spec.md` (amended twice post-execution: manual voice selection dropdown added, then "Google Deutsch" set as the default automatic voice — both by direct user request after Waves 1-2 shipped)
- Test suite: 77/77 passing, 18/18 spec scenarios covered, no regressions
- Notable: a real async voice-loading race was found via live browser testing (not caught by mocked unit tests) and fixed — see patterns/web-speech-voice-selection.md

