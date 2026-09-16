/**
 * One-off seed script: imports a plain-text, one-word-per-line word list
 * into the word bank, skipping any word whose text already exists.
 * Idempotent -- safe to re-run against the same file.
 *
 * Usage: npx tsx scripts/seed-words.ts [path/to/words.csv]
 * Defaults to scripts/data/words.csv when no path is given.
 * Requires NEXT_PUBLIC_TURSO_DATABASE_URL / NEXT_PUBLIC_TURSO_AUTH_TOKEN to
 * be set in the environment (e.g. via .env.local).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getDb, type DbClient } from "../src/lib/db";

const DEFAULT_WORDS_PATH = "scripts/data/words.csv";

export type SeedResult = {
  inserted: number;
  skipped: number;
};

/**
 * Core seeding logic: for each word, inserts it only if a row with that
 * exact text doesn't already exist. Testable against a fake DbClient
 * without touching a real database.
 */
export async function seedWords(
  client: DbClient,
  words: string[]
): Promise<SeedResult> {
  let inserted = 0;
  let skipped = 0;

  for (const text of words) {
    const existing = (await client.execute({
      sql: "SELECT text FROM words WHERE text = :text",
      args: { text },
    })) as { rows: unknown[] };

    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    await client.execute({
      sql: "INSERT INTO words (id, text, score) VALUES (:id, :text, 0)",
      args: { id: randomUUID(), text },
    });
    inserted++;
  }

  return { inserted, skipped };
}

/** Parses a plain-text file into one trimmed, non-empty word per line. */
function parseWordList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function main() {
  const path = process.argv[2] ?? DEFAULT_WORDS_PATH;

  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    console.error(
      `Seed failed: could not read word list at "${path}". ` +
        `Pass a path as the first argument, or place the file at "${DEFAULT_WORDS_PATH}".`
    );
    process.exit(1);
    return;
  }

  const words = parseWordList(raw);
  const result = await seedWords(getDb(), words);

  console.log(
    `Seed complete: ${result.inserted} inserted, ${result.skipped} skipped (already present).`
  );
}

// Only run the CLI wrapper when this file is executed directly (e.g. via
// `tsx scripts/seed-words.ts`), not when `seedWords` is imported for tests.
const isDirectRun =
  typeof process.argv[1] === "string" &&
  import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
