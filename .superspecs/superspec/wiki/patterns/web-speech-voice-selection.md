title: Web Speech API Voice Selection & Overlap Prevention
summary: How 533words picks a German voice, applies a manual override, and avoids overlapping playback with the browser's Speech Synthesis API — including a real async-loading race found and fixed during manual testing.
tags: [patterns, speech-controls, web-speech-api, testing]
spec: "[[speech-controls]]"
created: 2026-09-17
updated: 2026-09-17
provenance:
  sources: [specs/speech-controls/spec.md, specs/speech-controls/GRILL.md, phases/speech-controls-execute/review-log.md]
  extracted: 65%
  inferred: 30%
  ambiguous: 5%

# Web Speech API Voice Selection & Overlap Prevention

## Summary
`src/lib/speech.ts`'s `speak(text, rate, voiceURI?)` wraps the browser's Speech Synthesis API with automatic German-voice selection, an optional manual override, and always-cancel-before-speak to prevent overlapping audio. The most valuable finding here is a real async voice-loading race that only showed up in a live browser, not in unit tests.

## Context
The flashcard app needs word playback that reliably sounds German, lets the learner replay a word before writing it, and (later) lets them pick their preferred voice from a dropdown. All of this sits on top of `window.speechSynthesis`, which has real quirks around when its voice list is actually populated.

## Key Decisions

### Automatic voice preference order
**Chose:** a voice named exactly "Google Deutsch" (case-insensitive) first, then a `de-DE` voice, then any other `de-*` voice, then the browser's own default (no voice forced).
**Over:** stopping at de-DE preference alone.
**Because:** "Google Deutsch" was later identified as a noticeably higher-quality Chrome cloud voice compared to local system voices — added as a direct, explicit user request after the initial de-DE-only version shipped. ^[inferred: exact quality reasoning not stated, only that the user asked for it as default]
**Trade-off:** relies on an exact voice name match, which is Chrome/OS-specific and won't exist on every device — acceptable since the fallback chain still degrades gracefully to de-DE, then any German voice, then browser default.

### Manual override via an optional `voiceURI` parameter
**Chose:** `speak(text, rate, voiceURI?: string | null)` — optional, unlike `rate` which is a required parameter (see below).
**Over:** making voice selection entirely automatic (the original spec's Out of Scope line, later reversed by direct user request after Wave 1/2 were already built).
**Because:** unlike `rate` (which always has a meaningful value, default 1.0), "no specific voice chosen" is a real, valid, common state — most users will never override the automatic choice.
**Trade-off:** none significant. If the requested `voiceURI` doesn't match any currently available voice (e.g. removed after a browser update, or a stale value from a different device), `speak()` transparently falls back to automatic selection — no error surfaces to the learner.

### `rate` is required, `voiceURI` is optional — different rules, same file
This is a **contrast worth remembering** when adding a new parameter to `speak()` or a similar function: ask whether the parameter always has a meaningful value (make it required, per [[ui/session-state-pattern]]'s DB-write-ordering decision reasoning) or whether "no preference" is itself a valid, common state (make it optional). Getting this wrong in either direction either forces callers to pass a meaningless default, or lets them silently forget a value that always matters.

### Cancel before every speak
**Chose:** `synth.cancel()` unconditionally before `synth.speak(utterance)`, on every call.
**Because:** the Web Speech API queues speech by default rather than interrupting it — without this, pressing Play rapidly (or auto-play firing while a previous word is still being read) would stack up overlapping/queued audio instead of the new word replacing the old one immediately.

## Patterns

### Testing without a real Web Speech API
No real browser TTS engine, no wire-protocol mock — tests construct a plain mock object matching the small slice of `speechSynthesis`'s interface actually used (`getVoices`, `speak`, `cancel`, `addEventListener`/`removeEventListener`), and a mock `SpeechSynthesisUtterance` constructor that just records what was set on `this`. See `src/lib/speech.test.ts`. This mirrors [[patterns/fake-db-client-testing]]'s philosophy — a minimal fake matching the real interface, not a deep protocol-level simulation.

For testing an actual DOM event round-trip (not just the mock's recorded calls), a real `class FakeSpeechSynthesis extends EventTarget {}` instance is used instead of a plain mock object, since `EventTarget` gives real `addEventListener`/`dispatchEvent` semantics that a hand-rolled mock would otherwise have to reimplement.

## Gotchas

- **The `voiceschanged` race — found only in a live browser, not in unit tests.** The voice-selection dropdown (Manual Voice Selection feature) initially only ever showed "Automatic," despite the browser actually having 18 German voices loaded. Root cause: the list-loading effect only reacted to *future* `voiceschanged` events, but in practice the event had already fired — and the voice list had already finished loading — before the effect got a chance to attach its listener (React effects run after the initial paint; the browser's event can arrive within that same window). The fix: the effect must also proactively re-read the voice list once immediately on mount, not rely solely on the event. **This class of bug is invisible to a fully-mocked unit test** (tests controlled exactly when `listGermanVoices()` returned what), which is why it wasn't caught until manual verification in a real Chrome tab — a reminder that async-loading races involving real browser timing are a case where live manual testing finds bugs unit tests structurally cannot.
- **`"speechSynthesis" in window` is not the same as `!!window.speechSynthesis`.** A property can exist (so `in` returns true) while still holding `undefined` — this happens after certain test-cleanup patterns that reassign a property to `undefined` rather than deleting it. The fix that closed a real crash: check truthiness (`!window.speechSynthesis`) instead of property presence (`!("speechSynthesis" in window)`) wherever a genuinely-absent-or-unusable API needs to short-circuit.
- **`speak()` doesn't need a `voiceschanged` listener of its own.** Because it re-reads `getVoices()` fresh on every call rather than caching the list, the very next `speak()` call after the browser finishes loading voices automatically sees the up-to-date list — no event needed for automatic selection to eventually "self-correct." The listener is only genuinely necessary where something is *rendered once and left alone* (the voice dropdown's list of options), which can't "notice" new data without being told. An earlier version of `speak()` had a vestigial, do-nothing `voiceschanged` listener that was removed in code review for exactly this reason — worth remembering the distinction before adding a similar listener anywhere else in this codebase.

## Related
- [[ui/session-state-pattern]] — the required-vs-optional parameter reasoning this page's `rate`/`voiceURI` contrast builds on
- [[patterns/fake-db-client-testing]] — the sibling "minimal fake, not a deep mock" testing philosophy
- [[patterns/jsdom-radix-polyfills]] — the jsdom gaps hit getting the Slider/Select controls (used for speed and voice selection) to mount in tests
- `src/lib/speech.ts`, `src/lib/speech.test.ts`, `src/lib/voice-settings.ts` — implementation
