# Discussion: Star Total (per-learner point total in the nav)

Date: 2026-09-24
Participants: human + AI

## What We're Building

A running point total ("Sterne") for the currently signed-in learner, shown as a badge in the header next to their identity. The total is the sum of that learner's score across all 533 words in `user_word_scores` (positive and negative, since a flag is +1/-1 per word — see [[data/word-bank-schema]]). It updates live as the learner practices: flagging a word immediately reflects in the header total, not just on reload.

## Goals
- A dedicated `useUserStars(userId)` Tanstack Query hook, backed by a real DB query (`SELECT SUM(score) ... WHERE user_id = ?`), independent of `useWords`
- Displayed as a badge next to the learner's identity in the header, showing the raw signed total (a negative total displays as negative, not clamped to 0)
- Live-updates: flagging a word invalidates the stars query alongside the existing `useWords` invalidation, so the badge reflects the new total immediately after each flag, not just on reload

## Non-Goals (explicitly out of scope)
- A maintained/cached total table (e.g. `user_id -> total` row updated incrementally on every flag) — considered and explicitly rejected in favor of computing the sum on read; see Key Decisions
- An e-commerce-style 1-5 star rating widget — "Sterne" here just means "points," not a rating UI
- Digit-summing ("Quersumme" in the literal German sense) — the original phrasing was a language slip; confirmed with the user this means a simple running sum
- Clamping/flooring the displayed total at 0 for negative scores
- Showing the star total anywhere outside the practice screen's header (e.g. `/login`, `/register` have no signed-in learner to show a total for)

## Constraints
- **Technical:** builds directly on `user_word_scores` (already exists, see [[data/word-bank-schema]]) — no schema migration needed. Follows the established client-direct Turso pattern (no new API route), scoped by `userId` from Better Auth's session (see [[auth/better-auth-setup]]), same Tanstack Query conventions as `useWords`/`useFlagWord` (see [[patterns/per-user-scoped-storage]] for the query-key-scoping convention this should also follow).
- **Scope:** read-only feature — no new writes, no changes to `writeWordFlag`'s write path itself, only its `onSuccess` gains an additional query invalidation.
- **Other:** a brand-new account (zero rows in `user_word_scores`) must show a total of 0, not blank/NaN — `SUM()` over zero matching rows returns SQL `NULL`, which needs coalescing to 0 in the query or the app layer.

## Key Decisions Made

### Decision: Compute the total on read, not a maintained cross-table
**We will:** Query `SUM(score)` from `user_word_scores` directly whenever the header needs the total, with no separate stored/maintained total table.
**Because:** the original request asked for a literal `user_id <-> total` cross-table, but at this app's scale (max 533 rows per learner, personal/classroom project) a `SUM` query is imperceptibly fast, and a maintained cache introduces real drift risk (any bug in an incremental-update path silently corrupts the total forever, with no self-healing) for no measurable performance benefit.
**We won't:** Build or maintain a separate table that duplicates data already fully derivable from `user_word_scores`.

### Decision: A genuinely separate `useUserStars` query, not derived from `useWords`
**We will:** Build a dedicated DB function + Tanstack Query hook for the star total, with its own query key, independent of `useWords` (even though `useWords` already returns every word annotated with the learner's own score, from which the total could technically be derived client-side for free).
**Because:** explicitly requested ("create the fetch with Tanstack Query"), and keeps the header self-sufficient regardless of what else is loaded on a given page — relevant since this app already has pages (`/login`, `/register`) outside the practice screen, even though the header/stars only ever appears on the gated practice screen today.
**We won't:** Derive the total from `useWords`'s already-cached per-word scores.

### Decision: Badge next to learner identity, raw signed total
**We will:** Show the total as a small badge (e.g. "⭐ 42") positioned right next to the learner's name/email in the header, displaying the actual signed value including negatives (e.g. "⭐ -3").
**Because:** keeps it visually tied to "whose total this is," and showing the real number (rather than hiding negative progress) matches this app's existing philosophy of showing real state rather than gamifying/softening it.
**We won't:** Clamp negative totals to 0, or place the badge as a separate standalone header element.

### Decision: Live update via query invalidation on flag
**We will:** Have `useFlagWord`'s `onSuccess` invalidate the star-total query key alongside its existing `useWords` invalidation, so the header updates immediately after every flag.
**Because:** matches the existing invalidation pattern exactly (no new mechanism), and is the behavior a learner would actually expect — see their total change right after flagging a word correct.
**We won't:** Require a manual refresh or page reload to see an updated total.

## Open Questions
- [ ] Exact badge styling/icon (⭐ vs. a different symbol, exact Tailwind classes) — left to `/spec`/implementation, consistent with how visual-only details have been handled in prior features.
- [ ] Loading/error state for the badge while `useUserStars` is pending or fails — reasonable default (show nothing, or a subtle placeholder, never block the rest of the header) to be nailed down during `/spec`/`/grill`.

## Success Criteria
- [ ] A signed-in learner's header shows their correct point total (sum of all their `user_word_scores` rows) on page load
- [ ] A brand-new account (no flags yet) shows a total of 0, not blank/NaN
- [ ] Flagging a word correct/incorrect updates the header's total immediately, without a reload
- [ ] Two different learners on the same device see their own, independent totals (never leaking, consistent with the existing per-learner query-key-scoping convention)
- [ ] A negative total displays as a negative number, not clamped to 0

## Risks
- **`SUM()` returning `NULL` for a fresh account:** must be explicitly coalesced to 0 — a known SQL gotcha, mitigated by writing a test for exactly this case during `/spec`'s task breakdown.
- **Forgetting the invalidation wiring:** if `useFlagWord`'s `onSuccess` isn't actually updated, the badge would silently show stale data until reload — mitigated by an explicit spec scenario + test for this.

## Wiki References
- [[data/word-bank-schema]] — the `user_word_scores` table this feature reads from; no schema changes needed
- [[auth/better-auth-setup]] — where `userId` comes from
- [[patterns/per-user-scoped-storage]] — the query-key-scoping convention this new hook should follow
- [[ui/session-state-pattern]] — the current header/nav structure this badge is added to
