# Discussion: Star Progress Display

Date: 2026-09-25
Participants: human + AI

## What We're Building

The header's existing star-total badge currently shows the raw integer sum of a learner's scores (e.g. "53"). This feature rescales that display by dividing by 10 (e.g. "5.3"), and adds two new pieces of information: how far the learner still is from a fixed goal of 533 (shown as a sentence, e.g. "Du benötigst noch 527.7 Sterne"), and — separately — a compact session-progress indicator ("2/16") shown above the current word during a practice session, so the learner can see how many words remain in the current session.

## Goals
- Rescale the header star badge from a raw integer to one decimal place (`total / 10`, formatted with `toFixed(1)`).
- Add a "Du benötigst noch X Sterne" sentence next to the star badge in the header, showing `(533 - total/10)` rounded to one decimal place via `toFixed(1)`.
- Replace that sentence with a "Ziel erreicht! 🎉" message once the goal (533) is reached or exceeded, instead of showing zero or a negative number.
- Add a compact "X/16"-style session-progress indicator above the current word, visible throughout an active session (before and after Reveal), where X = number of already-flagged words in the session + 1 (the current word), and 16 (or whatever the configured session size is) = `session.total`.

## Non-Goals (explicitly out of scope)
- No change to how the star total is computed or stored — this is purely a display change on top of the existing `fetchUserStarTotal`/`useUserStars` read path (see [[data/word-bank-schema]], [[ui/session-state-pattern]]).
- No change to the 533-word goal being configurable — 533 is hardcoded, matching the app's name/brand.
- No separate visible number for the difference (e.g. no standalone "527.7" badge) — the value is embedded directly in the "Du benötigst noch..." sentence.
- No progress indicator shown in the "Sitzung abgeschlossen" (results table) view, in the loading state, the error state, or the empty-word-bank state — it only applies to the active-session practice UI (`session?.current` truthy), consistent with the Play button's own current visibility condition.
- No changes to the session-size selector, session-state model, or any other part of the flashcard flow.

## Constraints
- **Technical:** Both the star total and the session progress source values already exist client-side — `displayedStarTotal` (via `useUserStars`) and `session.total`/`session.flagOrder.length` (via the existing `SessionState` shape, see [[ui/session-state-pattern]]). No new data fetching or schema changes are needed.
- **Scope:** All new visible/aria-label text must be German, per the established convention from [[patterns/german-ui-text]] (informal "du" tone, aria-labels translated too).
- **Other:** `total` from `user_word_scores` is always an integer (see [[data/word-bank-schema]]), so `total/10` is already exact to one decimal place — `toFixed(1)` is purely a formatting/rounding step, not a lossy correction, though the user has explicitly confirmed rounding via `toFixed(1)` is fine regardless.

## Key Decisions Made

### Decision: Star badge shows `total/10`, not the raw integer
**We will:** Format the existing header star badge as `(total / 10).toFixed(1)` (e.g. "5.3" instead of "53").
**Because:** explicit user request — the raw integer total is not the number the learner should see; everything is scaled down by 10.
**We won't:** Keep the raw integer anywhere in the header UI (no dual "53 / 5.3" display).

### Decision: Goal-difference sentence, not a separate number badge
**We will:** Show one sentence, "Du benötigst noch X Sterne", with `X = (533 - total/10).toFixed(1)`, placed in the header next to the star badge.
**Because:** simpler UI — a single readable sentence rather than a separate always-visible numeric element duplicating information already implied by the star badge.
**We won't:** Add a second, separate difference badge alongside the sentence.

### Decision: Goal-reached state replaces the sentence entirely
**We will:** When `total/10 >= 533`, show "Ziel erreicht! 🎉" in place of the "Du benötigst noch..." sentence.
**Because:** a negative or zero difference ("Du benötigst noch -3.2 Sterne" / "...0.0 Sterne") reads as broken or anticlimactic; an explicit success state is clearer and more rewarding.
**We won't:** Clamp the difference to a minimum of 0.0 and keep using the same sentence template.

### Decision: Session-progress counter includes the current word
**We will:** Compute session progress as `flagOrder.length + 1` out of `session.total`, so the very first word of a session shows "1/16", not "0/16".
**Because:** the learner is actively looking at word #1 at that point — counting only completed words would undercount by one and read as "0 of 16 done" rather than "on word 1 of 16".
**We won't:** Count only already-flagged words (which would start at "0/16").

### Decision: Session-progress indicator is always visible during an active session
**We will:** Show "X/16" above the word display area whenever `session?.current` is truthy — both during the pre-reveal (Play button/equalizer) state and the post-reveal (word shown) state.
**Because:** the point is to let the learner know how many questions remain regardless of whether they've revealed the current word yet.
**We won't:** Hide it before Reveal, or show it in the completed-session results view (it has no "current word" concept there — the results table's own "Sitzung abgeschlossen!" heading already communicates completion).

### Decision: Compact numeric format, not a full sentence
**We will:** Render the session-progress indicator as a compact "2 / 16" (visible text), with a German `aria-label` (e.g. "Wort 2 von 16") for screen readers.
**Because:** matches this app's established minimalist/editorial visual style (see [[ui/design-tokens-theming]]) — a full sentence would take more space above the hero word display for no added clarity.
**We won't:** Show the fully spelled-out "Wort 2 von 16" as visible body text.

## Open Questions
- [ ] None outstanding — all decision branches were resolved during discussion.

## Success Criteria
- [ ] Header star badge shows `total/10` formatted to one decimal place, replacing the raw integer display.
- [ ] Header shows "Du benötigst noch X Sterne" (X = `(533 - total/10).toFixed(1)`) next to the star badge, for any total below 5330.
- [ ] Header shows "Ziel erreicht! 🎉" instead of that sentence once total reaches or exceeds 5330 (i.e. `total/10 >= 533`).
- [ ] A compact "X / 16"-style progress indicator (X = `flagOrder.length + 1`, 16 = `session.total`) is shown above the word display whenever a session is active (`session?.current` truthy), both before and after Reveal.
- [ ] The progress indicator is not shown in the loading, error, empty-word-bank, or completed-session (results table) states.
- [ ] All new visible text and aria-labels are German, following the existing [[patterns/german-ui-text]] convention.

## Risks
- **Off-by-one confusion in the progress counter:** mitigated by the explicit decision above (`flagOrder.length + 1`) and by writing a dedicated scenario/test for the very first word of a session showing "1/16", not "0/16".
- **Floating-point display artifacts from `toFixed(1)`:** since `total` is always an integer, `total/10` and `533 - total/10` are exact to one decimal place in practice; `toFixed(1)` handles formatting/rounding uniformly regardless, so no special-casing is needed.

## Wiki References
- [[data/word-bank-schema]] — `fetchUserStarTotal`/`useUserStars`, the source of the raw integer total this feature reformats
- [[ui/session-state-pattern]] — `SessionState` shape (`total`, `flagOrder`), the header star badge's existing placement, and the `session?.current` visibility condition this feature reuses for the progress indicator
- [[patterns/german-ui-text]] — the German-UI text convention (informal "du", translated aria-labels) this feature's new strings must follow
- [[ui/design-tokens-theming]] — the minimalist/editorial visual style informing the "compact, not spelled-out" progress-indicator decision
