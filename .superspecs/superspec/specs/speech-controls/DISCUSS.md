# Discussion: Speech Controls (German Voice, Play Button, Speed)

Date: 2026-09-16
Participants: human + AI

## What We're Building

An extension of the existing word-readout feature (`speak(text)` in `src/lib/speech.ts`, currently called automatically whenever a new word is picked). Three additions: (1) the spoken word should reliably use a German voice rather than whatever the browser's default happens to be, (2) a visible Play button lets the learner replay the current word as many times as needed, and (3) a speed slider (0.5x–1.5x, default 1.0x) controls how fast the word is spoken, with the chosen speed remembered across sessions via `localStorage`.

## Goals
- The word is spoken in German whenever possible (first available `de-*` voice; falls back to the browser's default voice, silently, if none is installed — no error shown).
- A Play button on the practice screen replays the current word's audio on demand, any number of times.
- Automatic read-aloud on word selection is kept (current behavior), the Play button is additive.
- A speed slider (0.5x–1.5x range, default 1.0x) controls playback rate for both automatic and manual playback.
- The chosen speed persists across page reloads and future sessions (localStorage), not just the current session.

## Non-Goals (explicitly out of scope)
- Manual voice selection UI (picking a specific voice by name/gender) — only automatic German-voice selection.
- Pitch, volume, or other Web Speech API parameters beyond rate.
- A "no German voice available" warning/error UI — silent fallback only, per decision below.
- Offline/bundled TTS voices — relies entirely on whatever voices the browser/OS expose via the Web Speech API.
- Changing speed per-word or per-session-variance — one global speed setting, changed via the slider, applies to all subsequent playback.

## Constraints
- **Technical:** Must stay within the Web Speech API (`window.speechSynthesis`, `SpeechSynthesisUtterance`) per the project's tech stack decision (no TTS package/service) — see [[techstack/profile]].
- **Technical:** `speechSynthesis.getVoices()` can return an empty list synchronously on first call in some browsers, populating asynchronously via the `voiceschanged` event — voice selection logic must handle this (retry/listen for the event) rather than assuming voices are available immediately.
- **Scope:** Builds on the existing `speak()` wrapper in `src/lib/speech.ts` (already handles "API unavailable" safely) — this feature extends it with voice + rate parameters, not a rewrite.
- **Other:** Speed persistence should follow the existing generic `saveSession`/`loadSession` pattern in `src/lib/session-storage.ts` if a natural fit, or a similarly simple dedicated localStorage key — to be settled in the spec.

## Key Decisions Made

### Decision: Automatic + manual playback both stay
**We will:** keep the existing auto-speak-on-word-selection behavior and add a Play button as an additional, repeatable trigger for the same audio.
**Because:** removing auto-play would be a regression for the existing flow; the Play button solves "I missed it, say it again" without changing the established rhythm of the session.
**We won't:** make playback purely manual (Play-button-only).

### Decision: Silent fallback when no German voice exists
**We will:** pick the first available voice whose `lang` starts with `de` (preferring `de-DE` if multiple German voices exist), and fall back to the browser's default voice with no error/warning if none is found.
**Because:** most target devices will have a German voice given the learner is practicing German spelling; a missing-voice warning would be noise for the common case and this project's minimal-UI stance (see [[techstack/profile]]'s "no error tracking, minimal testing" decisions).
**We won't:** show an error or warning UI when no German voice is available.

### Decision: Speed range and persistence
**We will:** a slider from 0.5x to 1.5x, default 1.0x, persisted to `localStorage` so it survives reloads and future sessions.
**Because:** confirmed directly by the user; matches the existing project pattern of persisting learner-relevant state locally (session progress already does this).
**We won't:** offer discrete speed presets instead of a continuous slider, or reset speed per session.

## Open Questions
- [ ] Exact voice-selection retry strategy for the `voiceschanged` async-population quirk — implementation detail to resolve in the spec, not a product decision.
- [ ] Whether the Play button and speed slider live directly on the practice `Card` (`src/app/page.tsx`) or in a small dedicated component — implementation detail for the spec/tasks, not a behavioral question.

## Success Criteria
- [ ] Word playback uses a German voice when one exists on the device, with no visible error when it doesn't.
- [ ] A Play button is visible during an active session and replays the current word's audio any number of times.
- [ ] A speed slider (0.5x–1.5x) is visible and audibly changes playback rate for both automatic and Play-button-triggered speech.
- [ ] The chosen speed is still in effect after a full page reload.

## Risks
- **Voice list availability timing:** `getVoices()` can be empty on first call in some browsers (notably Chrome) until `voiceschanged` fires. Mitigation: voice selection logic listens for that event and re-selects once voices load, rather than only checking once at app start.
- **Browser/OS voice quality varies:** the actual audio quality of any given German voice depends entirely on the browser/OS, not something this app controls. Accepted — no mitigation possible within scope.

## Wiki References
- [[techstack/profile]] — confirms Web Speech API as the only TTS mechanism (no package/service), motivating the "stay within existing API" constraint
- [[ui/session-state-pattern]] — documents the current `speak(text)` call site (`handleNextWord` in `src/app/page.tsx`) that auto-play must continue to use
