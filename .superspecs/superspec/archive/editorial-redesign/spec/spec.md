# Editorial Redesign (Exaggerated Minimalism) Specification

**Slug:** editorial-redesign
**Status:** draft
**Depends on:** flashcard-session, speech-controls, session-size-summary

## Purpose

This feature restructures the practice screen's layout and visual design to a fullscreen, fluid-responsive, monochrome-plus-accent editorial aesthetic with both a light and a dark theme (manually toggled, persisted), and simplifies the flagging interaction so a single 👍/👎 action both records the result and advances to the next word. It changes presentation and one interaction flow; it does not change the underlying session, speech, or persistence logic.

## Requirements

### Requirement: Auto-Advance on Flag
The system SHALL, when the learner flags the current word (correct or incorrect), both record that flag and select/present the next word in the same action — without requiring a separate "next word" action from the learner.

The system SHALL NOT provide a separate, independently-clickable "next word" control.

#### Scenario: Flagging correct advances automatically
- GIVEN a revealed word with unflagged status
- WHEN the learner flags it as correct
- THEN the flag is recorded
- AND a new word (if any remain in the session pool) becomes the current word without any further learner action
- AND the new current word is spoken aloud automatically, exactly as the existing automatic-read-aloud behavior already does

#### Scenario: Flagging the last word completes the session instead of advancing
- GIVEN a revealed word that is the last unflagged word in the session
- WHEN the learner flags it
- THEN the flag is recorded
- AND the session is shown as complete (per the existing Session Completion behavior) instead of presenting a next word

#### Scenario: A failed flag does not auto-advance
- GIVEN a revealed, unflagged word
- WHEN the learner flags it and the score write fails (per the existing "Score write fails" behavior)
- THEN the word remains the current word, not yet flagged
- AND no next word is presented
- AND the existing retry-capable error display is shown, unchanged

### Requirement: Fullscreen Fluid Layout with Three Breakpoint Tiers
The system SHALL present the practice screen as a fullscreen, fluid-responsive layout (not a bounded, centered card of fixed maximum width) across three breakpoint tiers: mobile, tablet, and desktop.

Both scenarios below are verified manually in a real browser at each breakpoint tier, not via an automated jsdom test — jsdom does not compute real CSS layout or respond to actual viewport width the way a browser does, so an automated test here would not meaningfully verify the behavior. This follows the same manual-verification approach as this spec's visual-fidelity Non-Functional Requirement.

The system SHALL cap the layout's width at a fixed, centered maximum once the viewport exceeds the desktop breakpoint, rather than continuing to stretch fluidly beyond that point.

#### Scenario: Layout fills the viewport within the three tiers
- GIVEN a viewport width within the mobile, tablet, or desktop range
- WHEN the practice screen is rendered
- THEN the layout's outer width is fluid and fills the available viewport width (not constrained to a small fixed card width)

#### Scenario: Layout stops growing above the desktop breakpoint
- GIVEN a viewport wider than the desktop breakpoint's upper bound
- WHEN the practice screen is rendered
- THEN the layout's content area stays at a fixed maximum width, centered in the viewport, rather than continuing to stretch

### Requirement: Header Layout
The system SHALL present a header region with the app's brand identity on one side and, on the other side, the session-size selector, the theme toggle, and the "New Session" action, always visible together in that region regardless of session state — consistent with the existing requirement that all such controls be visible at all times.

#### Scenario: Header shows brand and session controls together
- GIVEN the practice screen is rendered, in any session state (no session, active, or complete)
- WHEN the header region is inspected
- THEN the brand identity is present
- AND the session-size selector is present
- AND the theme toggle is present
- AND the "New Session" action is present

### Requirement: Dark/Light Theme Toggle
The system SHALL let the learner switch between a light theme (matching the reference image) and a dark theme, via a toggle control in the header region.

The system SHALL persist the learner's chosen theme so it remains in effect after a page reload and in future sessions, following the same persistence approach as speed/voice/session-size settings.

The system SHALL default to the light theme on first-ever use (not the device's system color-scheme preference).

The system SHALL derive the dark theme from the same design tokens as the light theme: inverted background/foreground (dark background, light foreground), with the accent color adjusted (not necessarily numerically identical to the light-theme accent) for adequate contrast against the dark background.

#### Scenario: Toggling the theme
- GIVEN the light theme is currently active
- WHEN the learner activates the theme toggle
- THEN the dark theme is applied immediately
- AND activating the toggle again returns to the light theme

#### Scenario: Theme choice persists across a reload
- GIVEN the learner has switched to the dark theme
- WHEN the page is reloaded
- THEN the dark theme is still active

#### Scenario: First-ever use defaults to light, not system preference
- GIVEN no theme has ever been chosen on this device, and the device's system color-scheme preference is dark
- WHEN the app loads
- THEN the light theme is used, not the system's dark preference

### Requirement: Hero Word Display Region
The system SHALL present a single hero display region that shows, mutually exclusively: a large Play control before the current word is revealed, or the current word's text at large scale after it is revealed.

The system SHALL scale the hero word's text size fluidly with the viewport, within the fluid breakpoint range described above, such that it uses the available width rather than a small fixed size.

#### Scenario: Play control shown before reveal
- GIVEN a current word that has not yet been revealed
- WHEN the hero display region is inspected
- THEN the Play control is shown in that region
- AND the word's text is not shown

#### Scenario: Word text shown after reveal, replacing Play
- GIVEN a current word that has just been revealed
- WHEN the hero display region is inspected
- THEN the word's text is shown in that region
- AND the Play control is no longer shown

### Requirement: Speed and Voice Controls Positioned Within the Hero Region
The system SHALL present the existing speed and voice-selection controls as a compact control bar within the same hero display region described above (not relocated elsewhere on the screen), visible under the same conditions they are visible today (whenever a session is active and not complete).

#### Scenario: Speed and voice controls remain available
- GIVEN an active, incomplete session
- WHEN the hero display region is inspected
- THEN the speed control and the voice-selection control are both present within it

### Requirement: Reveal and Flag Navigation Region
The system SHALL present a navigation region, positioned below the hero display region, containing the "reveal" action and the 👍/👎 flag actions, replacing the previous separate row that included a "next word" action.

#### Scenario: Reveal and flag controls are grouped together
- GIVEN an active, incomplete session with a current word
- WHEN the navigation region below the hero display is inspected
- THEN the reveal action is present
- AND both flag actions (correct, incorrect) are present
- AND no "next word" action is present anywhere on the screen

### Requirement: Typeface
The system SHALL use a single typeface (Inter) for all text in the application, loaded via Next.js's typed font loader, replacing the previous typeface entirely.

#### Scenario: Only Inter is loaded
- GIVEN the application's font configuration
- WHEN it is inspected
- THEN Inter is the configured typeface
- AND no other typeface (e.g. the previous default) is configured

### Requirement: Design Tokens Reflect the New Palette
The system SHALL define its color design tokens (background, foreground, primary, accent, border, destructive, and related tokens) to express a near-monochrome (black/white/grey) palette plus exactly one non-neutral accent color, used consistently for interactive and destructive/error states alike, for both the light and dark themes.

#### Scenario: A single non-neutral accent token exists per theme
- GIVEN the application's color design tokens for a given theme (light or dark)
- WHEN they are inspected
- THEN exactly one non-neutral (non-black/white/grey) color value is defined for that theme
- AND that same value is used for both interactive accent purposes and destructive/error purposes within that theme

## Error Behavior

- The system SHALL NOT present a "next word" control anywhere, under any session state.
- The system SHALL NOT auto-advance past a word whose flag write failed (see "A failed flag does not auto-advance" above) — this extends the existing "Score write fails" guarantee to the new auto-advance behavior rather than replacing it.
- The system SHALL NOT regress any previously shipped, still-applicable scenario from `flashcard-session`, `speech-controls`, or `session-size-summary` (e.g. session persistence across reload, results summary, empty word bank message, loading/error states) — those scenarios' underlying behavior is unchanged by this spec; only their visual presentation changes.

## Non-Functional Requirements

- The system SHALL remain usable (all controls reachable and operable) at each of the three breakpoint tiers (mobile, tablet, desktop) without horizontal scrolling.
- Exact visual fidelity to the reference image (precise colors, exact `clamp()` values, exact spacing) is a design-quality goal verified by manual review against the reference, not an automated-test requirement — automated tests in this spec verify structure and behavior (what's present, in what region, in what order), not pixel-level appearance.

## Out of Scope

- Following the device's system color-scheme preference (`prefers-color-scheme`) — the toggle is always manual, defaulting to light on first use regardless of system preference.
- Any change to `session.ts`, `speech.ts`, `session-size-settings.ts`, `speech-settings.ts`, `voice-settings.ts`, or any DB-access code — this spec only changes presentation and the single auto-advance call-site behavior described above.
- New animation/motion choreography beyond the existing reveal fade-in transition.
- A distinct logo/wordmark asset — the brand identity is the existing "533words" text, restyled.
- Precise, pixel-exact matching of the reference image's colors, spacing, or `clamp()` curve values — these are implementation/design decisions made during execution and verified manually, not specified numerically here.
- Any new content, copy, or feature beyond what's already shipped — this is a restyling and one interaction simplification, not a new feature surface.

## Glossary

- **Hero display region:** the large central area that shows either the pre-reveal Play control or the post-reveal word text, plus the speed/voice control bar.
- **Auto-advance:** the new behavior where flagging a word also selects and presents the next word, without a separate action.
- **Breakpoint tier:** one of mobile, tablet, or desktop — the three fluid-responsive layout ranges; above desktop the layout is fixed-width instead of fluid.
