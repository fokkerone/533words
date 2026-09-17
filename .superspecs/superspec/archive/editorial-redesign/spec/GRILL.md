# Grill Session: Editorial Redesign (Exaggerated Minimalism)

Date: 2026-09-17
Spec reviewed: superspec/specs/editorial-redesign/spec.md

## Pre-flight

### Wiki conflicts
None.

### Techstack conflicts
None. Confirmed via codebase inspection: no `tailwind.config.*` file exists (Tailwind v4 `@theme` CSS approach, matching tasks.md's instruction).

### Internal contradictions
One gap found via codebase inspection: `globals.css` has an existing `.dark { ... }` block with old Nova-preset values, but the original spec draft (before this grill session) listed "Dark mode" as Out of Scope with no instruction for what to do with that block. Resolved in Q1 — this became the largest change of the session.

## Questions & Resolutions

### Q1: What should happen to the existing `.dark` block, given dark mode was originally out of scope?
**Recommended (initial):** Delete the block entirely, since dark mode is out of scope.
**Resolved:** Reversed by the user — dark mode is now explicitly IN scope, with a manual toggle button added to the header. This is a real scope expansion, not a small clarification.
**Impact:** Major spec changes — see below. Required two follow-up clarifying questions (toggle position, persistence/default) before the new requirement could be written precisely.

### Q1b: Toggle position and default/persistence behavior?
**Resolved:** Toggle lives in the header, next to the session-size selector and "New Session" button. Persisted like speed/voice/session-size (dedicated localStorage module). Defaults to light on first-ever use — NOT the device's `prefers-color-scheme`.
**Impact:** New "Dark/Light Theme Toggle" requirement added to spec.md with 3 scenarios; "Header Layout" requirement updated to include the toggle; new Task 1.2 (theme persistence module) added to tasks.md.

### Q1c: Dark palette derivation — inverted with identical accent, or accent adjusted for dark-mode contrast?
**Resolved:** Inverted background/foreground; the accent color is explicitly allowed (expected) to differ numerically between light and dark themes for contrast, while remaining recognizably the same vermillion hue.
**Impact:** Spec change — "Design Tokens Reflect the New Palette" requirement and its scenario updated to be per-theme ("exactly one non-neutral accent token exists *per theme*") rather than assuming one global accent value. tasks.md's Task 1.1 instructs rewriting (not deleting) the `.dark` block with its own adjusted accent.

### Q2: Should the "flash of wrong theme" on load (light paints first, then flips to a persisted dark preference) be fixed with a pre-hydration inline script, or accepted as a known rough edge?
**Recommended:** Accept it — consistent with this project's established minimal-polish stance ([[techstack/profile]]: no optimistic UI, no e2e tests, minimal error tracking).
**Resolved:** Confirmed, accepted.
**Impact:** tasks.md's Task 2.1 wording tightened to explicitly state this is an accepted rough edge, not left as an ambiguous "your call" for the executing subagent.

### Q3: Are Wave 1's two tasks (design tokens/dark palette, and theme persistence) still independent after adding dark mode to Wave 1?
**Recommended:** Yes — no shared imports; the actual wiring-together only happens in Task 2.1.
**Resolved:** Confirmed.
**Impact:** None — Wave 1's parallel structure stands as written.

### Q4: The "Fullscreen Fluid Layout" scenarios aren't meaningfully testable in jsdom (no real CSS layout engine) — should the spec say so explicitly, since tasks.md never asked for an automated test here but the scenario phrasing could mislead a subagent?
**Recommended:** Yes, add an explicit note.
**Resolved:** Confirmed — user will verify manually in a real browser regardless.
**Impact:** Spec change — explicit manual-verification note added under the "Fullscreen Fluid Layout" requirement, mirroring the existing Non-Functional Requirements visual-fidelity carve-out.

## Spec Changes Required

All changes below were applied directly to spec.md during the grill session:
- New Requirement: "Dark/Light Theme Toggle" (4 SHALL statements, 3 scenarios) — reverses the original "Dark mode out of scope" Non-Goal from DISCUSS.md
- "Header Layout" requirement and scenario updated to include the theme toggle
- "Design Tokens Reflect the New Palette" requirement and scenario reworded to be per-theme (light and dark each get their own single accent token)
- "Fullscreen Fluid Layout" requirement: explicit manual-verification note added for its two scenarios
- Out of Scope: "Dark mode / a second theme" replaced with "Following the device's system color-scheme preference" (the toggle is always manual)
- Purpose paragraph updated to mention the dark theme

tasks.md changes:
- New Task 1.2: theme persistence module (`theme-settings.ts`), parallel to Task 1.1
- Task 1.1 renamed and extended: now rewrites (not deletes) the `.dark` block with an adjusted-for-contrast accent, not just the light palette
- Task 2.1 renamed and extended: adds theme-toggle wiring (state, `dark` class application, persistence) as a third piece of work alongside layout restructure and auto-advance; test list extended with 3 theme-toggle test cases; flash-of-theme handling made explicit (accepted rough edge, not "your call")
- Context window budget updated (~7k → ~9k, still comfortably under 200k)

## Deferred Questions

None — all raised branches were resolved during this session.

## Verdict

**READY** — All decision branches resolved. Proceed to `/superspecs:pick-spec editorial-redesign`.
