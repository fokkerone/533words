# Discussion: Weighted Session Selection

Date: 2026-09-25
Participants: human + AI

## What We're Building

The practice session's word selection currently draws a uniform random sample from the entire word bank, with no regard for how well a learner already knows each word (`startSession` in `src/lib/session.ts` is a plain shuffle-and-slice). This feature changes that: at least half of every session's words are now drawn from the learner's relatively weakest words (the lower half of the word bank when sorted by their own per-word score), so struggling and never-practiced words show up more often, and words the learner has already mastered show up less often — increasing the learning effect and naturally reducing repetition of words that no longer need practice.

## Goals
- At least 50% of a session's words are drawn from the learner's "weak pool" — the lower half of the entire word bank when sorted by that learner's own score (relative, not an absolute threshold like `score <= 0`).
- The remaining session slots are filled from all words not already drawn (weak or strong), so the weak proportion can naturally exceed 50% but never falls below it.
- No new database query or schema change — the selection logic operates entirely on the `Word[]` array `fetchWords` already returns (each word already carries the learner's own score).
- Existing session mechanics (pool size capped by available words, one-word-at-a-time random draw via `pickNextWord`, resumability via `localStorage`) are unaffected — this only changes how the initial pool is *assembled*, not how it's drawn from afterward.

## Non-Goals (explicitly out of scope)
- No explicit cross-session anti-repetition mechanism (e.g. "never repeat a word from the last session") — reduced repetition is accepted as a natural side effect of the weak-word bias, not a separately engineered guarantee. No new "last practiced" tracking is added.
- No distinction between "never practiced" and "practiced but currently netted to zero" — both are treated identically as ordinary words with a score of 0, ranked purely by that score alongside every other word.
- No change to `sessionSize` options, the session-size selector, or the `SessionState` shape.
- No change to how an individual word's score updates (`adjustScore`, `writeWordFlag`) — this is purely about which words get selected into a session, not how they're scored afterward.
- No UI change — the star badge, goal-distance message, and session-progress indicator (star-progress-display) are unaffected; a learner won't be able to see *why* a given word was selected.

## Constraints
- **Technical:** Pure client-side change to `startSession`/`createSessionState` in `src/lib/session.ts` — no Turso query changes, no new fields on `Word`. See [[ui/session-state-pattern]] for the existing pure-function design this extends.
- **Scope:** The word bank is a fixed 533 words (see [[data/word-bank-schema]]), always larger than any configured session size (max 64) — the "weak pool too small to fill the quota" edge case that would matter for an absolute-threshold definition is not practically reachable under a relative median-split definition, since the weak pool is always roughly half the entire bank (~266 words).
- **Other:** `score` can be negative (see [[data/word-bank-schema]]'s "not bounded below zero" note, added by star-progress-display) — the relative ranking naturally handles this the same as any other value, no special-casing needed.

## Key Decisions Made

### Decision: "Weak" is relative to the rest of the word bank, not an absolute score threshold
**We will:** Sort all of the learner's words by score ascending and treat the lower half (a median split) as the "weak pool" for that session.
**Because:** the user explicitly corrected an initial "score <= 0" proposal — a fixed threshold doesn't scale with how practiced a learner is overall (e.g. a very advanced learner might have almost no words at or below 0, making a fixed threshold's weak pool too small to matter; a brand-new learner has everything at 0, making a fixed threshold meaningless).
**We won't:** Use a fixed score threshold (e.g. `score <= 0`) to define the weak pool.

### Decision: At least 50% of the session from the weak pool, remainder from everything else
**We will:** Draw `Math.ceil(sessionSize / 2)` words at random from the weak pool (or fewer if the weak pool itself is smaller than that, which is not expected at this word-bank size), then fill the rest of the session at random from all not-yet-drawn words (weak or strong).
**Over:** A strict 50/50 split that shrinks the session size when the weak pool can't fill its half, or a strict two-pool split where the remainder is drawn only from the strong pool.
**Because:** the user explicitly wants the session to always be full (up to the configured size), and confirmed the remainder can be drawn from the whole remaining bank rather than being strictly quarantined to the strong pool — simpler to implement (one combined draw for the remainder) and means the weak proportion can only ever meet or exceed 50%, never open a gap below it.
**We won't:** Shrink the session below its configured size to preserve an exact ratio, or strictly separate the remainder draw from the weak pool.

### Decision: The final assembled list is explicitly shuffled
**We will:** After combining the weak-quota words and the remainder words into one list, explicitly shuffle that combined list (the same `sort(() => Math.random() - 0.5)` approach `startSession` already uses today) before it becomes the session's pool.
**Because:** explicit user instruction — the feature is scoped entirely to *which* words get selected (the weak-pool quota), not to changing anything about presentation order; an explicit final shuffle keeps that separation clean and makes no assumption about how the list was assembled (weak-quota words first, then remainder, both drawn from independent sub-selections). `pickNextWord` already draws a uniformly random index from the pool on every turn regardless, so this shuffle is not strictly load-bearing for randomness — but it's simple, matches the existing `startSession` pattern, and was explicitly requested.
**We won't:** Skip the shuffle on the assumption that `pickNextWord`'s own per-draw randomness makes it redundant.

### Decision: No new "never practiced" category
**We will:** Treat a word with `score === 0` as an ordinary point on the same relative ranking as every other word — whether that 0 comes from never having been flagged, or from an equal number of correct and incorrect flags.
**Over:** Adding a separate "unseen" signal (e.g. whether a `user_word_scores` row exists at all) that would need to be threaded through `fetchWords`'s existing `LEFT JOIN ... COALESCE(score, 0)` query.
**Because:** explicit user decision — a single relative ranking on `score` alone is simpler, requires no data-layer change, and still surfaces never-practiced words naturally (they start at 0, which is very likely to land in the lower half for any learner who has practiced at least some words successfully).
**We won't:** Distinguish "unseen" words from "netted-to-zero" words in this pass.

## Open Questions
- [ ] None outstanding — all decision branches were resolved during discussion.

## Success Criteria
- [ ] `startSession` (or its replacement) draws at least `Math.ceil(sessionSize / 2)` words from the weak pool (lower half of the word bank by score) whenever the weak pool is large enough to do so.
- [ ] The remaining session slots are filled from all words not already drawn, regardless of their score.
- [ ] A session's total word count is unaffected by this change — it remains `min(words.length, sessionSize)`, exactly as today.
- [ ] The presentation order (`pickNextWord`'s per-draw randomness) is unaffected — no regression in existing session-flow tests.
- [ ] No database schema or query changes.

## Risks
- **Ties at the median boundary:** when many words share the same score (e.g. a brand-new learner where every word is 0), the "lower half" split is an arbitrary-but-valid subset of tied words — accepted as fine, since the constraint ("at least half from the weak pool") is trivially satisfied when everything ties anyway.
- **Small word banks in tests:** unit tests using a handful of mock words need to construct realistic score spreads to meaningfully exercise the weak/strong split — noted for the eventual spec's test-design guidance, not a product risk (the real word bank is always 533 words).

## Wiki References
- [[ui/session-state-pattern]] — the pure, framework-free `session.ts` design (`startSession`, `createSessionState`, `pickNextWord`) this feature extends
- [[data/word-bank-schema]] — `fetchWords`'s `LEFT JOIN ... COALESCE(score, 0)` query (why "never practiced" and "netted to zero" are indistinguishable today), and the "score is not bounded below zero" note
