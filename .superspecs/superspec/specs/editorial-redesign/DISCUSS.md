# Discussion: Editorial Redesign (Exaggerated Minimalism)

Date: 2026-09-17
Participants: human + AI

## What We're Building

A full visual redesign of the practice screen, replacing the current shadcn "Nova"/Geist-font look with a bold, monochrome, editorial-poster aesthetic matching a reference image (`ideas/idee1.webp` — a "Designers & Quotes" card layout: label + brand header row, a huge bold black headline on a light-grey background, a name + bio + portrait row beneath it). The app becomes fullscreen and fluid-responsive (no more centered card with a fixed max-width), using Inter as the sole typeface loaded via `next/font/google`, fluid `clamp()`-based typography for the hero word display, and a near-monochrome color palette (black/white/grey) plus a single vermillion accent color, expressed as updated shadcn CSS variables.

Alongside the visual overhaul, one real interaction change: the standalone "Next Word" button is removed. Flagging a word (👍/👎) now also auto-advances to (and auto-speaks) the next word in the same action — no separate click needed.

## Goals
- Fullscreen, fluid-responsive layout (not a centered fixed-width card) with 3 breakpoint tiers (mobile/tablet/desktop) plus a fixed-width ceiling above desktop.
- Visual design matching the reference image's "exaggerated minimalism" style: monochrome (black/white/grey) + one vermillion accent color, huge bold fluid headline typography, extreme negative space, no decorative chrome.
- Inter as the only typeface, loaded via `next/font/google` (Next.js's typed font loader), replacing Geist/Geist Mono.
- shadcn CSS variables (`--background`, `--foreground`, `--primary`, `--accent`, `--border`, `--destructive`, etc.) redefined to match this palette, replacing the current "Nova" preset values — a full replacement, not an additional theme option.
- Layout mapped from the reference:
  - Header: brand ("533words") left; session-size selector + "New Session" button right (where the reference has its logo).
  - Hero section: the current word, once revealed, shown in huge fluid `clamp()` typography (where the reference's headline quote is); before reveal, a large Play button occupies the same centered space instead (and disappears once the word is revealed, matching the existing Play-only-before-reveal rule from speech-controls); a compact bar for speed + voice selection sits at the bottom of this same section.
  - Below the hero section (where the reference's name/bio/portrait row is): the "Wort einblenden" (reveal) action and the 👍/👎 buttons.
- Remove the standalone "Next Word" button; flagging a word auto-advances to and auto-speaks the next word in one action.

## Non-Goals (explicitly out of scope)
- Changing any session/speech/persistence *logic* (`session.ts`, `speech.ts`, `session-size-settings.ts`, `speech-settings.ts`, `voice-settings.ts`) — this is a presentation-layer and one specific interaction-flow change, not a rewrite of the underlying state machine.
- Dark mode (the reference is a single light-mode-only aesthetic; this redesign does not add a dark theme).
- Animation/motion design beyond what's needed for basic state transitions (the existing fade-in-on-reveal transition is kept; no new choreographed motion is in scope).
- A logo/wordmark redesign beyond styling the existing "533words" text as a header brand mark.
- Changing the results-summary table's or loading/error/empty states' underlying content — only their visual styling adapts to the new design tokens, not their behavior (all already speced and shipped in `flashcard-session`/`session-size-summary`).

## Constraints
- **Technical:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (per [[techstack/profile]]) — this redesign works within that stack, not around it. Font loading must use `next/font/google` (the typed Next.js font loader the user explicitly asked for), not a manual `<link>`/`@import`.
- **Technical:** the existing `SessionState`/`session.ts` pure-logic layer and its no-op guarantees (documented in [[ui/session-state-pattern]]) must not change — only how/when `page.tsx` calls `pickNextWord` changes (now chained after a successful flag, rather than from a separate button handler).
- **Scope:** this spec covers visual/layout/token changes plus the one auto-advance behavior change; it does not touch Turso, the word bank, or any DB-access code.
- **Other:** existing shipped features (speed/voice controls, session-size selector, results summary, error/loading/empty states) must all keep working, just restyled — no scenario from a previously shipped spec should regress.

## Key Decisions Made

### Decision: Design system — "Exaggerated Minimalism"
**We will:** adopt the "Exaggerated Minimalism" style (identified via the ui-ux-pro-max design-system search): black/white/grey base, fluid `clamp()` headline typography (roughly `clamp(3rem, 10vw, 12rem)` scale, weight ~800–900, tight letter-spacing), extreme whitespace, single accent color used sparingly.
**Because:** it's the closest verified match to the reference image's aesthetic (bold poster-style monochrome editorial layout) among the design tool's cataloged styles — confirmed against the actual reference image, not guessed.
**We won't:** use a busier/decorated style (e.g. the tool's initial auto-matched "AI-Native UI" purple/cyan suggestion, which didn't match the reference at all and was explicitly rejected during this discussion).

### Decision: Single accent color — vermillion
**We will:** use one non-neutral accent color (a vermillion/orange-red, e.g. in the `#E3422C`–`#E8452C` range, exact value to be finalized in the spec) for interactive/highlight elements (buttons, focus rings, and — since the palette is deliberately minimal — also doubling as the destructive/error color rather than introducing a second red).
**Because:** the reference image itself is purely monochrome with no accent at all, but the user confirmed a single accent is wanted for interactive elements; vermillion was chosen from the design tool's own "Bold Typography Mobile (Inter Poster)" font-pairing recommendation, whose mood keywords (editorial, poster, high-contrast, vermillion) match this exact style.
**We won't:** introduce a full multi-color palette, or keep a separate distinct red for destructive/error states alongside the accent.

### Decision: Inter as the sole typeface
**We will:** load Inter via `next/font/google` (weights spanning at least 400–900 to support both body text and the ultra-bold hero headline), replacing Geist/Geist Mono entirely.
**Because:** explicitly requested by the user; Inter is independently validated by the design tool as a strong heading/display font for this exact "bold poster/editorial" mood.
**We won't:** pair Inter with a second (e.g. serif) typeface — despite the design tool's typical pairing recommendation including Playfair Display, the reference image and the user's request use a single grotesk sans throughout.

### Decision: Fullscreen fluid layout, fixed-width ceiling above desktop
**We will:** remove the current centered `max-w-md` Card wrapper in favor of a fullscreen, fluid-responsive layout across 3 breakpoint tiers (mobile / tablet / desktop), with the layout's width capped (centered, fixed-width) above the desktop breakpoint rather than continuing to stretch on very large screens.
**Because:** explicitly requested; matches the reference's full-bleed poster-like composition rather than a bounded card.
**We won't:** keep the current bordered `Card`/`CardHeader`/`CardContent`/`CardFooter` structure as the layout's outer container (individual shadcn components may still be reused internally, restyled, where they still make sense — e.g. `Alert` for error states).

### Decision: Auto-advance replaces the "Next Word" button
**We will:** remove the standalone "Next Word" button; flagging the current word (👍 or 👎) triggers, in the same action, the existing `pickNextWord` + auto-speak logic that today runs on a separate "Next Word" click.
**Because:** explicitly requested — the reference layout has no room for a third action button in that row, and merging the two actions is a genuine flow simplification (one tap to both answer and move on), confirmed with the user.
**We won't:** keep "Next Word" as a separate, still-clickable action anywhere in the redesigned UI.

### Decision: Play button occupies the hero word's space pre-reveal
**We will:** show a large, centered Play button in the same visual slot the revealed word will later occupy; it disappears once the word is revealed (per the existing speech-controls rule that Play is only available pre-reveal), replaced by the revealed word text in that same space.
**Because:** confirmed directly by the user ("genau quasi über... sobald der Text eingeblendet wird verschwindet der Playbutton") — this is a layout consequence of an already-shipped behavioral rule (`[[patterns/web-speech-voice-selection]]`'s Manual Replay requirement), not a new decision about *when* Play is available, only *where* it visually sits.
**We won't:** show Play and the revealed word simultaneously, or move Play to a separate fixed location outside the hero section.

## Open Questions
- [ ] Exact hex value for the vermillion accent — a specific range was agreed (`#E3422C`–`#E8452C`), final value to be locked in the spec.
- [ ] Exact background/foreground grey values matching the reference image's specific light-grey tone (not pure white) — to be sampled/finalized in the spec, not guessed here.
- [ ] Precise `clamp()` min/preferred/max values per breakpoint tier for the hero word typography — a technical/implementation detail for the spec and tasks, not a product decision.
- [ ] Exact pixel breakpoint values for mobile/tablet/desktop and the fixed-width ceiling above desktop — proposed default (375–768–1024–1440, per the design tool's own checklist) to be confirmed or adjusted during spec-grilling.
- [ ] Whether this spec's scope (visual tokens + font + full layout restructure + one behavior change) should be decomposed into more than one spec to stay within the 200k context-window budget for execution — to be assessed when `/superspecs:spec` estimates the size.
- [ ] How the results-summary table and loading/error/empty states should be restyled within the new token system — not detailed here; left as an implementation decision within the new design tokens, to be resolved during spec-writing/grilling rather than guessed in this discussion.

## Success Criteria
- [ ] The practice screen visually matches the reference image's composition and mood (monochrome + one accent, huge bold fluid headline, extreme whitespace) at desktop width.
- [ ] The layout is fullscreen and fluid across mobile/tablet/desktop breakpoints, with a fixed-width, centered ceiling above desktop.
- [ ] Inter is the only typeface in use, loaded via `next/font/google`.
- [ ] shadcn CSS variables reflect the new palette throughout — no leftover Nova/Geist-preset colors or fonts anywhere in the app.
- [ ] The "Next Word" button no longer exists; flagging a word auto-advances to and auto-speaks the next word.
- [ ] All previously shipped functional scenarios (session size selection, results summary, speed/voice controls, error/loading/empty states, session persistence) still work, just restyled.

## Risks
- **Scope size:** this combines a full visual system change with one real behavior change across the entire practice screen — the largest single spec attempted so far in this project. Mitigation: flag decomposition as an open question for `/superspecs:spec` to assess against the 200k context budget, rather than assuming it fits in one spec.
- **Auto-advance changing existing tested behavior:** removing "Next Word" changes when/how `pickNextWord` is invoked, which touches code covered by existing `flashcard-session` tests (e.g. `page.test.tsx`'s "Next Word" button assertions). Mitigation: the spec must explicitly enumerate which existing scenarios/tests need updating vs. which stay valid, not leave this implicit.
- **Losing the previous design as a fallback:** since the old Nova/Geist preset is fully replaced (not kept as an option), there's no built-in way to compare old vs. new during review other than git history. Accepted — consistent with how this project has handled every prior full-replacement decision (e.g. speech-controls' voice-selection scope reversal).

## Wiki References
- [[techstack/profile]] — current stack (Next.js 16, Tailwind v4, shadcn/ui "Nova" preset, Geist font) being replaced by this redesign
- [[ui/session-state-pattern]] — the `SessionState`/`pickNextWord`/`flagWord` logic that must stay behaviorally unchanged except for the auto-advance call-site change
- [[patterns/web-speech-voice-selection]] — the Play-only-before-reveal rule this redesign's layout depends on
