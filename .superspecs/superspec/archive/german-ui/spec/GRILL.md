# Grill Session: German UI (localize all remaining English chrome)

Date: 2026-09-25
Spec reviewed: superspec/specs/german-ui/spec.md

## Pre-flight

### Wiki conflicts
None.

### Techstack conflicts
None — confirmed directly (not assumed) that `lucide-react`'s `Play` icon exists in the installed package (`node_modules/lucide-react/dist/esm/icons/play.mjs`), and the package is already actively used elsewhere in the codebase (`select.tsx`'s `ChevronDownIcon`).

### Internal contradictions
None between `spec.md` and `tasks.md`. One resolvable ambiguity `tasks.md` had flagged as "verify" was resolved via direct code inspection during the grill: `auth-form.tsx`'s Google button text ("Sign in with Google"/"Connecting to Google…") is hardcoded once, shared between both auth pages — not a per-page prop.

## Questions & Resolutions

### Q1: The spec's "No Untranslated English Text Remains" requirement isn't a single testable behavior — should it be explicitly scoped as manually-verified rather than something a subagent tries to encode as one automated "no English text anywhere" test?
**Recommended:** Explicitly manual-verification-only, consistent with this project's established pattern of carving out non-automatable completeness/visual checks (e.g. editorial-redesign's visual-fidelity requirements).
**Resolved:** Agreed — the user will perform this final check themselves.
**Impact:** No spec change required; already framed this way structurally (a single completeness-check scenario, not a per-string automated assertion). Noted in `tasks.md`'s Done Criteria as the user's own final pass.

### Q2: "Reveal" → "Wort einblenden" is 15 characters vs. the original "Reveal"'s 6 — sitting in a `flex-1` button row with `max-w-xs` alongside "Richtig"/"Falsch", this risked wrapping or looking cramped at mobile widths.
**Recommended:** Add an explicit manually-verified non-functional requirement covering breakpoint layout with the new (longer) German strings.
**Resolved:** Solved more directly — the user picked a shorter translation instead: "Reveal" → **"Aufdecken"** (9 characters), not "Wort einblenden". Closer to the original length, removing the layout risk at the source rather than just planning to check for it.
**Impact:** `DISCUSS.md`'s Confirmed Translation Table, `spec.md`'s "reveal control shows..." scenario, and `tasks.md`'s Task 1.1 string list all updated from "Wort einblenden" to "Aufdecken".

## Spec Changes Required

- `spec.md`: "The reveal and flag controls show German text" scenario now expects "Aufdecken" (was "Wort einblenden").

## Deferred Questions

None outstanding.

## Verdict

**READY** — All decision branches resolved. Proceed to `/pick-spec`.
