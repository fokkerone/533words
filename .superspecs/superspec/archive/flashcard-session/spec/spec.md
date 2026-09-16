# Flashcard Session (Word Setup + Practice Flow) Specification

**Slug:** flashcard-session
**Status:** draft
**Depends on:** none

## Purpose

This feature lets a learner practice a fixed list of spelling words as flashcards. The system holds a persistent, scored word bank seeded once from a source list. From that bank, the learner runs one 24-word practice session at a time: the system speaks a word aloud, the learner writes it on paper, the system reveals the word, and the learner marks whether they got it right. Each mark adjusts that word's running score so words the learner struggles with can be identified later. Session progress survives an accidental page reload.

## Requirements

### Requirement: Word Bank Seeding
The system SHALL maintain a persistent word bank where each word has a unique text value and a running score, initialized to zero on first import.

The system SHALL import words into the word bank from a source list without creating duplicate entries for a word whose text already exists in the bank.

#### Scenario: Importing a fresh word list
- GIVEN an empty word bank
- WHEN a list of word entries is imported
- THEN every word in the list becomes a word bank entry with a score of zero

#### Scenario: Re-importing the same list
- GIVEN a word bank that already contains a word with text "Fahrrad"
- WHEN a list containing "Fahrrad" is imported again
- THEN the word bank still contains exactly one entry for "Fahrrad"
- AND its score is unchanged

### Requirement: Session Start
The system SHALL let the learner start a new practice session, either automatically when the application is opened with no session in progress, or explicitly via a "New Session" action.

The system SHALL build a session pool of up to 24 words drawn from the word bank, with no word appearing more than once in the pool.

#### Scenario: Starting a session with enough words available
- GIVEN a word bank containing at least 24 words
- WHEN the learner starts a new session
- THEN the session pool contains exactly 24 distinct words

#### Scenario: Starting a session with too few words available
- GIVEN a word bank containing fewer than 24 words
- WHEN the learner starts a new session
- THEN the session pool contains every word in the word bank, each appearing exactly once

#### Scenario: Starting a session with an empty word bank
- GIVEN a word bank containing zero words
- WHEN the learner starts a new session (automatically on app load, or explicitly)
- THEN no session pool is created
- AND the system displays a message indicating the word bank is empty instead of starting a session

#### Scenario: Starting a new session while one is in progress
- GIVEN a session already in progress with unflagged words remaining
- WHEN the learner explicitly starts a new session
- THEN the in-progress session's remaining (unflagged) words are discarded without requiring confirmation
- AND a fresh session pool is built
- AND scores already recorded for words flagged earlier in the discarded session are unaffected

### Requirement: Word Presentation
The system SHALL let the learner request the next word in the active session, which selects one word from the remaining session pool without replacement and removes it from that pool.

The system SHALL read the selected word aloud using the device's speech capability when it is selected.

#### Scenario: Requesting the next word
- GIVEN an active session with words remaining in its pool
- WHEN the learner requests the next word
- THEN one word is selected from the pool and removed from it
- AND the word is spoken aloud

#### Scenario: Requesting a word when the session is already complete
- GIVEN an active session whose pool is empty
- WHEN the learner requests the next word
- THEN no word is selected
- AND the system indicates the session is complete instead

### Requirement: Word Reveal
The system SHALL display the currently selected word's written text to the learner only after the learner performs an explicit reveal action, not immediately when the word is spoken.

#### Scenario: Revealing the current word
- GIVEN a word has been selected and spoken but not yet revealed
- WHEN the learner performs the reveal action
- THEN the word's text is displayed on screen

### Requirement: Flagging a Word
The system SHALL let the learner mark the currently revealed word as correct or incorrect exactly once per word per session.

The system SHALL increase a word's word-bank score by 1 when marked correct, and decrease it by 1 when marked incorrect.

The system SHALL record, for the active session, which words have been flagged and as what, in a way that survives a page reload during that session.

#### Scenario: Marking a word correct
- GIVEN a revealed word with a current word-bank score of N
- WHEN the learner marks it correct
- THEN the word's word-bank score becomes N + 1
- AND the session record shows that word as flagged correct

#### Scenario: Marking a word incorrect
- GIVEN a revealed word with a current word-bank score of N
- WHEN the learner marks it incorrect
- THEN the word's word-bank score becomes N - 1
- AND the session record shows that word as flagged incorrect

#### Scenario: Attempting to flag a word twice
- GIVEN a word that has already been flagged in the current session
- WHEN the learner attempts to flag that same word again
- THEN the word-bank score is not changed a second time for that action

#### Scenario: Flagging a word that is not the current word
- GIVEN an active session with a currently selected word and other words remaining in the pool
- WHEN a flag action targets a word other than the currently selected/revealed word
- THEN the word-bank score is not changed
- AND no flag is recorded for that action

#### Scenario: Score write fails
- GIVEN a revealed, not-yet-flagged word
- WHEN the learner marks it correct or incorrect and the word-bank score update fails to persist
- THEN the word remains in a "not yet flagged" state, not recorded as flagged in the session
- AND the system displays an error alert (shadcn `Alert` component) showing the failure to the learner
- AND the learner can retry the flag action on that word

#### Scenario: Speech synthesis unavailable
- GIVEN a word has been selected for presentation
- WHEN the device cannot speak it aloud (speech capability unavailable or the speak call fails)
- THEN the word is still selected and removed from the pool as normal
- AND the learner can still perform the reveal action and flag the word

### Requirement: Session Persistence Across Reload
The system SHALL restore an in-progress session — its remaining pool, current word, and already-flagged words — after a page reload, as long as the session has not been completed or explicitly replaced.

#### Scenario: Local session-state save fails after a successful score write
- GIVEN a revealed word is flagged and the word-bank score update succeeds
- WHEN the subsequent local session-state save fails
- THEN the word-bank score change is not rolled back
- AND the word is still treated as flagged for the remainder of the current in-memory session
- AND a future reload may not recover that specific flag's local record, which is an accepted limitation of local-only session persistence

#### Scenario: Reloading mid-session
- GIVEN an active session with some words already flagged and some remaining
- WHEN the page is reloaded
- THEN the session resumes with the same remaining pool and the same already-flagged words
- AND no already-flagged word is presented again in that session

### Requirement: Session Completion
The system SHALL indicate that a session is complete once every word in its pool has been flagged, and SHALL offer the learner a way to start a new session from that point.

A completed session's data SHALL remain in local storage, unmodified, until the learner starts a new session (which replaces it) — the system SHALL NOT proactively clear it on completion.

#### Scenario: Completing a session
- GIVEN a session with exactly one word remaining in its pool
- WHEN the learner flags that final word
- THEN the system indicates the session is complete
- AND offers a "New Session" action

## Error Behavior

- The system SHALL NOT create a duplicate word-bank entry for a word text that already exists.
- The system SHALL NOT change a word's word-bank score in response to a flag action on a word that was not the currently revealed word.
- The system SHALL NOT lose already-recorded score changes if a later action in the same session fails (e.g., a failed session-state save SHALL NOT roll back a score change that already succeeded).
- WHEN the device cannot speak a word aloud (e.g., speech capability unavailable or fails), the system SHALL still allow the learner to proceed with reveal and flagging for that word.

## Non-Functional Requirements

- The system SHALL persist word-bank scores durably, independent of any single browser/device session.
- The system SHALL persist in-progress session state locally to the device such that a reload does not require re-fetching or re-deriving the session pool from the word bank.

## Out of Scope

- Guarding against concurrent score updates from multiple tabs/devices open at once (single learner, single device/tab assumed; no optimistic-concurrency or conflict resolution)
- Separate databases per environment — production and preview/dev deployments use the same Turso database for now
- An in-app interface for uploading or editing the word list — seeding is a one-time operation outside the running application
- Multi-user support or per-user word banks
- A "review hardest words" or spaced-repetition session mode — this spec only tracks the score that such a feature would later use
- A history/analytics view of past sessions
- Editing or deleting individual word-bank entries after import
- Visual/interaction design polish beyond functional presentation of state described above

## Glossary

- **Word bank:** the full persistent collection of words and their scores.
- **Session:** one run of up to 24 words drawn from the word bank, tracked from start to completion.
- **Session pool:** the set of words in the active session not yet presented.
- **Flag:** the learner's correct/incorrect judgment on a revealed word.
