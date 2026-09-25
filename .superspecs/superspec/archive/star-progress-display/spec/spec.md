# Star Progress Display Specification

**Slug:** star-progress-display
**Status:** draft
**Depends on:** none

## Purpose

Learners currently see their accumulated stars in the header as a raw integer sum (e.g. "53"), with no indication of how far they are from the app's namesake goal of 533, and no indication of how many words remain in their current practice session. This feature rescales the star display, adds a goal-distance message in the header, and adds a compact session-progress indicator above the practice word — so a learner always knows both their overall progress toward 533 and how much of the current session is left.

## Requirements

### Requirement: Header Star Badge Shows a Rescaled Value
The system SHALL display the learner's star total in the header divided by 10 and formatted to exactly one decimal place, replacing the previous raw-integer display.

#### Scenario: Star total rescaled to one decimal place
- GIVEN a signed-in learner whose star total is 53
- WHEN the header renders
- THEN the star badge SHALL show "5.3"

#### Scenario: Star total of zero
- GIVEN a signed-in learner whose star total is 0
- WHEN the header renders
- THEN the star badge SHALL show "0.0"

#### Scenario: Negative star total
- GIVEN a signed-in learner whose star total is -53 (more incorrect than correct flags overall)
- WHEN the header renders
- THEN the star badge SHALL show "-5.3"

### Requirement: Header Shows Distance to the 533 Goal
The system SHALL display a message next to the star badge stating how many more stars (rescaled, one decimal place) the learner needs to reach a total of 533, computed as `533 - (total / 10)`. This message SHALL only be shown once the learner's real star total has finished loading successfully, and SHALL be hidden below the `tablet` breakpoint (48rem/768px).

#### Scenario: Learner is below the goal
- GIVEN a signed-in learner whose star total is 53 (rescaled: 5.3), fully loaded
- AND the viewport is at least `tablet` width
- WHEN the header renders
- THEN it SHALL show the text "Du benötigst noch 527.7 Sterne"

#### Scenario: Distance recalculates as the star total changes
- GIVEN a signed-in learner viewing the header's goal-distance message
- WHEN their star total changes (e.g. after flagging a word correctly)
- THEN the goal-distance message SHALL update to reflect the new total, using the same `533 - (total / 10)` calculation

#### Scenario: Hidden while the star total is still loading
- GIVEN a signed-in learner whose star total has not yet finished loading
- WHEN the header renders
- THEN the goal-distance message SHALL NOT be shown
- AND the star badge SHALL continue to show its existing loading fallback ("0.0")

#### Scenario: Hidden after a star-total load error
- GIVEN a signed-in learner for whom the star total failed to load
- WHEN the header renders
- THEN the goal-distance message SHALL NOT be shown
- AND the star badge SHALL continue to show its existing error fallback ("0.0")

#### Scenario: Hidden below the tablet breakpoint
- GIVEN a signed-in learner whose star total is fully loaded and below the goal
- AND the viewport is narrower than the `tablet` breakpoint (48rem/768px)
- WHEN the header renders
- THEN the goal-distance message SHALL NOT be visible
- AND the star badge itself SHALL remain visible

### Requirement: Goal-Reached State Replaces the Distance Message
The system SHALL show a distinct success message instead of the goal-distance message once the learner's rescaled star total reaches or exceeds 533. This message occupies the same header slot as the goal-distance message, and is therefore subject to the same loading/error-hiding and `tablet`-breakpoint visibility rules defined under "Header Shows Distance to the 533 Goal".

#### Scenario: Rescaled total exactly equals the goal
- GIVEN a signed-in learner whose star total is 5330 (rescaled: 533.0)
- WHEN the header renders
- THEN it SHALL show "Ziel erreicht! 🎉"
- AND it SHALL NOT show a "Du benötigst noch..." message

#### Scenario: Rescaled total exceeds the goal
- GIVEN a signed-in learner whose star total is 5400 (rescaled: 540.0)
- WHEN the header renders
- THEN it SHALL show "Ziel erreicht! 🎉"
- AND it SHALL NOT show a negative-value message

### Requirement: Session-Progress Indicator Shows Current Position
The system SHALL display a compact indicator above the current word, in the form "X / Y", where X is the number of words already flagged in the current session plus one (for the word currently being presented), and Y is the total number of words in the session.

#### Scenario: First word of a session
- GIVEN an active session with a configured size of 16 words
- AND no words have yet been flagged
- WHEN the current word is presented
- THEN the progress indicator SHALL show "1 / 16"

#### Scenario: Mid-session position
- GIVEN an active session with a configured size of 16 words
- AND 1 word has already been flagged
- WHEN the next current word is presented
- THEN the progress indicator SHALL show "2 / 16"

#### Scenario: Last word of a session
- GIVEN an active session with a configured size of 16 words
- AND 15 words have already been flagged
- WHEN the final current word is presented
- THEN the progress indicator SHALL show "16 / 16"

### Requirement: Session-Progress Indicator Visibility Matches the Active-Session UI
The system SHALL show the progress indicator whenever a current word exists to present (both before and after the word is revealed), and SHALL NOT show it when there is no active session to report progress for.

#### Scenario: Visible before reveal
- GIVEN an active session with a current word not yet revealed
- WHEN the practice screen renders
- THEN the progress indicator SHALL be visible above the word display area

#### Scenario: Visible after reveal
- GIVEN an active session with a current word that has been revealed
- WHEN the practice screen renders
- THEN the progress indicator SHALL remain visible above the word display area

#### Scenario: Hidden while the word bank is loading
- GIVEN the word bank has not yet finished loading
- WHEN the practice screen renders
- THEN the progress indicator SHALL NOT be shown

#### Scenario: Hidden on a word-bank load error
- GIVEN the word bank failed to load
- WHEN the practice screen renders
- THEN the progress indicator SHALL NOT be shown

#### Scenario: Hidden when the word bank is empty
- GIVEN the word bank contains zero words
- WHEN the practice screen renders
- THEN the progress indicator SHALL NOT be shown

#### Scenario: Hidden after the session is complete
- GIVEN a session where every word has been flagged
- WHEN the "Sitzung abgeschlossen" results view renders
- THEN the progress indicator SHALL NOT be shown

## Error Behavior

- The system SHALL NOT display a negative number in the goal-distance message; once the calculated distance is zero or negative, the "Ziel erreicht! 🎉" message SHALL be shown instead.
- The system SHALL NOT show the session-progress indicator when `session.current` is null or undefined, regardless of the reason (loading, error, empty word bank, or completed session).
- The system SHALL NOT show either the goal-distance message or the "Ziel erreicht! 🎉" message while the star total is still loading or has failed to load — this header slot stays empty until a real star total has loaded successfully. The star badge itself is unaffected by this rule and continues to show its own existing loading/error fallback ("0.0").
- The system SHALL NOT show either the goal-distance message or the "Ziel erreicht! 🎉" message below the `tablet` breakpoint (48rem/768px), regardless of load state. The star badge remains visible at all viewport widths.

## Non-Functional Requirements

- All new visible text and `aria-label` values SHALL be in German, using the informal "du" tone, consistent with the existing convention (see Glossary: Confirmed Conventions).
- The session-progress indicator's visible text SHALL be the compact "X / Y" form; a German `aria-label` (e.g. "Wort X von Y") SHALL be provided for assistive technology. It SHALL NOT use `aria-live` — it is static text, read like any other content when a screen-reader user navigates to it, not actively announced on every word change.
- The goal-distance/goal-reached message SHALL be hidden below the `tablet` breakpoint (48rem/768px) via the project's existing Tailwind breakpoint convention (see [[ui/design-tokens-theming]]) — not by wrapping or truncating the text.
- No new network requests or schema changes are introduced — both the star total and the session-progress source values are already available client-side via existing data (`useUserStars`, `SessionState.total`, `SessionState.flagOrder`).

## Out of Scope

- Changing how the star total is computed, stored, or fetched (no changes to `fetchUserStarTotal`/`useUserStars`).
- Making the 533 goal configurable — it is a fixed constant matching the app's name.
- A separate, standalone numeric element for the goal distance (e.g. a second badge) — the value is embedded only in the sentence.
- Showing the session-progress indicator in the completed-session results view, the loading state, the error state, or the empty-word-bank state.
- Any change to the session-size selector, `SessionState` shape, or other parts of the practice flow not directly related to these two display additions.

## Glossary

- **Rescaled total:** `total / 10`, formatted with `toFixed(1)` — the value shown in the star badge and used in the goal-distance calculation. `total` is always an integer (see [[data/word-bank-schema]]) but is not bounded below zero — a learner with more incorrect than correct flags overall can have a negative total (see the "Negative star total" scenario).
- **Goal distance:** `533 - (total / 10)`, formatted with `toFixed(1)`.
- **Confirmed Conventions:** this spec follows the German-UI text convention established by the german-ui feature (informal "du" tone, translated aria-labels) — see [[patterns/german-ui-text]].
