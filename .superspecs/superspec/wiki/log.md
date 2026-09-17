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

## [2026-09-17] ingest | session-size-summary: session size selector + results summary

- Created: (none — extended existing pages rather than adding new ones)
- Updated: ui/session-state-pattern.md (configurable session size, flagOrder tracking, results-lookup pattern), ui/Home.md, techstack/profile.md (shipped)
- Domains touched: ui, techstack
- Spec: `superspec/specs/session-size-summary/spec.md`
- Test suite: 100/100 passing, 11/11 spec scenarios covered, no regressions

## [2026-09-17] ingest | editorial-redesign: fullscreen editorial visual redesign + dark/light theme + auto-advance

- Created: ui/design-tokens-theming.md
- Updated: ui/session-state-pattern.md (`advance()` auto-advance consumer pattern), ui/Home.md, techstack/profile.md (Inter font, Exaggerated Minimalism style, Tailwind v4 breakpoints, shipped)
- Domains touched: ui, techstack
- Spec: `superspec/specs/editorial-redesign/spec.md`
- Test suite: 113/113 passing, 11/15 spec scenarios covered by automated tests, 4/15 explicitly manually-verified per the spec's own Non-Functional Requirements carve-out (fluid-layout tiers, typeface config, design-token config — visual/config-only, not meaningfully unit-testable), no regressions
- Notable: found and fixed a latent bug while integrating Inter (a `--font-geist-sans`/`--font-sans` CSS variable naming mismatch meant the original Geist font was likely never actually applied); the browser-automation viewport-resize tool doesn't work in this sandboxed environment, compensated for by inspecting the compiled stylesheet directly to confirm the breakpoint media queries are correct

