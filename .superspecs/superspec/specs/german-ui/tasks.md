# Implementation Tasks: German UI (localize all remaining English chrome)

## Context Window Budget
Estimated spec + task tokens: ~6k / 200k ✅

## Wave 1 — Practice Screen
Single task — `page.tsx` and `page.test.tsx` are large, shared files; splitting this across parallel subagents would create merge conflicts on the same files (consistent with how this project has always treated `page.tsx` integration work).

### Task 1.1: Translate the practice screen and its tests

**What:** Apply every practice-screen row from `DISCUSS.md`'s Confirmed Translation Table to `src/app/page.tsx`. Concretely, replace:
- Header: "Dark"/"Light" → "Dunkel"/"Hell"; "Switch to light/dark theme" aria-labels → "Zu hellem/dunklem Modus wechseln"; "New Session" → "Neue Sitzung"; "Session size" aria-label → "Sitzungsgröße"; "Star total" aria-label → "Sterne gesamt". Leave "Logout" and "533words" unchanged.
- States: "Loading word bank…" → "Wortliste wird geladen…"; "Failed to load word bank" → "Wortliste konnte nicht geladen werden"; "Unknown error." → "Unbekannter Fehler."; "Word bank is empty" → "Wortliste ist leer"; "There are no words to practice yet. Seed the word bank to start a session." → "Es gibt noch keine Wörter zum Üben. Wortliste befüllen, um eine Sitzung zu starten."; "Could not save score" → "Ergebnis konnte nicht gespeichert werden"; "Failed to save score." → "Fehler beim Speichern des Ergebnisses."; "Session complete!" → "Sitzung abgeschlossen!"; "Word"/"Result" table headers → "Wort"/"Ergebnis"; top-level "Loading…" → "Wird geladen…".
- Controls: "Speed" → "Tempo"; "Reveal" → "Aufdecken"; "Correct"/"Incorrect" button text → "Richtig"/"Falsch"; their `correct`/`incorrect` aria-labels → "Richtig"/"Falsch"; "Word actions" aria-label → "Wortaktionen".
- **Play button → icon:** remove the "Play" text content entirely; render Lucide's `Play` icon (`import { Play } from "lucide-react"`) inside the button instead; add `aria-label="Abspielen"` to the button itself (it currently has no aria-label since it had visible text — now it needs one, since the icon alone conveys no accessible name). Size the icon sensibly for the button's existing large circular sizing (`h-24 w-24` through `desktop:h-40 desktop:w-40`) — your judgment on exact icon size/className, but it should look intentional, not tiny or oversized, at every breakpoint.
- **Error detail preservation:** do NOT change the `error instanceof Error ? error.message : "..."` / `err instanceof Error ? err.message : "..."` pattern's structure — only translate the string literal fallback text (`"Unknown error."` → `"Unbekannter Fehler."`, `"Failed to save score."` → `"Fehler beim Speichern des Ergebnisses."`). The `AlertTitle` text is translated; the `AlertDescription`'s raw `error.message`/`err.message` branch is left completely untouched.

**Files to create/modify:** `src/app/page.tsx`, `src/app/page.test.tsx` (update every assertion that currently matches English text/aria-labels to match the new German strings — this touches the majority of the existing test file's `getByRole`/`getByText`/`findByRole` calls with `name:` matchers; go through systematically rather than leaving any stale English-text assertion, since a stale assertion would either fail loudly (good) or, worse, silently stop testing the right thing if a regex was loose enough to still match).

**Test requirement:** This is a find-and-replace-style change with no new *behavior* to TDD from scratch — the correct process here is: for each string you change in `page.tsx`, update its corresponding test assertion(s) in `page.test.tsx` to expect the German text, run the suite, confirm it's back to green. For the Play-button-becomes-an-icon change specifically, this needs a genuinely different test (not just a string swap): assert the button has `aria-label="Abspielen"` and contains no visible "Play" text (e.g. `queryByText(/^play$/i)` returns null within the button), while still being selectable via `getByRole("button", { name: /abspielen/i })` for the rest of the existing Play-button test suite to keep working (many existing tests click "the Play button" — update their query to match the new aria-label-based name instead of the old visible-text-based name).

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean, and a full read-through of the final `page.tsx` confirms no leftover English string besides "Logout" and "533words" (cross-check against every row in DISCUSS.md's table).

## Wave 2 — Auth Pages
Depends on nothing from Wave 1 (fully disjoint files) — but sequenced after Wave 1 anyway since this project runs one task at a time in this single-agent, no-worktree setup. Single task — `auth-form.tsx` is shared between `login/page.tsx` and `register/page.tsx`, and both pages' tests need consistent updates together.

### Task 2.1: Translate the login/register pages and their tests

**What:** Apply every auth-page row from `DISCUSS.md`'s Confirmed Translation Table:
- `src/components/auth-form.tsx`: "Email"/"Password" field labels → "E-Mail"/"Passwort". **Confirmed via code inspection (not left for you to re-check):** the Google button's text — "Sign in with Google" / "Connecting to Google…" — is hardcoded directly inside `auth-form.tsx` itself, in a single ternary (`{isGoogleSubmitting ? "Connecting to Google…" : "Sign in with Google"}`), shared by both login and register pages. Translate it once, there, to "Login mit Google" / "Verbindung zu Google…" — it is NOT a per-page prop. The `title`/`submitLabel`/`pendingLabel`/`footer` props, by contrast, genuinely are supplied by each page individually — translate those at each call site (see below), not in `auth-form.tsx`.
- `src/app/login/page.tsx`: `title`/`submitLabel` props → "Login" (both, per the confirmed exception — not "Anmelden"); `pendingLabel` prop "Signing in…" → "Login läuft…"; footer "Don't have an account? Create one" → "Noch kein Konto? Jetzt erstellen"; generic login error "Invalid email or password." → "E-Mail oder Passwort ungültig.".
- `src/app/register/page.tsx`: title "Create your account" → "Konto erstellen"; submit button "Create account" → "Konto erstellen"; pending label "Creating account…" → "Konto wird erstellt…"; footer "Already have an account? Sign in" → "Bereits ein Konto? Login" (per the exception); duplicate-email error "An account with this email already exists." → "Für diese E-Mail-Adresse existiert bereits ein Konto."; generic register/Google error "Something went wrong. Please try again." → "Etwas ist schiefgelaufen. Bitte versuche es erneut.".

**Files to create/modify:** `src/components/auth-form.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/login/page.test.tsx`, `src/app/register/page.test.tsx` (update every assertion matching the old English strings/aria-labels).

**Test requirement:** Same find-and-replace-plus-assertion-update process as Task 1.1 — for each string changed, update its corresponding test query/assertion to the new German text, confirm the suite is green. No new behavior is being introduced here (the non-enumeration guarantee that auth errors never show Better Auth's raw message is already correctly implemented — this task only changes the translated string literals it displays, not the logic that picks which string to show).

**Done when:** All tests pass, no regressions, `npm run build`/`npm run lint` clean, and a full read-through of the final `login/page.tsx`/`register/page.tsx`/`auth-form.tsx` confirms no leftover English string besides "Login" (in its specified places) and "533words" if it appears on these pages.

## Done Criteria
The feature is DONE when:
- [ ] Both tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in previously-shipped, still-applicable scenarios
- [ ] `npm run lint` and `npm run build` succeed
- [ ] A final cross-check against DISCUSS.md's Confirmed Translation Table confirms every row is applied correctly, with no leftover English text anywhere in the touched files except "Login", "Logout", and "533words"
- [ ] Manual visual check in a browser: the practice screen and both auth pages read entirely in German (with the two named exceptions), and the Play button shows a triangle icon, not text
