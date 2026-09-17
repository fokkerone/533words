title: Tech Stack Profile
tags: [techstack, setup, infrastructure]
created: 2026-09-16
updated: 2026-09-17
sources: [techstack-session, flashcard-session, speech-controls, session-size-summary, editorial-redesign]

# Tech Stack Profile

## Summary
533words is a personal flashcard app for the user's son to practice the 533 NRW spelling words: the browser reads a random word aloud, the child writes it on paper, the app reveals the word, and a thumbs up/down flags it correct/incorrect in the local DB — building a per-word difficulty score over time. Solo project, no deadline, greenfield.

## Stack Overview

| Domain | Technology |
|---|---|
| Frontend | Next.js (App Router) + React 19 + TypeScript, Tailwind v4, shadcn/ui |
| Backend | None — client-direct DB access, no API routes |
| Database | Turso (hosted libSQL/SQLite), `@libsql/client/web` |
| Auth | None (personal, single-user app) |
| Deployment | Vercel |
| CI/CD | Vercel Git integration (auto-deploy on push, preview per PR) |
| Monitoring | None (minimal setup — personal project) |

## Frontend

### Core
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Rendering:** Static/client — no server data needs, all state is client + Turso
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix base). Visual design follows "Exaggerated Minimalism" (near-monochrome + single non-neutral accent, huge fluid `clamp()`-scaled typography, extreme whitespace) since editorial-redesign — see [[ui/design-tokens-theming]]. Font is Inter (`next/font/google`), replacing the original Geist scaffold entirely. Custom Tailwind v4 `@theme` breakpoint tiers (`tablet`: 48rem / `desktop`: 64rem) plus a fixed-width ceiling above desktop.
- **State:** Local component state + Tanstack Query for Turso data; session progress mirrored to `localStorage`
- **Testing:** Vitest + Testing Library (jsdom)

### Recommended Skills
- `react-frontend` — React 19 / Next.js App Router patterns
- `ui-ux` — shadcn/ui + Tailwind component and accessibility patterns for the flashcard interaction
- `testing` — Vitest unit tests for word-selection/scoring logic

### Key Libraries
- next@16, react@19.2, react-dom@19.2 — core framework [required]
- typescript@5 — type safety [required]
- tailwindcss@4, shadcn/ui (radix-ui, class-variance-authority, tw-animate-css) — styling/components [required]
- @tanstack/react-query@5 — data fetching/caching for Turso reads/writes [required]
- lucide-react — icon set [recommended]
- vitest, @testing-library/react, @testing-library/jest-dom, jsdom — testing [required]

## Backend

### Core
- **Language:** N/A — no server logic
- **Framework:** N/A
- **API:** None — browser talks directly to Turso via `@libsql/client/web`
- **Database:** Turso (hosted libSQL), scoped read+write auth token (NOT account-wide, since the token ships to the client bundle)
- **Auth:** None

### Recommended Skills
- (none — no backend layer)

### Key Libraries
- @libsql/client — Turso client, imported from `@libsql/client/web` for browser/edge compatibility [required]
- Web Speech API (`window.speechSynthesis`) — native browser API for word read-aloud and voice selection, no package; see [[patterns/web-speech-voice-selection]] [required]

## Deployment & Infrastructure

- **Cloud:** Vercel
- **Compute:** Vercel static/edge hosting (no serverless functions needed — client-direct DB)
- **IaC:** None
- **Environments:** Single production environment; Vercel preview deployments per PR/branch
- **Dev server:** Next.js dev server requires `allowedDevOrigins` in `next.config.ts` to be reachable from other devices on the LAN (e.g. testing on a phone/tablet) — blocked by default as a CSRF protection; see `next.config.ts` for the current LAN IP entry, which needs updating if the network's DHCP reassigns it. ^[inferred: this is a Next.js 16 default behavior, confirmed via the dev server's own warning log during debugging, not something documented elsewhere in this project]

### Recommended Skills
- (none — Vercel handles hosting/build; no IaC or container work)

### Key Tools
- Vercel — hosting, deploys [required]
- Turso Cloud (Vercel Marketplace integration available) — hosted libSQL DB, free tier covers this scale [required]

## CI/CD

- **Pipeline:** Vercel Git integration
- **Merge gates:** None configured (solo project) — `npm run lint`, `npm run test`, `npm run build` all pass locally as of initial scaffold
- **Staging deploy:** Vercel preview deployments per branch/PR
- **Production deploy:** Auto-deploy on push to main
- **Release strategy:** None — direct push to main

### Recommended Skills
- (none — no CI pipeline beyond Vercel's built-in Git integration)

## Production-Readiness Checklist

```markdown
## Frontend — Production Checklist
- [ ] Error boundary around the session flow (word fetch / speech synthesis failures)
- [ ] Loading/empty states for word list fetch from Turso
- [ ] Speech synthesis fallback/message if browser doesn't support Web Speech API
- [ ] No Turso token committed to git (.env.local is gitignored — verify)
- [ ] Session state survives a page refresh mid-session (localStorage)

## Data — Production Checklist
- [ ] Turso auth token is scoped to this DB only, read+write, not account-wide
- [ ] Word score increments/decrements are atomic (avoid lost updates if two tabs open)
- [ ] Schema migration path decided before the word list ships (words table: id, text, score)

## Deployment — Production Checklist
- [ ] Turso env vars set in Vercel project settings (NEXT_PUBLIC_TURSO_DATABASE_URL, NEXT_PUBLIC_TURSO_AUTH_TOKEN)
- [ ] Vercel preview deployments use a separate/dev Turso DB (avoid preview writes polluting production scores)

## CI/CD — Production Checklist
- [ ] `npm run lint`, `npm run test`, `npm run build` kept green before each push (no CI gate — self-discipline only)
```

## Decisions & Constraints

- Direct client-side Turso access chosen over API routes — simpler for a solo/personal project; accepted tradeoff is the DB token being visible in the browser, mitigated by using a scoped token.
- Next.js chosen over plain Vite SPA (after initial back-and-forth) to keep the door open for API routes later, even though not used initially.
- No auth, no error tracking, no e2e tests — deliberately minimal for a personal single-user app for the user's son.

## Open Questions

- [x] ~~The actual NRW word list (533 words) — not yet loaded into the DB or app~~ — resolved 2026-09-16: real 533-word list seeded via `[[data/word-bank-schema|the word bank]]`'s seed script.
- [x] ~~Turso database not yet provisioned~~ — resolved 2026-09-16: provisioned and verified working end-to-end (see [[data/word-bank-schema]]).
- [ ] Whether preview/dev deployments should point at a separate Turso DB from production — still open; same DB used for all environments per `superspec/specs/flashcard-session/spec.md`'s explicit Out of Scope decision.

## Community Skills

### Universal
- **[Karpathy Guidelines](https://github.com/forrestchang/andrej-karpathy-skills)** — behavioral LLM coding guidelines (Think Before Coding, Simplicity First, Surgical Changes)
  `/install forrestchang/andrej-karpathy-skills`
- **[mattpocock/skills](https://github.com/mattpocock/skills)** — `/grill-me`, `/tdd`, `/handoff` and composable engineering discipline
  `npx skills@latest add mattpocock/skills`

### Stack-specific
- **Interface Design** — principle-based UI design system for consistent shadcn/Tailwind interfaces
  `/plugin marketplace add Dammyjay93/interface-design`

_Browse all community skills: https://awesome-skills.com/_

_Note: automated installation of these third-party skills was blocked by the session's permission classifier (untrusted code integration from external GitHub repos). The user should run the install commands above manually if wanted._

## Recommended Next Steps

1. ~~Provision a Turso database and fill in `.env.local`~~ — done.
2. ~~Load the 533 NRW word list into the DB~~ — done, see [[data/word-bank-schema]].
3. Install the community skills above (copy-paste install commands) if desired — still outstanding.
4. ~~Run `/superspecs:discuss` to plan the session flow feature~~ — done; see [[ui/session-state-pattern]] and [[patterns/fake-db-client-testing]] for what was built.
5. ~~Speech controls (German voice, Play button, speed, manual voice selection)~~ — done; see [[patterns/web-speech-voice-selection]].
6. ~~Session size selector + results summary~~ — done; see [[ui/session-state-pattern]]'s updated sections.
7. Reference this profile in every spec for consistency.
8. ~~Editorial redesign (fullscreen fluid layout, Inter, dark/light theme toggle, auto-advance replacing "Next Word")~~ — done; see [[ui/design-tokens-theming]] and [[ui/session-state-pattern]]'s `advance()` section.
9. Next feature candidates: a "review hardest words" / spaced-repetition mode (explicitly deferred in `superspec/specs/flashcard-session/spec.md`'s Out of Scope, but the score data it needs already exists — now made more directly actionable by session-size-summary's results view, which shows exactly which words were wrong). A real mobile/tablet visual spot-check of the editorial redesign outside the sandboxed dev environment used during execution is also still outstanding (see [[ui/design-tokens-theming]] Gotchas).
