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

## [2026-09-17] cleanup | removed stray example/unrelated content

- Removed: superspec/specs/auth-jwt/ (bundled SuperSpecs example, never built in this project), superspec/specs/subagent-orchestration/ (a half-grilled spec for SuperSpecs' own tooling, not a 533words feature), superspec/wiki/auth/jwt-pattern.md (the matching example wiki page)
- Updated: Home.md (dropped the auth domain row), _manifest.json (dropped the example manifest entry)
- Domains touched: auth (removed)

## [2026-09-18] ingest | user-accounts: Better Auth login/register + per-learner scores

- Created: auth/better-auth-setup.md, auth/Home.md, patterns/per-user-scoped-storage.md
- Updated: data/word-bank-schema.md (user_word_scores replaces global words.score), ui/session-state-pattern.md (Home/PracticeScreen split), techstack/profile.md (Better Auth, first server-side surface), patterns/Home.md, Home.md
- Domains touched: auth (new), data, ui, patterns, techstack
- Spec: `superspec/specs/user-accounts/spec.md`
- Test suite: 148/148 passing, 15/15 spec scenarios accounted for (13 automated, 2 explicitly manually-verified per GRILL.md's Google-OAuth-credential carve-out), no regressions
- Notable: this is the project's first feature with any server-side code (Better Auth's route handler + Next.js proxy.ts middleware). Found and correctly resolved a genuine Next.js 16 file-convention deprecation (`middleware.ts` → `proxy.ts`) mid-execution; a scenario-coverage gap (Tanstack Query cache scoping) was found and closed during `/verify` itself.

## [2026-09-24] ingest | star-total: per-learner point total in the nav

- Created: (none — extended existing pages rather than adding new ones)
- Updated: data/word-bank-schema.md (`fetchUserStarTotal`, computed-on-read decision over a maintained cache table), ui/session-state-pattern.md (`useUserStars` header badge as an independent query, not derived from `useWords`), Home.md
- Domains touched: data, ui
- Spec: `superspec/specs/star-total/spec.md`
- Test suite: 185/185 passing, 7/7 spec scenarios covered, no regressions
- Notable: the original request literally asked for a `user_id -> total` cross-table (a maintained cache), but this was explicitly talked out of during `/discuss` in favor of computing the sum on read (`SUM(score)` over `user_word_scores`) — no schema change needed, no drift risk. A scenario-coverage gap ("a failed flag does not change the badge") was found and closed during `/verify` itself, consistent with the pattern established across every prior feature in this project.

## [2026-09-25] ingest | german-ui: localize all remaining English UI chrome to German

- Created: patterns/german-ui-text.md
- Updated: patterns/Home.md, Home.md
- Domains touched: patterns
- Spec: `superspec/specs/german-ui/spec.md`
- Test suite: 190/190 passing, 14/14 spec scenarios accounted for (13 automated, 1 explicitly manually-verified by the user per GRILL.md's scoping decision — "no untranslated English text remains" is a visual completeness check, not automatable), no regressions
- Notable: three scenario-coverage gaps (theme-toggle visible German text, login page title, register page title + login cross-link) were found and closed during `/verify` itself — in every case the underlying implementation was already correct, consistent with the pattern established across every prior feature in this project. The "Reveal" translation was corrected from an initially-proposed "Wort einblenden" (15 chars, mobile layout-overflow risk) to the user's own shorter "Aufdecken" (9 chars) during `/grill`.

## [2026-09-25] ingest | star-progress-display: rescaled star badge, goal-distance message, session-progress indicator

- Created: (none — extended existing pages rather than adding new ones)
- Updated: ui/session-state-pattern.md (goal-distance message's loading/error-hiding and tablet-breakpoint-hiding rules, session-progress indicator derivation), data/word-bank-schema.md (star total is not bounded below zero — a real, reachable negative state), Home.md
- Domains touched: ui, data
- Spec: `superspec/specs/star-progress-display/spec.md`
- Test suite: 205/205 passing, 18/18 spec scenarios covered, no regressions
- Notable: two scenario-coverage gaps were found and closed during this project's now-standard `/verify` pass — one during Task 1.1's own code review (the goal-distance sentence's own recalculation wasn't separately asserted, only the star badge's), one during `/verify` itself (the tablet-breakpoint-hiding CSS class had no test, verified via `toHaveClass` since jsdom can't evaluate real media queries). Separately, this feature's branch was created from a `main` that predated the still-open german-ui PR, so it initially executed against untranslated English UI text — caught and fixed by rebasing onto `superspec/german-ui` mid-execution, and documented as a new branching convention in `CLAUDE.md` (branch from the latest merged state, or from a still-open prior feature's branch if its PR hasn't landed yet).

## [2026-09-25] ingest | weighted-session-selection: bias session selection toward the learner's weakest words

- Created: (none — extended the existing session-state-pattern page rather than adding a new one)
- Updated: ui/session-state-pattern.md (`startSession`'s weighted draw via the new exported `splitByRelativeScore` helper, and the testability decision to separate deterministic split logic from randomized draw logic), Home.md
- Domains touched: ui
- Spec: `superspec/specs/weighted-session-selection/spec.md`
- Test suite: 212/212 passing, 8/8 spec scenarios covered, no regressions
- Notable: no coverage gaps found during `/verify` this time — every scenario had a test written during execution itself, a first for this project's `/verify` history (every prior feature found and closed at least one gap during this stage). The grill session caught a genuine spec redundancy before execution (two scenarios that were mathematically the same case, described from two angles) and a testability improvement (pulling the weak/strong split into its own exported, deterministically-testable function rather than relying solely on repeated-draw statistical tests) — both resolved before any code was written, not discovered afterward.

