title: Word Bank Schema & Seeding
summary: The `words` table (id/text) and the per-learner `user_word_scores` table in Turso, how they're created/migrated, and how the 533-word CSV is idempotently seeded.
tags: [data, flashcard-session, user-accounts, star-total, turso, seeding]
spec: "[[flashcard-session]]"
created: 2026-09-16
updated: 2026-09-24
provenance:
  sources: [specs/flashcard-session/spec.md, specs/flashcard-session/GRILL.md, phases/flashcard-session-execute/review-log.md, specs/user-accounts/spec.md, phases/user-accounts-execute/review-log.md, specs/star-total/spec.md, specs/star-total/DISCUSS.md, phases/star-total-execute/review-log.md]
  extracted: 75%
  inferred: 20%
  ambiguous: 5%

# Word Bank Schema & Seeding

## Summary
The word bank is a Turso table, `words` (`id`, `text`), created by an idempotent migration and populated by an idempotent seed script from a plain-text CSV — one word per line, no header. Scoring was originally a global `score` column on `words` itself; since user-accounts (2026-09-18), scoring is per-learner via a separate `user_word_scores` table, and the `words.score` column has been dropped.

## Update (user-accounts, 2026-09-18): scoring moved off `words` entirely
**Chose:** A new `user_word_scores (user_id TEXT, word_id TEXT, score INTEGER DEFAULT 0, PRIMARY KEY (user_id, word_id))` table, with `words.score` dropped via `ALTER TABLE words DROP COLUMN score` (idempotent — checks `PRAGMA table_info(words)` first, falls back to clearing the column to 0 if `DROP COLUMN` isn't supported by a given libSQL build).
**Over:** Keeping `words.score` and adding a parallel per-user table, or pre-populating a score row for every `(user, word)` pair at signup.
**Because:** a global score column had no meaning once multiple learners existed; removing it (rather than leaving it unused) avoids a confusing, dead column. Score rows are created lazily — only the first time a learner flags a given word — mirroring the original `DEFAULT 0` behavior exactly (an unflagged word is implicitly 0 for that learner, via `LEFT JOIN user_word_scores ... COALESCE(score, 0)`).
**Trade-off:** the previous global score history was intentionally NOT migrated or attributed to any account — every learner (including the app's original user) starts fresh at 0. See [[auth/better-auth-setup]] for the full multi-user architecture this schema change was part of.
**`user_id` type:** `TEXT`, matching Better Auth's `user.id` column type — confirmed by directly querying `sqlite_master` against the real Turso DB after running Better Auth's own migration, not assumed. The FK to `user(id)` is declared even though that table is created by a separate migration step (`npx @better-auth/cli migrate`, not this project's own `initSchema`) — SQLite/libSQL doesn't validate FK targets at `CREATE TABLE` time, so migration order between the two doesn't matter.

## Update (star-total, 2026-09-24): aggregate totals computed on read, not cached
**Chose:** A `fetchUserStarTotal(client, userId)` function issuing `SELECT COALESCE(SUM(score), 0) AS total FROM user_word_scores WHERE user_id = :userId`, run fresh every time the header's star badge needs the value — no separate stored/maintained table.
**Over:** A literal `user_id -> total` cross-table, updated incrementally (+1/-1) alongside every `writeWordFlag` call — the shape actually requested at the start of `/discuss`, before being talked out of it.
**Because:** at this app's scale (max 533 rows per learner), a `SUM` aggregate is imperceptibly fast, and a maintained cache introduces real drift risk — any bug in an incremental-update path would silently corrupt the cached total forever with no self-healing, for no measurable performance benefit over just computing it. `COALESCE` is required specifically because SQL `SUM` over zero matching rows returns `NULL`, not `0` — a fresh account with no flags must still report a total of 0.
**Trade-off:** none significant at this scale; would need revisiting if the per-learner row count ever grew by orders of magnitude (not anticipated for a 533-word bank).
**Live updates without a cache:** `useFlagWord`'s `onSuccess` invalidates the star-total query key (`STAR_TOTAL_QUERY_KEY`, distinct from `WORDS_QUERY_KEY`) alongside its existing word-bank invalidation, so the header's badge re-fetches and shows the new total immediately after every flag — no optimistic update (a failed write leaves the badge showing its last known value, never a stale-but-changed one). See [[ui/session-state-pattern]] for where this connects into the header UI.

## Context
533words needed a persistent, scored word list before any session logic could run. Since the app talks to Turso client-direct (see [[techstack/profile]]'s "client-direct Turso" decision), both schema creation and seeding needed to be safe to re-run without special coordination — there's no migration framework, just two small scripts.

## Key Decisions

### Schema shape (original, flashcard-session)
**Chose:** `words (id TEXT PRIMARY KEY, text TEXT UNIQUE NOT NULL, score INTEGER NOT NULL DEFAULT 0)`.
**Over:** Any richer schema (categories, difficulty tiers, timestamps).
**Because:** The spec's CSV format decision was deliberately minimal — one column, no metadata — and YAGNI on anything not needed by the current flashcard-session feature.
**Trade-off:** A future "review hardest words" feature (deferred, see [[techstack/profile]]) will read `score` directly; no schema change anticipated for that, but categorization/tagging would need a migration.
**Superseded (2026-09-18):** `words.score` was dropped by user-accounts once scoring became per-learner — see "Update (user-accounts, 2026-09-18)" above. The current `words` table is just `(id, text)`; all scoring lives in `user_word_scores`.

### Idempotent seeding via SELECT-then-INSERT
**Chose:** For each word, `SELECT` by `text` first; only `INSERT` if absent.
**Over:** An `INSERT OR IGNORE` / upsert in a single statement.
**Because:** Grilled explicitly (see GRILL.md Q8/Q9 discussion) — this was simple enough for a one-off admin script and made the fake-DB-client test straightforward (see [[patterns/fake-db-client-testing]]).
**Trade-off:** Two round-trips per word instead of one — seeding all 533 words over HTTP took roughly a minute in practice. ^[inferred] Acceptable for a script that runs once (or rarely) against a personal-scale word list; would need batching if the word count grew by orders of magnitude. There's also a theoretical race condition under concurrent runs (two seed processes at once), explicitly accepted as out of scope since concurrent writes aren't a concern for this project (see [[techstack/profile]]'s single-user assumption).

## Interface / Contract

```ts
// src/lib/db.ts
export function getDb(): Client                         // lazy, memoized real Turso client
export async function initSchema(client: DbClient): Promise<void>  // CREATE TABLE IF NOT EXISTS words, user_word_scores
export async function dropWordsScoreColumn(client: DbClient): Promise<void>  // one-time destructive migration (user-accounts)

// scripts/seed-words.ts
export async function seedWords(
  client: DbClient,
  words: string[]
): Promise<{ inserted: number; skipped: number }>

// src/lib/words.ts (user-accounts: both now require a learner ID)
export async function fetchWords(client: DbClient, userId: string): Promise<Word[]>
export async function writeWordFlag(client: DbClient, userId: string, wordId: string, correct: boolean): Promise<Word>

// src/lib/words.ts (star-total)
export async function fetchUserStarTotal(client: DbClient, userId: string): Promise<number>  // COALESCE(SUM(score), 0)
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
- [[auth/better-auth-setup]] — the multi-user architecture that drove the `user_word_scores` split, and where `userId` comes from
- [[patterns/per-user-scoped-storage]] — the query-key-scoping convention `STAR_TOTAL_QUERY_KEY` follows, same as `WORDS_QUERY_KEY`
- `src/lib/db.ts`, `scripts/migrate.ts`, `scripts/seed-words.ts`, `scripts/data/words.csv` — implementation
