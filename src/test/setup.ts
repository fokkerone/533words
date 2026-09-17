import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, but Radix UI primitives (e.g. the
// Slider used for playback speed) rely on it. Provide a minimal no-op
// polyfill so components using it can mount in tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}

// jsdom also doesn't implement scrollIntoView or pointer capture, which
// Radix's Select popover relies on when it opens/positions itself.
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
