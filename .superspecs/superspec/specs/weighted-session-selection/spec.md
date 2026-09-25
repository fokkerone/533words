# Weighted Session Selection Specification

**Slug:** weighted-session-selection
**Status:** draft
**Depends on:** none

## Purpose

A practice session currently draws a uniform random sample from the entire word bank, regardless of how well the learner already knows each word. This means already-mastered words show up just as often as words the learner consistently struggles with, diluting the learning effect and wasting session time on repetition that no longer helps. This feature biases session selection toward the learner's relatively weakest words — at least half of every session — so struggling and never-practiced words are seen more often, while well-known words are seen less often, without ever guaranteeing a specific word won't appear.

## Requirements

### Requirement: The Word Bank Is Split Into a Weak Pool and a Strong Pool by Relative Score
The system SHALL rank all available words by the learner's own score, ascending, and SHALL treat the lower half of that ranking as the "weak pool" for that session, with the remaining words as available for the rest of the draw. This split is relative to the current word bank and the learner's own scores — it is not based on any fixed score threshold.

#### Scenario: Even-sized word bank splits evenly
- GIVEN a learner with scores across 100 words, all distinct
- WHEN a session is started
- THEN the 50 words with the lowest scores form the weak pool

#### Scenario: Odd-sized word bank rounds the weak pool up
- GIVEN a learner with scores across 101 words, all distinct
- WHEN a session is started
- THEN the weak pool contains 51 words (the lower half, rounded up)

#### Scenario: All words tied at the same score
- GIVEN a learner whose every word has an identical score (e.g. a fresh account where every word is 0)
- WHEN a session is started
- THEN the weak pool still contains exactly half the word bank (rounded up), drawn from the tied words in any valid order
- AND session creation SHALL NOT error or behave differently than the distinct-scores case

### Requirement: A Session Draws At Least Half Its Words From the Weak Pool
The system SHALL draw at least `ceil(sessionSize / 2)` words from the weak pool when composing a new session, provided the weak pool contains at least that many words.

#### Scenario: Standard session draws the expected weak-pool minimum
- GIVEN a word bank large enough that the weak pool has at least `ceil(sessionSize / 2)` words (true for every configured session size — 8, 16, 24, 32, 64 — against the 533-word bank)
- WHEN a session of size 24 is started
- THEN at least 12 of the resulting session's words come from the weak pool

#### Scenario: Weak pool smaller than the required minimum
- GIVEN a word bank small enough that the weak pool has fewer words than `ceil(sessionSize / 2)` (not expected against the real 533-word bank, but must not break)
- WHEN a session is started
- THEN every word in the weak pool is included
- AND the remaining session slots are filled per "The Rest of the Session Is Filled From All Remaining Words" below
- AND session creation SHALL NOT error or throw

### Requirement: The Rest of the Session Is Filled From All Remaining Words
The system SHALL fill any session slots not already filled by the weak-pool minimum by drawing at random from all words not yet drawn into the session (weak or strong), until the session reaches `min(available words, sessionSize)` words.

#### Scenario: Remainder can include additional weak-pool words
- GIVEN a weak pool larger than the minimum required draw
- WHEN a session is composed
- THEN words from the weak pool MAY appear in the remainder draw too, so the session's total weak-pool proportion MAY exceed 50%
- AND it SHALL NEVER fall below the minimum guaranteed by "A Session Draws At Least Half Its Words From the Weak Pool"

#### Scenario: Small word bank draws everything available
- GIVEN a word bank with fewer words than the configured session size
- WHEN a session is started
- THEN the session contains every available word, split as closely as possible to the weak/strong composition rules above
- AND no error occurs

### Requirement: The Assembled Session List Is Shuffled Before Use
The system SHALL randomly shuffle the combined list of weak-pool and remainder words before it becomes the session's word pool.

#### Scenario: Weak-pool and remainder words are not grouped together in the pool
- GIVEN a session composed of weak-pool words and remainder words
- WHEN the session's pool is assembled
- THEN the two groups are not left in two separate contiguous blocks (e.g. all weak-pool words first, then all remainder words) — the combined list is shuffled

### Requirement: No Word Appears Twice in the Same Session
The system SHALL NOT include the same word more than once in a single session's pool, regardless of how it was drawn (weak-pool minimum or remainder).

#### Scenario: Weak-pool and remainder draws never overlap
- GIVEN a session composed of a weak-pool draw and a remainder draw
- WHEN the session's pool is assembled
- THEN every word id in the pool is unique

## Error Behavior

- The system SHALL NOT throw or error when the weak pool is smaller than the minimum required draw (see "Weak pool smaller than the required minimum").
- The system SHALL NOT throw or error when the word bank itself has fewer words than the configured session size (existing behavior, unchanged, extended to the new selection logic).
- The system SHALL NOT throw or error when every word shares an identical score (see "All words tied at the same score").

## Non-Functional Requirements

- No database schema or query changes — this feature operates entirely on the `Word[]` array already returned by `fetchWords` (each word already carries the learner's own score via the existing `LEFT JOIN ... COALESCE(score, 0)`).
- No change to `SessionState`'s shape, to `pickNextWord`'s per-draw random selection, to `flagWord`, or to any persistence (`localStorage`) behavior — this feature only changes how the initial `pool` is assembled by `startSession`/`createSessionState`.
- No change to session resumability — a session restored from `localStorage` mid-session is unaffected, since this feature only concerns how a *new* session's pool is built.

## Out of Scope

- Any explicit cross-session anti-repetition tracking (e.g. "don't repeat a word from the last session") — reduced repetition is an accepted natural side effect of the weak-pool bias, not a separately engineered guarantee.
- Distinguishing "never practiced" words from "practiced but netted to zero" words — both are ordinary points on the same score ranking.
- Any change to `sessionSize` options, the session-size selector, or how a learner configures session size.
- Any change to how individual word scores are computed or written (`adjustScore`, `writeWordFlag`).
- Any UI change — no new visible indication of why a word was selected, no change to the star badge, goal-distance message, or session-progress indicator.

## Glossary

- **Weak pool:** the lower half (rounded up on odd counts) of the word bank when all words are ranked by the learner's own score, ascending. Relative to the current bank and learner, not a fixed threshold.
- **Strong pool / remainder pool:** the words not in the weak pool, i.e. the upper half of the ranking. Used loosely — the remainder draw (see "The Rest of the Session Is Filled From All Remaining Words") pulls from all not-yet-drawn words, not strictly from this pool alone.
- **Weak-pool minimum:** `ceil(sessionSize / 2)`, the minimum number of session slots guaranteed to come from the weak pool.
