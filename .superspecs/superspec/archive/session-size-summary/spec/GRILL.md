# Grill Session: Session Size Selector & Results Summary

Date: 2026-09-17
Spec reviewed: superspec/specs/session-size-summary/spec.md

## Pre-flight

### Wiki conflicts
None. Consistent with [[ui/session-state-pattern]]'s `SessionState` shape and [[patterns/web-speech-voice-selection]]'s small-dedicated-settings-module pattern.

### Techstack conflicts
None. Reuses the already-installed shadcn `Select`, no new dependency.

### Internal contradictions
One gap found: tasks.md's Task 1.2 left invalid-value handling as "implementer's choice." Resolved in Q1 (and its correction).

## Questions & Resolutions

### Q1: Should an invalid stored session size be rejected-on-save (keeping the prior valid value), or fall back to 24 on load?
**Recommended (initial):** Reject-on-save, keep the prior valid value — reasoned that a fixed-set validator doesn't have a meaningful "nearest" value the way the speed slider's clamp does.
**Resolved:** Corrected by the user — falls back to the 24 default on load instead, simpler and consistent with how corrupt/non-numeric data is already handled (no special save-time rejection logic needed).
**Impact:** Spec change — scenario reworded from "previously valid stored size is returned unchanged" to "the default size (24) is used instead." tasks.md's Task 1.2 test requirement rewritten to match (validate-on-load, not reject-on-save).

### Q2: Does the results summary need to be restorable after a page reload of a completed session, or does a reload always clear it (matching existing `restoreSession()` behavior)?
**Recommended:** A reload always clears it — existing, unchanged behavior, not a new decision.
**Resolved:** Confirmed — a reload starts a new session.
**Impact:** Spec change — new scenario added ("Reloading after completing a session clears the results summary") to make this explicit rather than leaving it implicit/unstated.

### Q3: Should `startNewSession` take the session size as a parameter, with both the "New Session" button and the new size selector calling the same function?
**Recommended:** Yes — one code path for "discard and start fresh," size passed as an argument by both callers.
**Resolved:** Confirmed.
**Impact:** tasks.md change — Task 2.1 rewritten to explicitly describe extending `startNewSession(size)` rather than vaguely saying "reuse/extend."

### Q4: Are Wave 1's two tasks (session.ts parameterization + flag-order tracking, and session-size-settings.ts) truly independent for parallel execution?
**Recommended:** Yes — no shared imports; the size is just a plain number passed as an argument, and neither file needs anything from the other.
**Resolved:** Confirmed.
**Impact:** None — tasks.md's existing Wave 1 parallel structure stands as written.

## Spec Changes Required

All changes below were applied directly to spec.md during the grill session:
- Session Size Persistence: "Rejecting an invalid stored size" scenario reworded to "Invalid stored size falls back to the default" (Q1 correction)
- Session Results Summary: new scenario added — reload after completion clears the summary and auto-starts a new session (Q2)

tasks.md changes:
- Task 1.2: test requirement rewritten for load-time fallback-to-24, not save-time rejection (Q1 correction)
- Task 2.1: explicitly specifies extending `startNewSession(size)` as the single discard-and-restart code path, called by both the existing button and the new selector (Q3)

## Deferred Questions

None — all raised branches were resolved during this session.

## Verdict

**READY** — All decision branches resolved. Proceed to `/superspecs:pick-spec session-size-summary`.
