# Discussion: Flashcard Session (Word Setup + Practice Flow)

Date: 2026-09-16
Participants: human + AI

## What We're Building

The core flashcard practice flow for 533words. A Turso (libSQL) database holds the 533 NRW spelling words, seeded once from a CSV via a one-off script. In the app, the user can start a new 24-word session (on app load or via a "New Session" button); each "Next Word" click picks a random not-yet-used word from that session's pool, the browser reads it aloud via the Web Speech API, the child writes it on paper, the app reveals the written word on screen, and the user flags it 👍/👎. That flag is persisted to Turso as a +1/-1 adjustment to the word's running score and mirrored into `localStorage` for the current session, so a session survives a page refresh. This continues until the 24-word session pool is exhausted.

## Goals
- Seed the Turso `words` table from a CSV of the 533 NRW words (idempotent — safe to re-run)
- Implement the 8-step session flow end to end: start session → next word → speak word → reveal → flag → score update → repeat
- No word repeats within a single 24-word session
- Word scores (correct/incorrect) persist across sessions in Turso, incrementing (+1) or decrementing (-1) per flag
- Session progress (which words are done, in what order) survives a page refresh via `localStorage`

## Non-Goals (explicitly out of scope)
- No in-app CSV upload UI — seeding is a one-off terminal script
- No auth/multi-user support
- No word list editing UI (add/remove/edit individual words) in this spec
- No "review hardest words" / spaced-repetition mode yet — just flat random session picking, score tracking is groundwork for a future feature
- No visual design polish beyond functional shadcn/ui components

## Constraints
- **Technical:** Client-direct Turso access only (`@libsql/client/web`), no API routes, per the tech stack profile. Web Speech API for TTS — no fallback audio files.
- **Scope:** CSV format is a single column, one word per line, no header row assumed unless the user's actual file has one (verify against the uploaded file).
- **Other:** Turso database is not yet provisioned — this spec includes asking the user to provision it and upload the CSV before the seed script can run.

## Key Decisions Made

### Decision: CSV import mechanism
**We will:** write a one-off Node/TS seed script (`scripts/seed-words.ts`) that reads a local CSV file and inserts words into Turso.
**Because:** the 533-word list is static/fixed; an in-app upload UI is unnecessary complexity for a personal project.
**We won't:** build an in-app upload screen.

### Decision: Seed idempotency
**We will:** skip inserting a word if it already exists in the DB (matched by word text), so re-running the script is always safe.
**Because:** avoids accidental duplicate rows if the script is run more than once.
**We won't:** error out on duplicates or allow duplicate rows.

### Decision: No repeats within a session
**We will:** pre-select 24 unique words when a session starts, then remove each word from the in-session pool as it's picked, so "Next Word" never repeats a word within that session.
**Because:** matches expected flashcard-drill behavior and was confirmed by the user.
**We won't:** do a pure random pick from the full list on every click.

### Decision: Session persistence
**We will:** mirror session progress (remaining pool, current word, per-word local flag) to `localStorage`, keyed to the active session.
**Because:** per the tech stack profile — a refresh mid-session shouldn't lose progress.
**We won't:** persist in-progress session state to Turso; only the final +1/-1 score adjustment per flagged word is written to the DB.

### Decision: CSV schema
**We will:** assume one column — the word text — one word per line, score initialized to 0 on insert.
**Because:** simplest possible format, confirmed by the user; no other word metadata exists yet.
**We won't:** support extra columns (category, difficulty, etc.) in this spec.

## Open Questions
- [ ] Turso database not yet provisioned — need the user to create it and provide `NEXT_PUBLIC_TURSO_DATABASE_URL` / `NEXT_PUBLIC_TURSO_AUTH_TOKEN` (scoped token) in `.env.local`
- [ ] Need the actual CSV file of the 533 NRW words from the user before the seed script can be run
- [ ] Exact CSV format (header row or not, encoding) needs to be confirmed once the file is provided
- [ ] What happens when a session pool is exhausted (24/24 done) — new session auto-starts, or explicit "Session complete" screen with a button? (default to an explicit completion screen with a "New Session" button, to be confirmed in spec)

## Success Criteria
- [ ] `words` table exists in Turso with `id`, `text`, `score` columns
- [ ] Seed script successfully imports the 533-word CSV, skipping duplicates on re-run
- [ ] User can start a new session (on load or via button) and get a shuffled 24-word pool with no repeats
- [ ] Clicking "Next Word" speaks the word aloud, reveals it on click/action, and accepts a 👍/👎 flag
- [ ] Flagging a word updates its score in Turso (+1/-1) and the session's local progress in `localStorage`
- [ ] Refreshing mid-session restores the in-progress session from `localStorage`

## Risks
- **Turso token exposure:** the auth token ships to the browser bundle. Mitigation: use a token scoped to this DB, read+write only (already noted in tech stack profile).
- **Web Speech API browser support/voice quality:** varies by browser/OS. Mitigation: accept default browser behavior for now; no fallback audio planned in this spec.
- **CSV format mismatch:** the actual file from the user might not match the assumed one-column format. Mitigation: verify against the real file before finalizing the seed script in the spec.

## Wiki References
- [[techstack/profile]] — stack decisions (Next.js, Tanstack Query, Turso client-direct, Web Speech API, minimal testing) that constrain this spec
