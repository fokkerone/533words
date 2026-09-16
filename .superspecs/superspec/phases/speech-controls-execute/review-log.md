# Review Log: Speech Controls (German Voice, Play Button, Speed)

Populated during execution — one entry per task review.

## Wave 1

### Task 1.1: German voice selection, rate, and overlap prevention in speech.ts
**Stage 1 — Spec compliance:** PASS. `selectGermanVoice` picks the first `de-*` voice, preferring exact `de-DE`; falls back to leaving `utterance.voice` unset (browser default) with no error when none found; `synth.cancel()` always precedes `synth.speak()`, preventing overlap; `rate` is applied to the utterance; the async voice-list-loading scenario is satisfied (not via a `voiceschanged` listener, but via always re-reading `getVoices()` fresh per call — a simpler mechanism that fully satisfies the spec's literal scenario wording, which only requires "eventually selects the correct voice once it does," not any particular mechanism).

**Stage 2 — Code quality:** PASS after one fix. Found in review: the originally-submitted `ensureVoicesChangedListener`/`voicesChangedListenerAttached` module-singleton mechanism was vestigial — an empty no-op callback whose only real effect (module-singleton "attach once" guard) meant it could silently skip attaching to the current test's mock synth in test contexts, making its own test pass for an unrelated reason (fresh-read-per-call already made the assertion true regardless of whether the listener fired). Verified this by running the specific test in isolation — it passed unchanged with the entire listener mechanism removed. Removed the dead code (commit `db60bd3`); renamed/re-commented the test so its name and stated intent match what it actually verifies.

**Verdict:** ✅ Approved (after simplification), no Critical findings. 53/53 tests, lint clean. `npm run build` intentionally not run for this task — a red build is expected until Task 2.1 (see plan.md).

### Task 1.2: Speed persistence
**Stage 1 — Spec compliance:** PASS. `saveSpeed`/`loadSpeed` clamp to [0.5, 1.5] on both save and load per the grilled decision (Q2), default to 1.0 on missing/corrupt/non-numeric data, never throw — matches every scenario in the "Playback Speed" and "Speed Persistence" requirements.

**Stage 2 — Code quality:** PASS. Clean, minimal, follows the established `session-storage.ts` no-throw pattern while correctly diverging where appropriate (returns a plain `number`, not `T | null`, since there's always a sensible default). No findings.

**Verdict:** ✅ Approved, no Critical findings.

## Wave 2

### Task 2.1: Play control and speed slider wired into the practice screen
_Pending_
