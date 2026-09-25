# Discussion: German UI (localize all remaining English chrome)

Date: 2026-09-25
Participants: human + AI

## What We're Building

533words has always mixed German content (the word list itself, a few labels like "Stimme"/"Automatisch") with English UI chrome (buttons, headers, error messages, auth pages). This feature translates every remaining English string to German, with two deliberate exceptions ("Login"/"Logout" stay English), and replaces the "Play" button's text label with a triangle icon (Lucide's `Play` icon, already an installed dependency) instead of translating the word.

## Goals
- Translate every user-facing English string across the practice screen (`page.tsx`) and the auth pages (`login/page.tsx`, `register/page.tsx`, `auth-form.tsx`) to German, per the confirmed translation table below
- Translate aria-labels too, not just visible text — the whole audience is German-speaking, so a German screen reader should hear German labels
- Replace the "Play" button's visible text with Lucide's `Play` icon (a triangle) — the button still needs a German aria-label ("Abspielen") since its text is gone
- Error messages show a translated generic German heading (`AlertTitle`), with the underlying `error.message`/`err.message` (raw, often English/technical) still shown in the description below it — not suppressed, not fully translated, matching the existing `AlertTitle`/`AlertDescription` structure already in place
- Update every corresponding test assertion in `page.test.tsx`, `login/page.test.tsx`, and `register/page.test.tsx` to match the new German text — mechanical but extensive, since the existing tests query by visible text/aria-label (Testing Library convention already established in this project)

## Non-Goals (explicitly out of scope)
- Translating "533words" — the app's own brand name/proper noun, stays as-is
- Translating the word list content itself — already entirely German (533 NRW spelling words)
- Translating "Login" and "Logout" — explicitly kept in English per direct instruction
- Changing the actual content/wording of raw `error.message`/`err.message` values — only the surrounding generic heading text is translated; the technical detail line stays whatever language it already is
- A general i18n/l10n framework (e.g. `next-intl`, translation JSON files, a language switcher) — this is a one-time hardcoded translation of the existing strings, not a multi-language system. 533words has exactly one audience (German-speaking kids) and no stated need to ever support another language.
- Any change to the underlying app behavior/logic — this is a text/label-only change

## Constraints
- **Technical:** `lucide-react` is already an installed dependency (see techstack/profile.md) — the `Play` icon import is additive, no new dependency.
- **Scope:** touches `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/auth-form.tsx`, and their three corresponding test files. No changes to any non-UI logic, hooks, or data layer.
- **Other:** tone is informal "du" throughout (fits the kids/classmates audience), consistent with existing German phrasing already in the app (e.g. "Stimme").

## Key Decisions Made

### Decision: Play button becomes an icon, not a translated word
**We will:** Replace the "Play" button's text content with Lucide's `Play` icon (a right-pointing triangle), keeping a German `aria-label="Abspielen"` for accessibility since the visible text is gone.
**Because:** explicitly requested — a universally-understood play symbol needs no translation at all, and matches how media-playback controls are conventionally represented.
**We won't:** Translate "Play" to a German word (e.g. "Abspielen" as visible text) — the icon replaces the word entirely.

### Decision: "Login" and "Logout" stay in English
**We will:** Keep the literal words "Login" and "Logout" untranslated everywhere they appear — including renaming the current "Sign in" page title/button/link text to "Login" (not translating it to "Anmelden").
**Because:** explicitly requested.
**We won't:** Translate "Sign in"/"Logout" to German equivalents like "Anmelden"/"Abmelden".

### Decision: aria-labels are translated too
**We will:** Translate every aria-label to German (e.g. "Session size" → "Sitzungsgröße", "Word actions" → "Wortaktionen"), not just visible text.
**Because:** the entire audience is German-speaking; a German screen-reader user should hear German labels for consistency with the visible UI.
**We won't:** Leave aria-labels in English while translating visible text — that would be an inconsistent accessibility experience.

### Decision: Error messages mix a translated heading with the raw underlying message
**We will:** Translate the generic `AlertTitle` heading shown on an error (e.g. "Failed to load word bank" → "Wortliste konnte nicht geladen werden"), while leaving the `AlertDescription` detail line showing the actual `error.message`/`err.message` value untouched — whatever language/content that happens to be.
**Because:** gives a German-reading user an understandable heading immediately, while preserving the actual technical detail (useful for debugging, and simpler than trying to translate every possible underlying error string, including ones from third-party libraries neither of us controls the wording of).
**We won't:** Fully suppress or attempt to translate the raw error detail text.

### Decision: No i18n framework — hardcoded German strings
**We will:** Directly replace English string literals with German ones in the JSX, the same way the existing German strings ("Stimme", "Automatisch") are already just hardcoded.
**Over:** Introducing a translation-key/i18n library (`next-intl`, `react-i18next`, etc.).
**Because:** 533words has exactly one language audience with no stated plan to ever support a second language — an i18n framework would be pure overhead for a one-time, one-language translation.
**We won't:** Add any translation infrastructure, message catalogs, or language-switching capability.

## Confirmed Translation Table

**Practice screen:**
| English | German |
|---|---|
| Dark / Light | Dunkel / Hell |
| New Session | Neue Sitzung |
| Logout | *(unchanged — stays "Logout")* |
| Play *(button text)* | *(removed → Lucide `Play` icon, `aria-label="Abspielen"`)* |
| Speed | Tempo |
| Reveal | Aufdecken |
| Correct / Incorrect | Richtig / Falsch |
| Loading word bank… | Wortliste wird geladen… |
| Failed to load word bank | Wortliste konnte nicht geladen werden |
| Unknown error. *(fallback)* | Unbekannter Fehler. |
| Word bank is empty | Wortliste ist leer |
| There are no words to practice yet. Seed the word bank to start a session. | Es gibt noch keine Wörter zum Üben. Wortliste befüllen, um eine Sitzung zu starten. |
| Could not save score | Ergebnis konnte nicht gespeichert werden |
| Failed to save score. *(fallback)* | Fehler beim Speichern des Ergebnisses. |
| Session complete! | Sitzung abgeschlossen! |
| Word / Result *(table headers)* | Wort / Ergebnis |
| Loading… *(top-level)* | Wird geladen… |
| aria: Switch to light/dark theme | Zu hellem/dunklem Modus wechseln |
| aria: Session size | Sitzungsgröße |
| aria: Star total | Sterne gesamt |
| aria: Word actions | Wortaktionen |
| aria: correct / incorrect | Richtig / Falsch |

**Login/Register:**
| English | German |
|---|---|
| Sign in *(title/button/link)* | Login |
| Signing in… | Login läuft… |
| Create your account | Konto erstellen |
| Create account *(button)* | Konto erstellen |
| Creating account… | Konto wird erstellt… |
| Sign in with Google | Login mit Google |
| Connecting to Google… | Verbindung zu Google… |
| Email | E-Mail |
| Password | Passwort |
| Don't have an account? Create one | Noch kein Konto? Jetzt erstellen |
| Already have an account? Sign in | Bereits ein Konto? Login |
| Invalid email or password. | E-Mail oder Passwort ungültig. |
| An account with this email already exists. | Für diese E-Mail-Adresse existiert bereits ein Konto. |
| Something went wrong. Please try again. | Etwas ist schiefgelaufen. Bitte versuche es erneut. |

## Open Questions
- [ ] None outstanding — the full translation table above was reviewed and confirmed directly.

## Success Criteria
- [ ] Every string in the table above appears exactly as its German translation in the running app (visible text and aria-labels)
- [ ] "Login" and "Logout" are the only English words remaining in the UI (plus the "533words" brand name)
- [ ] The Play button shows the Lucide triangle icon, no visible text, with a working German aria-label
- [ ] Every existing test in `page.test.tsx`, `login/page.test.tsx`, `register/page.test.tsx` still passes, updated to query the new German text/aria-labels
- [ ] No regressions to any underlying behavior — this is a text-only change

## Risks
- **Missed strings:** the audit above was done via a full manual read of all four affected files, but a string could still be missed — mitigated by a `/grill` pass and by `/verify`'s scenario-coverage check treating "no leftover English text" as an explicit thing to confirm.
- **Extensive, mechanical test rewrites:** every test file touched by this feature queries by visible text/aria-label — a wide but low-risk diff (string changes, not logic changes), consistent with how this project already handles similar find-and-replace-style UI updates.
- **Underlying error messages may still show English text:** an accepted, explicit trade-off (see "Error messages mix..." decision above), not a gap to fix here.

## Wiki References
- [[techstack/profile]] — confirms `lucide-react` is already an installed dependency
- [[ui/session-state-pattern]] — the header/practice-screen structure this touches
- [[auth/better-auth-setup]] — the login/register pages this touches
