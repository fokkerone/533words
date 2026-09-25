# German UI (localize all remaining English chrome) Specification

**Slug:** german-ui
**Status:** draft
**Depends on:** none (touches the already-shipped practice screen and login/register pages, no schema or data-layer changes)

## Purpose

533words has always mixed German content (the word list, a few existing labels) with English UI chrome. This feature translates every remaining English string in the practice screen and the login/register pages to German — with "Login" and "Logout" deliberately kept in English — and replaces the "Play" button's text with a triangle icon, so the whole learner-facing experience reads as German end to end.

The authoritative source-of-truth for every specific translated string is `superspec/specs/german-ui/DISCUSS.md`'s "Confirmed Translation Table" — this spec's scenarios reference representative examples from it; the table itself is the complete, already-confirmed mapping.

## Requirements

### Requirement: Practice Screen Header Uses German Text
The system SHALL display every header control's visible text and aria-labels in German, except "Logout" which SHALL remain in English.

#### Scenario: Header controls show German text
- GIVEN the practice screen header is rendered
- WHEN it is inspected
- THEN the theme toggle shows "Dunkel" or "Hell" (matching its current state)
- AND the New Session button shows "Neue Sitzung"
- AND the session-size selector's aria-label is "Sitzungsgröße"

#### Scenario: Logout remains in English
- GIVEN the practice screen header is rendered
- WHEN it is inspected
- THEN the logout control's visible text is "Logout", unchanged

### Requirement: Practice Screen States Use German Text
The system SHALL display every loading, empty, and content-state string on the practice screen in German (session size, speed, reveal/flag controls, session-complete summary).

#### Scenario: Loading and content states show German text
- GIVEN the practice screen is in its loading state
- WHEN it is inspected
- THEN it shows "Wortliste wird geladen…"

#### Scenario: The reveal and flag controls show German text
- GIVEN an active, incomplete session
- WHEN the navigation region is inspected
- THEN the reveal control shows "Aufdecken"
- AND the flag controls show "Richtig" and "Falsch"

#### Scenario: An empty word bank shows a German message
- GIVEN the word bank has zero words
- WHEN the practice screen is inspected
- THEN it shows "Wortliste ist leer" and the accompanying German explanatory text

#### Scenario: A completed session shows a German summary
- GIVEN a just-completed session
- WHEN the results view is inspected
- THEN it shows "Sitzung abgeschlossen!" and German "Wort"/"Ergebnis" table headers

### Requirement: The Play Control Is an Icon, Not Translated Text
The system SHALL represent the "Play" control with a triangle icon (no visible text label), with a German aria-label for accessibility.

#### Scenario: Play control shows an icon with a German aria-label
- GIVEN a current word that has not yet been revealed
- WHEN the hero display region is inspected
- THEN the play control shows no visible text
- AND its aria-label is "Abspielen"

### Requirement: Error Messages Show a Translated Heading, With the Raw Detail Preserved
The system SHALL show a translated German heading for every error state on the practice screen, while continuing to show the underlying `error`/`err` object's raw `message` value (whatever language or content it happens to be) as the accompanying detail — never suppressing it, never attempting to translate it.

#### Scenario: A word-bank load failure shows a German heading with the raw detail below it
- GIVEN the word bank fails to load
- WHEN the error state is inspected
- THEN the heading reads "Wortliste konnte nicht geladen werden"
- AND the detail line shows the actual thrown error's `message` value unchanged

#### Scenario: A failed score write shows a German heading with the raw detail below it
- GIVEN a learner flags a word and the write fails
- WHEN the error state is inspected
- THEN the heading reads "Ergebnis konnte nicht gespeichert werden"
- AND the detail line shows the actual thrown error's `message` value unchanged

#### Scenario: A non-Error rejection falls back to a translated generic message
- GIVEN a failure that does not produce a JavaScript `Error` instance
- WHEN the error state is inspected
- THEN the detail line shows the translated fallback text (e.g. "Unbekannter Fehler." or "Fehler beim Speichern des Ergebnisses.") instead of an undefined/blank value

### Requirement: Login and Register Pages Use German Text, Except "Login"
The system SHALL display every visible label, button, and message on `/login` and `/register` in German, except the word "Login" itself, which SHALL be used wherever the pages currently say "Sign in" (title, submit button, and the cross-link between the two pages) — not translated to a German equivalent like "Anmelden".

#### Scenario: Login page shows German text with "Login" preserved
- GIVEN the login page is rendered
- WHEN it is inspected
- THEN the page title and submit button both read "Login"
- AND the email/password field labels read "E-Mail" and "Passwort"
- AND the Google button reads "Login mit Google"

#### Scenario: Register page shows German text
- GIVEN the register page is rendered
- WHEN it is inspected
- THEN the page title reads "Konto erstellen"
- AND the cross-link to the login page reads "Login" (per the same exception)

#### Scenario: Auth error messages are translated
- GIVEN a login or registration attempt fails
- WHEN the error is shown
- THEN the displayed text is the translated German message (e.g. "E-Mail oder Passwort ungültig.") — never Better Auth's raw underlying error message, consistent with the non-enumeration guarantee already established for this app's login flow

### Requirement: No Untranslated English Text Remains
The system SHALL NOT display any English string in the practice screen or login/register pages other than "Login", "Logout", and the "533words" brand name.

#### Scenario: A full pass over both pages finds no leftover English chrome
- GIVEN the practice screen and both auth pages, in every state each can be in (loading, error, empty, active session, completed session)
- WHEN every visible string and aria-label is inspected
- THEN every one matches its entry in DISCUSS.md's Confirmed Translation Table, or is one of the three explicit exceptions

## Error Behavior

- The system SHALL NOT display an error's raw `message` as the *only* visible text — a translated heading SHALL always accompany it.
- The system SHALL NOT translate "Login", "Logout", or "533words".
- The system SHALL NOT introduce a translation framework, message catalog, or language-switching mechanism — every string is a direct, hardcoded replacement (see DISCUSS.md's "No i18n framework" decision).

## Non-Functional Requirements

- This is a text/label-only change — no behavioral, data-layer, or styling logic changes beyond the Play button's text-to-icon swap.
- `lucide-react` (already an installed dependency) SHALL be the source of the Play icon — no new dependency.

## Out of Scope

- Translating "533words" (brand name) or the word list content (already German)
- Translating "Login"/"Logout"
- Translating or altering the content of raw `error.message`/`err.message` values themselves
- Any i18n/l10n framework, translation-key system, or language switcher
- Any change to underlying app behavior, data flow, or logic — this is presentation-only

## Glossary

- **Chrome:** the UI text/labels/messages surrounding the app's actual content (the word list) — buttons, headings, error messages, form labels.
- **Confirmed Translation Table:** the complete English→German string mapping in `DISCUSS.md`, already reviewed and approved — the authoritative source for every specific translation this spec implements.
