# Speech Controls (German Voice, Play Button, Speed) Specification

**Slug:** speech-controls
**Status:** draft
**Depends on:** flashcard-session

## Purpose

This feature makes the existing word read-aloud behavior more useful for the learner: the spoken word reliably uses a German voice when one is available, the learner can replay the current word as many times as needed via a Play control, and playback speed is adjustable and remembered across sessions. It extends the existing automatic read-aloud (triggered when a word is selected) rather than replacing it.

## Requirements

### Requirement: German Voice Selection
The system SHALL speak a word using a voice whose language is German (`de-*`) when at least one such voice is available on the device, preferring a `de-DE` voice if more than one German voice is available.

The system SHALL fall back to the device's default voice, without displaying any error or warning, when no German voice is available.

#### Scenario: A German voice is available
- GIVEN the device has at least one German-language voice installed
- WHEN a word is spoken (automatically or via the Play control)
- THEN the German voice is used (the `de-DE` voice, if more than one German voice exists)

#### Scenario: No German voice is available
- GIVEN the device has no German-language voice installed
- WHEN a word is spoken
- THEN the device's default voice is used instead
- AND no error or warning is shown to the learner

#### Scenario: The voice list loads asynchronously
- GIVEN the browser has not yet finished loading its list of available voices when the app starts
- WHEN the voice list finishes loading after that point
- THEN subsequent word playback uses the correctly selected German (or fallback) voice, not an incorrect choice made before the list was ready

### Requirement: Playback Speed
The system SHALL speak words at a configurable rate, adjustable within a range of 0.5x to 1.5x normal speed, defaulting to 1.0x.

The currently configured rate SHALL apply to all word playback, whether triggered automatically (on word selection) or manually (via the Play control).

#### Scenario: Default speed on first use
- GIVEN the learner has never adjusted the speed before
- WHEN a word is spoken
- THEN it is spoken at 1.0x (normal) speed

#### Scenario: Adjusted speed applies to playback
- GIVEN the learner has set the speed to a value within the 0.5x–1.5x range
- WHEN a word is spoken (automatically or via the Play control)
- THEN it is spoken at that configured rate

#### Scenario: Speed change takes effect on the next playback
- GIVEN a word is currently being spoken
- WHEN the learner changes the speed control while that playback is in progress
- THEN the in-progress playback is not required to change rate mid-utterance
- AND the newly configured rate applies starting with the next playback

### Requirement: Speed Persistence
The system SHALL persist the learner's configured speed so that it remains in effect after a page reload and in future sessions, until the learner changes it again.

#### Scenario: Speed survives a reload
- GIVEN the learner has set a non-default speed
- WHEN the page is reloaded
- THEN the previously configured speed is still in effect, both in the speed control's displayed value and in actual playback rate

#### Scenario: First-ever use has no stored speed
- GIVEN no speed has ever been configured on this device
- WHEN the app loads
- THEN the default speed (1.0x) is used and displayed

### Requirement: Manual Replay (Play Control)
The system SHALL provide a Play control, available only while the current word has not yet been revealed, that speaks the current word aloud when activated.

The system SHALL allow the Play control to be activated any number of times for the same not-yet-revealed word.

The system SHALL make the Play control unavailable once the current word has been revealed.

#### Scenario: Replaying the current word before reveal
- GIVEN a word has been selected in the current session and has not yet been revealed
- WHEN the learner activates the Play control
- THEN the current word is spoken aloud again, at the currently configured speed and voice

#### Scenario: Repeated activation before reveal
- GIVEN the learner has already activated the Play control once for the current, not-yet-revealed word
- WHEN the learner activates it again (still before reveal)
- THEN the word is spoken again without error

#### Scenario: Play control unavailable
- GIVEN either no word is currently selected (before the first pick, or after a session is complete) OR the current word has already been revealed
- WHEN the learner would attempt to use the Play control
- THEN the system does not attempt to speak anything (the control is inactive/unavailable in either case)

### Requirement: Overlapping Playback Prevention
The system SHALL ensure that starting a new instance of word playback (automatic or via the Play control) does not result in overlapping or queued audio from a still-in-progress previous playback.

#### Scenario: Play activated while a word is still being spoken
- GIVEN a word is currently being spoken aloud
- WHEN the learner activates the Play control before that playback finishes
- THEN the in-progress playback stops
- AND the new playback (of the same or a newly selected word) starts immediately, without both overlapping

## Error Behavior

- The system SHALL NOT display an error or warning when no German voice is available on the device (silent fallback, per the German Voice Selection requirement).
- The system SHALL NOT throw or interrupt the rest of the session flow if speech playback fails for any reason (device/permission issues, API unavailability) — this extends the existing no-throw guarantee of the underlying speech wrapper to the new voice-selection and rate logic.
- The system SHALL NOT allow the speed control to be set outside the 0.5x–1.5x range.

## Non-Functional Requirements

- The system SHALL persist the configured speed locally on the device (not tied to any particular session's data), independent of session progress persistence.

## Out of Scope

- Manual voice selection UI (choosing a specific voice by name, gender, or accent) — only automatic German-voice selection as described above.
- Adjusting pitch, volume, or any Web Speech API parameter other than rate.
- A warning or error UI shown when no German voice is available — the fallback is silent, by design.
- Bundled, downloaded, or server-provided TTS voices — relies entirely on voices already available via the browser's Web Speech API.
- Per-word or per-session speed overrides — one global speed setting applies everywhere until the learner changes it again.
- Confirmation or undo for speed changes.

## Glossary

- **German voice:** a voice exposed by the browser's Web Speech API whose language code begins with `de` (e.g. `de-DE`, `de-AT`).
- **Play control:** a UI control that triggers manual (learner-initiated) playback of the current word, independent of automatic playback.
- **Rate:** the Web Speech API's playback speed parameter, expressed here as a 0.5x–1.5x multiplier of normal speed.
