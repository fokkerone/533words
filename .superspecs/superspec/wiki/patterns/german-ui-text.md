---
title: German UI Text Convention
summary: How 533words localizes its UI chrome to German — hardcoded string replacement (no i18n framework), the "Login"/"Logout" exception, and the translated-heading-plus-raw-detail pattern for error messages.
tags: [patterns, german-ui, ui, react]
spec: "[[german-ui]]"
created: 2026-09-25
updated: 2026-09-25
provenance:
  sources: [specs/german-ui/DISCUSS.md, specs/german-ui/spec.md, specs/german-ui/GRILL.md, phases/german-ui-execute/review-log.md]
  extracted: 70%
  inferred: 25%
  ambiguous: 5%
---

# German UI Text Convention

## Summary
533words' entire audience is German-speaking (a kid and classmates practicing NRW spelling words), but the app's UI chrome — buttons, headings, error messages, the auth pages — had always been in English, mixed in with the already-German word list and a few labels. german-ui (2026-09-25) translated every remaining string, with two deliberate English exceptions ("Login"/"Logout"), and replaced the "Play" button's text with a triangle icon. This page documents the resulting conventions for any future UI text added to the app.

## Context
There was no prior localization pattern to follow — this was greenfield for the project. The user reviewed and confirmed a complete translation table upfront (in `DISCUSS.md`) before any code was touched, so this wasn't an ad-hoc translate-as-you-go pass.

## Key Decisions

### No i18n framework — direct hardcoded string replacement
**Chose:** Replace English string literals with German ones directly in the JSX, the same way pre-existing German strings ("Stimme", "Automatisch") were already just hardcoded.
**Over:** A translation-key/message-catalog library (`next-intl`, `react-i18next`, etc.).
**Because:** 533words has exactly one language audience with no stated plan to ever support a second language. An i18n framework is pure overhead for a one-time, one-language translation — YAGNI.
**Trade-off:** if this app ever needed a second language, every string would need to be re-extracted into a proper i18n system at that point — accepted, since there's no indication that will ever happen.

### "Login" and "Logout" are the two permanent English exceptions
**Chose:** These two specific words are never translated (not to "Anmelden"/"Abmelden"), including renaming the pre-existing "Sign in" text to "Login" everywhere it appeared (page title, submit button, cross-links between `/login` and `/register`).
**Because:** explicit user preference — these are common enough English loanwords in German tech contexts that they read naturally left as-is.
**Trade-off:** none — this is a stable, narrow exception list (plus the "533words" brand name, which was never a translation question), not a growing allowlist. Any future new UI text should default to German unless it's genuinely one of these three exceptions.

### Icon over translation: the Play button
**Chose:** Where a symbol is more universal than any translation of it, replace the text with an icon instead of translating the word — the Play button's "Play" text became Lucide's `Play` icon (a triangle), not "Abspielen" as visible text.
**Because:** a play symbol needs no language at all, and this is the conventional way media-playback controls are represented.
**Trade-off:** the button needed an explicit `aria-label` added (`"Abspielen"`) since it previously relied on visible text for its accessible name — removing the text without adding this would have broken screen-reader accessibility. Worth remembering for any future icon-only control: **an icon-only interactive element always needs an explicit aria-label**, since there's no longer any visible text to derive one from.

### aria-labels are translated too, not just visible text
**Chose:** Every aria-label was translated to German alongside visible text (e.g. "Session size" → "Sitzungsgröße").
**Because:** the entire audience is German-speaking — a German screen-reader user should hear German labels, consistent with the visible UI. Leaving aria-labels in English while translating visible text would have been an inconsistent accessibility experience.
**Trade-off:** none significant — mechanical, just more strings to translate in the same pass.

### Error messages: translated heading, raw detail preserved
**Chose:** Every error `Alert`'s `AlertTitle` (a generic heading) is translated to German, while the `AlertDescription` detail line continues showing the actual `error.message`/`err.message` value completely untouched — whatever language or content it happens to be (often English, from the browser or Turso client, not authored by this app).
**Over:** Either fully suppressing the raw detail, or trying to translate every possible underlying error string (including ones from third-party libraries this app doesn't control the wording of).
**Because:** gives a German-reading user an immediately understandable heading, while preserving the actual technical detail for debugging — simpler and more honest than attempting exhaustive translation of arbitrary runtime error text.
**Pattern to follow for any new error surface added later:** translate the fixed/known heading string; never touch the `error instanceof Error ? error.message : "<translated fallback>"` branching structure itself, only the string literals inside it.

## Gotchas

- **`getByLabelText` regex breakage from a translated label's punctuation:** changing "Email"/"Password" to "E-Mail"/"Passwort" broke existing test queries using `/email/i`/`/password/i` — the hyphen in "E-Mail" meant the old substring-matching regex no longer matched at all. Caught and fixed during Task 2.1 without being explicitly told to. **Worth checking for on any future label translation:** a translated string with different punctuation/spacing than the original can silently break a loose regex match rather than obviously failing.
- **Scenario-coverage gaps found during `/verify`, not execution:** three real gaps were found only during the final verify pass, not by the execution subagents — the theme toggle's *visible* text ("Dunkel"/"Hell") was only ever asserted via aria-label, never its actual text content; and the login/register page *titles* (distinct from the submit buttons, even though they share the same string) and register's login cross-link text were never directly asserted. All three were coverage gaps, not implementation bugs — the underlying code was already correct in every case. Worth remembering: when a spec scenario names multiple distinct UI elements that happen to render the same string (e.g. a page title and its submit button both reading "Login"), each element needs its own assertion — testing one doesn't cover the other.

## Open Questions
- [ ] None — this was a complete, one-time translation pass with no partial/deferred scope.

## Related
- [[ui/session-state-pattern]] — the practice-screen header structure this touched
- [[auth/better-auth-setup]] — the login/register pages this touched
- `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/components/auth-form.tsx` — implementation
