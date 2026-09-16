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
