title: jsdom Polyfills for Radix UI Components
summary: The minimal no-op browser API polyfills needed in the shared Vitest setup for shadcn/Radix Slider and Select components to mount under jsdom.
tags: [patterns, testing, ui, speech-controls]
spec: "[[speech-controls]]"
created: 2026-09-17
updated: 2026-09-17
provenance:
  sources: [phases/speech-controls-execute/review-log.md]
  extracted: 80%
  inferred: 15%
  ambiguous: 5%

# jsdom Polyfills for Radix UI Components

## Summary
Several shadcn/ui components (built on Radix primitives) call real browser APIs that jsdom doesn't implement. Each one was added to `src/test/setup.ts` only when a component's tests actually failed without it — not preemptively.

## Context
As flashcard-session and speech-controls added more interactive shadcn components (`Slider` for playback speed, `Select` for voice selection), each one hit a different missing jsdom API the first time its component test tried to mount it.

## Patterns

### Add polyfills reactively, one component at a time
Each polyfill in `src/test/setup.ts` was added only in response to an actual test failure naming the missing API — not as an upfront "just in case" list. This kept the polyfill list minimal and each one traceable to a specific component/reason (documented inline).

```ts
// ResizeObserver — needed by Slider
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// scrollIntoView + pointer capture — needed by Select's popover
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof Element.prototype.hasPointerCapture === "undefined") {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element.prototype.setPointerCapture === "undefined") {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture === "undefined") {
  Element.prototype.releasePointerCapture = () => {};
}
```

## Gotchas

- **The error message names the exact missing API** (e.g. `candidate?.scrollIntoView is not a function`) — no guesswork needed, just add a no-op for that one API and re-run.
- **Each is guarded with a `typeof ... === "undefined"` check** so the polyfill never overwrites a real implementation if one is ever added to the test environment later.

## Open Questions

- [ ] Whichever Radix component is added next (a Dialog, a Tooltip, a Combobox) will likely need its own new polyfill the first time its test runs — expect this, don't try to pre-empt it.

## Related
- [[patterns/web-speech-voice-selection]] — the feature that needed the `Select` component this page's polyfills unblocked
- `src/test/setup.ts` — where every polyfill lives
