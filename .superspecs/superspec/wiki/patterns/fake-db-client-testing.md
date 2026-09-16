title: Fake DB Client Testing (no real DB, no wire mock)
summary: The project's standard way to unit-test Turso-touching code — a plain in-memory object matching libSQL's `execute()` shape, not a real connection and not a network-level mock like MSW.
tags: [patterns, testing, flashcard-session, turso]
spec: "[[flashcard-session]]"
created: 2026-09-16
updated: 2026-09-16
provenance:
  sources: [specs/flashcard-session/GRILL.md, phases/flashcard-session-execute/review-log.md]
  extracted: 85%
  inferred: 10%
  ambiguous: 5%

# Fake DB Client Testing

## Summary
Any code that talks to Turso in this project is tested against a hand-written fake client — a plain object implementing the same `execute({ sql, args })` interface as `@libsql/client/web` and tracking real in-memory state — rather than a real Turso connection or a wire-protocol network mock (e.g. MSW).

## Context
flashcard-session's Wave 1/2 tasks needed to test schema migration, seeding, and score writes without hitting the real database in CI or on every local test run. Two alternatives were explicitly considered and rejected during spec-grilling:
- **A real local/in-memory libSQL instance** (Node-only `@libsql/client` against `:memory:` or a temp file) — rejected because the app itself only ever imports `@libsql/client/web` (HTTP-only, browser-compatible), and pulling in a second, Node-only client just for tests added a dependency and a second code path to keep in sync.
- **MSW (Mock Service Worker) intercepting the HTTP layer** — proposed mid-project, rejected because `@libsql/client/web` speaks a SQL-over-HTTP wire protocol (Hrana), and reimplementing enough of that protocol in MSW handlers to support arbitrary SQL was judged more complex and more brittle than the alternative below, for no real gain in test fidelity.

## Key Decisions

### The fake tracks real state, not just recorded calls
**Chose:** Fakes that maintain actual in-memory state (a `Set<string>` of inserted words, a `Map` of rows, etc.) and respond to `SELECT`/`INSERT`/`UPDATE` by regex-matching the SQL prefix.
**Over:** A fake that only records which SQL strings were called, asserting on the calls themselves.
**Because:** Tests then assert on real outcomes ("seeding 3 words twice yields exactly 3 rows") instead of on implementation details ("the SQL string contains ON CONFLICT"), matching the spec's literal scenario wording. `src/lib/db.test.ts` (Task 1.1, migration idempotency) is the one exception — it records calls only, since `initSchema`'s idempotency is inherent to `CREATE TABLE IF NOT EXISTS` and doesn't need a stateful fake to verify.

## Patterns

### The shared shape
```ts
type DbClient = {
  execute: (stmt: { sql: string; args?: InArgs }) => Promise<unknown>;
};
```
Defined once in `src/lib/db.ts`, imported by every module that needs to accept either the real `getDb()` client or a test fake — `scripts/seed-words.ts`, `src/lib/words.ts`.

### A representative fake (from `scripts/seed-words.test.ts`)
```ts
function makeFakeClient() {
  const rows = new Set<string>();
  return {
    rows,
    execute: async (stmt: { sql: string; args?: unknown }) => {
      if (/^\s*SELECT/i.test(stmt.sql)) { /* look up in `rows` */ }
      if (/^\s*INSERT/i.test(stmt.sql)) { /* add to `rows` */ }
      return { rows: [], columns: [], rowsAffected: 0 };
    },
  };
}
```
`src/lib/words.test.ts` follows the same shape with a `Map` (needs to store `score`, not just presence).

### Testing failure paths
For "does the caller surface a DB failure instead of swallowing it" tests (e.g. `writeWordFlag`'s "Score write fails" scenario), a second fake variant is used whose `execute` rejects on `UPDATE`/`INSERT` — no need for a whole mocking library, just a different fake function.

## Gotchas

- **Don't reach for MSW reflexively for DB code.** It's the right tool when the app calls a JSON REST/GraphQL API with a small number of predictable endpoints. It's the wrong tool when the "API" is actually an embedded SQL engine's wire protocol — you end up building a partial SQL engine in your test mocks. This came up explicitly mid-project (see GRILL.md Q8) and is worth remembering before reaching for it again on this codebase.
- **Component-level tests don't need the fake at all.** `src/app/page.test.tsx` mocks `@/hooks/use-words` directly (`vi.mock`) rather than wiring a fake DB client through Tanstack Query — the DB-call correctness is already covered at the `words.ts`/`words.test.ts` layer, so the UI test only needs to verify the component reacts correctly to hook state (loading/success/error), not re-derive DB behavior.

## Related
- [[data/word-bank-schema]] — the schema and seeding logic this pattern was built to test
- [[ui/session-state-pattern]] — the pure logic layer that needs no DB fake at all (framework- and DB-free by design)
- `src/lib/db.test.ts`, `scripts/seed-words.test.ts`, `src/lib/words.test.ts` — the actual fakes in use
