# Session Size Selector & Results Summary Specification

**Slug:** session-size-summary
**Status:** draft
**Depends on:** flashcard-session

## Purpose

This feature lets the learner choose how many words a practice session draws, and shows a summary of results once a session finishes. The size selector replaces the previously fixed 24-word session with a configurable choice, remembered across sessions. The results summary gives the learner (or the parent supervising practice) a quick overview of which words were answered correctly or incorrectly in the session that just ended.

## Requirements

### Requirement: Session Size Selection
The system SHALL provide a session size selector offering exactly the values 8, 16, 24, 32, and 64, defaulting to 24 when the learner has never chosen a value before.

The system SHALL be visible on the practice screen regardless of whether a session is currently active or complete.

Selecting a value SHALL immediately start a new session drawing up to that many words, discarding any in-progress session's remaining (unflagged) words without requiring confirmation — matching the existing "New Session" action's behavior.

#### Scenario: Choosing a session size with no session in progress
- GIVEN no session is currently active
- WHEN the learner selects a session size
- THEN a new session starts, drawing up to that many words from the word bank

#### Scenario: Choosing a session size while a session is in progress
- GIVEN a session is in progress with unflagged words remaining
- WHEN the learner selects a different session size
- THEN the in-progress session's remaining (unflagged) words are discarded without requiring confirmation
- AND a fresh session starts at the newly selected size
- AND scores already recorded for words flagged earlier in the discarded session are unaffected

#### Scenario: Selected size exceeds the word bank's size
- GIVEN the word bank contains fewer words than the selected session size
- WHEN a session starts
- THEN the session pool contains every word in the word bank, each appearing exactly once (unchanged from the existing "too few words available" behavior, now parameterized by the selected size instead of a fixed value)

### Requirement: Session Size Persistence
The system SHALL persist the learner's selected session size so it remains in effect after a page reload and in future sessions, until the learner changes it again.

#### Scenario: Selected size survives a reload
- GIVEN the learner has selected a session size other than the default
- WHEN the page is reloaded
- THEN the same session size is still shown as selected
- AND the next session started (including any automatic session start) uses that size

#### Scenario: First-ever use has no stored size
- GIVEN no session size has ever been selected on this device
- WHEN the app loads
- THEN the default size (24) is shown as selected and used for the first session

#### Scenario: Invalid stored size falls back to the default
- GIVEN a stored session size value that is outside the fixed set {8, 16, 24, 32, 64} (which cannot happen via the selector itself, only via a corrupted or externally modified stored value)
- WHEN that value is read back
- THEN the default size (24) is used instead

### Requirement: Flagged Word Order Tracking
The system SHALL record the order in which words were flagged during a session, in addition to what each word was flagged as.

The system SHALL preserve the existing guarantees that flagging a word that is not the current word, or flagging an already-flagged word, does not change the session's recorded results.

#### Scenario: Order reflects the sequence words were flagged
- GIVEN a session in which words were flagged in a particular sequence
- WHEN the session's recorded results are read
- THEN the words appear in exactly the sequence they were flagged in, not any other order

#### Scenario: A no-op flag attempt does not affect recorded order
- GIVEN a word that is not the current word, or a word already flagged
- WHEN a flag action targets it
- THEN the session's recorded order and results are unchanged by that action

### Requirement: Session Results Summary
The system SHALL, once a session is complete, display every word that was part of that session together with whether it was flagged correct or incorrect, ordered by the sequence in which the words were presented (flagged) during the session.

#### Scenario: Viewing results after completing a session
- GIVEN a session has just been completed (every drawn word has been flagged)
- WHEN the completion state is shown
- THEN a summary lists every word from that session together with its correct/incorrect result
- AND the words appear in the order they were presented during the session

#### Scenario: Starting a new session clears the previous results summary
- GIVEN a completed session's results summary is being shown
- WHEN the learner starts a new session (via the size selector or the "New Session" action)
- THEN the previous session's results summary is no longer shown

#### Scenario: Reloading after completing a session clears the results summary
- GIVEN a session was completed and its results summary was being shown
- WHEN the page is reloaded
- THEN the results summary is not restored
- AND a new session is auto-started instead, per the existing behavior of treating a completed stored session as nothing to restore

## Error Behavior

- The system SHALL NOT accept a session size outside the fixed set {8, 16, 24, 32, 64}.
- The system SHALL NOT lose or reorder a word's recorded flag result due to a no-op flag attempt (targeting a non-current or already-flagged word).

## Non-Functional Requirements

- The system SHALL persist the selected session size locally on the device, independent of session progress persistence and independent of speed/voice settings.

## Out of Scope

- Changing the size of an already-in-progress session without discarding it.
- A history of results across multiple past sessions — only the just-completed session's results are shown, and starting a new session clears them.
- Sorting or filtering the results summary (e.g. showing only incorrect words) — presentation order only.
- Exporting, printing, or sharing the results summary.
- Accepting a session size outside the fixed set of five values (no free-text or arbitrary count input).

## Glossary

- **Session size:** the number of words a session draws from the word bank (one of 8, 16, 24, 32, 64).
- **Results summary:** the list of every word from a just-completed session together with its correct/incorrect result, shown once the session is complete.
