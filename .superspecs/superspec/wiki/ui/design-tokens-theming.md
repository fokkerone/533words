---
title: Design Tokens, Fluid Typography & Dark/Light Theming
summary: How editorial-redesign restyled the app as a near-monochrome editorial layout — shadcn CSS token structure, fluid clamp() typography, Tailwind v4 custom breakpoints, and a manually-toggled, localStorage-persisted dark/light theme.
tags: [ui, editorial-redesign, state-management, react]
spec: "[[editorial-redesign]]"
created: 2026-09-17
updated: 2026-09-17
provenance:
  sources: [specs/editorial-redesign/DISCUSS.md, specs/editorial-redesign/spec.md, specs/editorial-redesign/GRILL.md, phases/editorial-redesign-execute/review-log.md]
  extracted: 70%
  inferred: 25%
  ambiguous: 5%
---

# Design Tokens, Fluid Typography & Dark/Light Theming

## Summary
editorial-redesign restyled the practice screen from a bounded shadcn "Nova" card layout to a fullscreen, "Exaggerated Minimalism" editorial design (matched via the `ui-ux-pro-max` skill against a reference image), and added a manually-toggled dark theme. This page documents the resulting token/typography/breakpoint conventions and the theme-toggle pattern, all of which are reusable for any future screen in the app.

## Context
The user supplied a reference image (`ideas/idee1.webp`, a monochrome editorial design with huge bold headline typography) and asked for the whole app to be redesigned to match it, including a dark mode toggle added mid-grill (originally out of scope, then explicitly requested). The redesign only touches presentation and one interaction (auto-advance replacing a separate "Next Word" button, see [[ui/session-state-pattern]]) — no session/speech/persistence logic changed.

## Key Decisions

### One non-neutral accent color, shared by `--accent` and `--destructive`
**Chose:** A single vermillion value per theme (light `#e3452c`, dark `#ff5c3d`) used for *both* `--accent` and `--destructive` — not two different reds.
**Over:** Keeping a separate, distinct destructive/error red as shadcn's default scaffolding does.
**Because:** the reference image's "Exaggerated Minimalism" style uses exactly one non-neutral color against a black/white/grey palette; a second red would break that constraint. Grilled and confirmed as a Design Tokens requirement (`spec.md`'s "single non-neutral accent token" scenario).
**Trade-off:** interactive and error states are visually identical in hue — acceptable here since the app has no genuinely dangerous destructive actions (this is a personal flashcard app), so accent/error don't need to be visually distinguished. ^[inferred]

### Dark theme is a full rewrite of `.dark`, not a deletion
**Chose:** Dark and light are two complete token sets in `globals.css` (`:root` and `.dark`), with the dark accent numerically *different* from light (`#ff5c3d` vs `#e3452c`) — same hue, brighter for contrast on a dark background.
**Over:** Deleting the `.dark` block (the original plan, since dark mode was Out of Scope in the initial spec draft) or reusing the identical light accent value unchanged in dark mode.
**Because:** the user reversed the out-of-scope decision mid-grill ("update dark mode and add a dark/light mode toggle button"), then specified the accent should be "adjusted in dark mode," not identical — grilled into an explicit spec requirement: "the accent color adjusted (not necessarily numerically identical...) for adequate contrast against the dark background."
**Trade-off:** none significant — this is standard practice for dark-theme accent tuning.

### Manual toggle only, default light, never `prefers-color-scheme`
**Chose:** `loadTheme()`/`saveTheme()` ([[patterns/web-speech-voice-selection|same never-throw settings-module pattern]] as speed/voice/session-size) never reads `matchMedia`; first-ever use always defaults to `"light"` regardless of the OS/browser's dark-mode preference.
**Over:** Defaulting to the system preference on first load, then letting the manual toggle override it.
**Because:** explicit user decision during grilling ("Speichern, Standard = Hell/Referenzbild") — the reference image's aesthetic *is* the light theme, so first impressions should always match it.
**Trade-off:** a learner whose OS is set to dark mode sees a light-themed app on first visit until they manually toggle — accepted as correct behavior, not a bug.

### Theme application via a plain `useEffect`, no pre-hydration script
**Chose:** Theme state is `useState(loadTheme)` in `page.tsx`, applied to `document.documentElement` via a regular `useEffect` (same lazy-init-from-localStorage pattern as `rate`/`selectedVoiceURI`/`sessionSize`).
**Over:** A pre-hydration inline `<script>` in `layout.tsx` (the standard SSR dark-mode pattern, which avoids a flash of the wrong theme).
**Because:** explicitly accepted as a known rough edge during grilling ("is okay for now") — a brief flash of light before a persisted dark preference applies was judged not worth the extra complexity for a personal single-user app.
**Trade-off:** every dark-mode reload has a visible flash-of-light before the effect runs. ^[ambiguous: acceptable for now, but a candidate for revisiting if this app ever needs a more polished first paint]

## Patterns

### Fluid typography via `clamp()`, not fixed breakpoint font sizes
The hero word display scales its font-size fluidly with viewport width instead of jumping between fixed sizes per breakpoint:
```css
font-size: clamp(2.5rem, 6vw + 1rem, 9rem);
```
This lets the revealed word always use close to the available width, rather than looking too small on a wide viewport or overflowing on a narrow one. The exact clamp values are an implementation choice (spec explicitly left these unspecified, verified only by manual visual comparison against the reference image, not by an automated test).

### Tailwind v4 custom breakpoint tiers via `@theme`
```css
@theme {
  --breakpoint-tablet: 48rem;  /* 768px */
  --breakpoint-desktop: 64rem; /* 1024px */
}
```
This generates real `@media (min-width: 48rem)` / `@media (min-width: 64rem)` rules usable as `tablet:` / `desktop:` Tailwind variants (`tablet:px-8`, `desktop:px-12`, etc.) — confirmed directly by inspecting the compiled stylesheet (`document.styleSheets`/`cssRules`) during manual verification, since jsdom-based tests can't exercise real viewport-driven CSS. Above the desktop tier, layout growth is capped by a plain max-width utility class (`.container-editorial`, `max-width: 90rem`) rather than a fourth breakpoint tier — the spec calls for "fixed width" above desktop, not a new fluid range.

### Theme toggle convention
Standard Tailwind/shadcn `.dark` class convention, already present in `globals.css` before this feature (`@custom-variant dark (&:is(.dark *));`) — editorial-redesign is the first feature to actually wire up a UI control (`document.documentElement.classList.toggle("dark", theme === "dark")`) that flips it. Any future theme-aware component should key off this same `.dark` class ancestor selector, not a separate context or prop.

## Gotchas

- **Latent unused-CSS-variable bug found while integrating Inter:** the pre-existing scaffold set `--font-geist-sans` on `<html>`, but `globals.css`'s `@theme inline` block read from `--font-sans` — a naming mismatch that likely meant the original Geist font was never actually applied via Tailwind's `font-sans` utility (silent fallback to the system font stack). Found and fixed while swapping in Inter (`variable: "--font-sans"` in `layout.tsx`, consistent naming throughout `globals.css`). Worth checking font-variable naming consistency any time a font is swapped in this project going forward.
- **Browser viewport resize doesn't work in this project's sandboxed dev/test environment:** the browser-automation `resize_window` tool reports success but doesn't actually change `window.innerWidth` in this sandbox (confirmed independently by two separate verification passes). True narrow-viewport visual/responsive testing needs a real device or a non-sandboxed browser; the compiled-stylesheet-inspection technique above (walking `document.styleSheets`) is a reasonable fallback to confirm the underlying CSS mechanism is sound when a real resize can't be performed.

## Interface / Contract

```ts
// src/lib/theme-settings.ts
type Theme = "light" | "dark";
function saveTheme(theme: Theme): void;   // never throws
function loadTheme(): Theme;              // never throws, defaults to "light", never reads matchMedia
```

## Open Questions

- [ ] Whether to add a pre-hydration inline script to eliminate the flash-of-light on reload with a persisted dark preference — deferred, accepted as-is for this pass.

## Related
- [[ui/session-state-pattern]] — the `advance()` auto-advance pattern this same feature introduced alongside the visual redesign
- [[techstack/profile]] — Inter font, Tailwind v4 breakpoint approach, "Exaggerated Minimalism" style now part of the project's stack profile
- `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/theme-settings.ts`, `src/app/page.tsx` — implementation
