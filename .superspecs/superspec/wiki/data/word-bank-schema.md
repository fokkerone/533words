title: Word Bank Schema & Seeding
summary: The `words` table (id/text/score) in Turso, how it's created, and how the 533-word CSV is idempotently seeded into it.
tags: [data, flashcard-session, turso, seeding]
spec: "[[flashcard-session]]"
created: 2026-09-16
updated: 2026-09-16
provenance:
  sources: [specs/flashcard-session/spec.md, specs/flashcard-session/GRILL.md, phases/flashcard-session-execute/review-log.md]
  extracted: 80%
  inferred: 15%
  ambiguous: 5%

# Word Bank Schema & Seeding

## Summary
The word bank is a single Turso table, `words` (`id`, `text`, `score`), created by an idempotent migration and populated by an idempotent seed script from a plain-text CSV — one word per line, no header.

## Context
533words needed a persistent, scored word list before any session logic could run. Since the app talks to Turso client-direct (see [[techstack/profile]]'s "client-direct Turso" decision), both schema creation and seeding needed to be safe to re-run without special coordination — there's no migration framework, just two small scripts.

## Key Decisions

### Schema shape
**Chose:** `words (id TEXT PRIMARY KEY, text TEXT UNIQUE NOT NULL, score INTEGER NOT NULL DEFAULT 0)`.
**Over:** Any richer schema (categories, difficulty tiers, timestamps).
**Because:** The spec's CSV format decision was deliberately minimal — one column, no metadata — and YAGNI on anything not needed by the current flashcard-session feature.
**Trade-off:** A future "review hardest words" feature (deferred, see [[techstack/profile]]) will read `score` directly; no schema change anticipated for that, but categorization/tagging would need a migration.

### Idempotent seeding via SELECT-then-INSERT
**Chose:** For each word, `SELECT` by `text` first; only `INSERT` if absent.
**Over:** An `INSERT OR IGNORE` / upsert in a single statement.
**Because:** Grilled explicitly (see GRILL.md Q8/Q9 discussion) — this was simple enough for a one-off admin script and made the fake-DB-client test straightforward (see [[patterns/fake-db-client-testing]]).
**Trade-off:** Two round-trips per word instead of one — seeding all 533 words over HTTP took roughly a minute in practice. ^[inferred] Acceptable for a script that runs once (or rarely) against a personal-scale word list; would need batching if the word count grew by orders of magnitude. There's also a theoretical race condition under concurrent runs (two seed processes at once), explicitly accepted as out of scope since concurrent writes aren't a concern for this project (see [[techstack/profile]]'s single-user assumption).

## Interface / Contract

```ts
// src/lib/db.ts
export function getDb(): Client                         // lazy, memoized real Turso client
export async function initSchema(client: DbClient): Promise<void>  // CREATE TABLE IF NOT EXISTS words

// scripts/seed-words.ts
export async function seedWords(
  client: DbClient,
  words: string[]
): Promise<{ inserted: number; skipped: number }>
```

`DbClient` is a minimal structural type (`{ execute: (stmt) => Promise<...> }`) shared by both — see [[patterns/fake-db-client-testing]] for why.

## Gotchas

- **`tsx` doesn't auto-load `.env.local`:** Next.js's dev server injects `.env.local` automatically, but running `scripts/migrate.ts` / `scripts/seed-words.ts` directly via `tsx` does not — they failed with `LibsqlError: URL_INVALID: The URL 'undefined' is not in a valid format` until the npm scripts were changed to `tsx --env-file=.env.local <script>` (Node's built-in flag, no extra dependency needed).
- **CSV BOM handling "just works":** the real word list (`scripts/data/words.csv`) is UTF-8 with a BOM and CRLF line endings. `String.prototype.trim()` strips the BOM character along with whitespace, so `parseWordList`'s naive `split(/\r?\n/).map(trim)` needed no special BOM-stripping code. ^[inferred] Verified against the actual file during Task 3.2's manual verification — worth re-checking if a future word list comes from a different export tool that might not produce a BOM `trim()` happens to eat.
- **`db.ts`'s client had to become lazy:** the original scaffold's `export const db = createClient(...)` threw at *import* time under Vitest (no env vars loaded in test runs), breaking any test that imported from `db.ts` even indirectly. Fixed by deferring construction into a memoized `getDb()` function (Task 1.1).

## Related
- [[techstack/profile]] — overall stack, including the client-direct Turso / scoped-token decision this schema lives under
- [[patterns/fake-db-client-testing]] — how `initSchema`/`seedWords`/`fetchWords`/`writeWordFlag` are all tested without a real DB
- [[ui/session-state-pattern]] — how the seeded word bank feeds into a practice session
- `src/lib/db.ts`, `scripts/migrate.ts`, `scripts/seed-words.ts`, `scripts/data/words.csv` — implementation
