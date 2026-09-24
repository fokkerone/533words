# Star Total (per-learner point total in the nav) Specification

**Slug:** star-total
**Status:** draft
**Depends on:** none (builds on the already-shipped user-accounts feature's `user_word_scores` table)

## Purpose

Each learner using 533words accumulates a per-word score as they practice (+1 correct, -1 incorrect, per word, already tracked in `user_word_scores`). This feature surfaces the signed-in learner's overall point total — the sum across every word — as a badge in the header, updating live as they practice, so progress is visible at a glance without navigating anywhere else.

## Requirements

### Requirement: Star Total Query
The system SHALL provide a way to compute the signed-in learner's total point count as the sum of their `score` across every `user_word_scores` row belonging to them, scoped to that learner only.

#### Scenario: Total reflects the sum of all the learner's scores
- GIVEN a learner with several flagged words whose scores sum to a known value
- WHEN their star total is fetched
- THEN the returned value equals that sum exactly

#### Scenario: A learner with no flags yet has a total of 0
- GIVEN a learner who has never flagged any word (no rows in `user_word_scores` for them)
- WHEN their star total is fetched
- THEN the returned value is 0 — not null, undefined, or NaN

### Requirement: Header Star Badge
The system SHALL display the signed-in learner's star total as a badge positioned next to their identity in the header, whenever a session is active.

#### Scenario: Badge shows the current total
- GIVEN an active session with a learner whose total is a known value
- WHEN the header is inspected
- THEN the badge displays that value

#### Scenario: A negative total displays as negative
- GIVEN a learner whose total is negative (more incorrect flags than correct)
- WHEN the header is inspected
- THEN the badge shows the actual negative value, not clamped or floored to 0

### Requirement: Live Update After Flagging
The system SHALL update the header's star badge to reflect the learner's new total immediately after a successful flag, without requiring a page reload.

#### Scenario: Flagging a word updates the badge
- GIVEN an active session with a current displayed total
- WHEN the learner flags a word (correct or incorrect) and the score write succeeds
- THEN the badge updates to reflect the new total without a full page reload

#### Scenario: A failed flag does not change the badge
- GIVEN an active session
- WHEN the learner flags a word and the score write fails (per the existing "Score write fails" error behavior)
- THEN the badge's displayed total remains unchanged — no optimistic update that would need to be rolled back

### Requirement: Star Total Is Scoped Per Learner
The system SHALL scope the star total query per learner (by their ID), so cached total data from one learner is never shown to a different learner on the same device.

#### Scenario: Switching accounts on the same device shows the new account's own total
- GIVEN Learner A's star total has already been fetched and cached on a device
- WHEN Learner B signs in on that same device
- THEN Learner B's own total is shown, not Learner A's cached value

## Error Behavior

- The system SHALL NOT crash or block the rest of the header if the star total fetch fails — the header's other controls (session-size selector, theme toggle, New Session, logout) SHALL remain fully usable regardless of the badge's fetch state.
- The system SHALL NOT include any other learner's `user_word_scores` rows in the computed total.

## Non-Functional Requirements

- No database schema changes — this feature only reads from the existing `user_word_scores` table (see [[data/word-bank-schema]]).
- Consistent with the existing client-direct Turso access pattern: no new API route, no server-side authorization layer, matching the same accepted trust boundary already documented for `words.ts`.

## Out of Scope

- A separately maintained/cached `user_id -> total` table updated incrementally on every flag — the total is computed on read via a `SUM` query, not stored redundantly (see DISCUSS.md's Key Decisions for the reasoning)
- An e-commerce-style 1-5 star rating widget — this is a running point total, not a rating
- Deriving the total from `useWords`'s already-loaded per-word scores — this uses a genuinely separate query/hook, independent of `useWords`
- Clamping or flooring a negative total to 0 for display
- Showing the star total on any page other than the practice screen's header (e.g. `/login`, `/register` have no signed-in learner)
- Any change to `writeWordFlag`'s actual write behavior — only its caller's query-invalidation list gains one more entry

## Glossary

- **Star total:** the sum of a learner's `score` across every word they've flagged (or 0 if they've flagged none) — a running point count, not a 1-5 rating.
- **Badge:** the small UI element in the header showing the star total next to the learner's identity.
