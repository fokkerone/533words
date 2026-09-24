# Grill Session: Star Total (per-learner point total in the nav)

Date: 2026-09-24
Spec reviewed: superspec/specs/star-total/spec.md

## Pre-flight

### Wiki conflicts
None.

### Techstack conflicts
None — pure extension of the existing client-direct Turso access pattern; no schema changes, no new server surface.

### Internal contradictions
None found between `spec.md` and `tasks.md`.

## Questions & Resolutions

### Q1: What should the header badge show while `useUserStars` is loading (first paint) or has errored — nothing/hidden, a placeholder like "…", or "0"?
**Recommended:** Omit the badge entirely while loading or on error, to avoid briefly flashing an incorrect "0" for a learner whose real total is non-zero.
**Resolved:** Show "0" during loading/error instead — consistent with how the rest of the app already defaults to a sensible value rather than blank (e.g. session-size and speed sliders always show a concrete default, never an empty state).
**Impact:** `tasks.md` Task 2.1 updated to specify "0" explicitly as the loading/error fallback value, removing the "your judgment" ambiguity.

## Spec Changes Required

None — the resolution only clarifies an implementation-level fallback value already scoped as "your judgment" in `tasks.md`; no change to `spec.md`'s actual requirements or scenarios was needed (the spec's Error Behavior section already only requires "the rest of the header stays usable," which "0" as a fallback satisfies just as well as omitting the badge).

## Deferred Questions

- [ ] Exact badge icon/styling (⭐ vs. plain number, exact Tailwind classes) — deferred to implementation, consistent with how visual-only details were handled in every prior feature in this project.

## Verdict

**READY** — All decision branches resolved. Proceed to `/pick-spec`.
