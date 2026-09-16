# Grill Session: Subagent Orchestration

Date: 2026-09-11
Spec reviewed: superspec/specs/subagent-orchestration/spec.md

## Pre-flight

### Wiki conflicts
None — wiki has no relevant pages (empty except an unrelated `auth` domain from a prior demo).

### Techstack conflicts
None — no `superspec/wiki/techstack/profile.md` exists yet for this project.

### Internal contradictions
None found. Cross-checked the 5 new slash commands (`techie`, `plan`, `execute`, `release`, `cycle`, plus `backlog`) against all 23 existing `slash_command` values across `.skills/*/SKILL.md` — no collisions.

## Questions & Resolutions

### Q1: How does `superspecs-techie` decide a project is "greenfield"?
**Recommended:** No/near-empty git history — 0 or 1 commits and no tracked files besides dotfiles/`README*`, checkable via `git log --oneline | wc -l` and `git ls-files`.
**Resolved:** Accepted as recommended.
**Impact:** Spec change required — added an explicit "Greenfield definition" to the techie requirement, updated the two scenarios to use concrete git state instead of "empty repository" / "existing tracked source files."

### Q2: How does `techie` reliably tell shell-installable vs. interactive-only install commands apart, given `techstack` currently writes them as prose?
**Recommended:** Add `[shell]`/`[interactive]` tags to every install-command line `techstack` writes into `profile.md`.
**Resolved:** Accepted as recommended.
**Impact:** Spec change required — new requirement "techstack install-command markers" added; this is now the second (alongside `plan-grill`) existing skill this feature touches. Out of Scope section updated to reflect both exceptions. New task 2.1a added to tasks.md.

### Q3: How does `superspecs-plan` pick the "oldest" backlog `todo` item?
**Recommended:** Explicit `created: <ISO date>` frontmatter field, sorted ascending, falling back to filename order on ties/missing dates.
**Resolved:** Accepted as recommended.
**Impact:** Spec change required — backlog requirement and its scenarios updated to include `created`; new scenario added for date-based ordering. tasks.md updated (1.2, 2.5).

### Q4: Should `superspecs-release`/`cycle` push branches and open PRs fully unattended?
**Recommended:** Stop before the push/PR step and ask for explicit confirmation, consistent with the project's existing norm of confirming risky, externally-visible actions.
**Resolved:** Accepted as recommended.
**Impact:** Spec change required — release requirement rewritten to split `/ship` into automatic (changelog/archive/mark-complete) vs. confirm-first (push/PR) steps; new scenario added. cycle requirement got a new scenario for surfacing that pause rather than silently blocking or skipping. tasks.md updated (2.4, 2.6).

## Spec Changes Required

All of the following were applied directly to `spec.md` (no deferred spec debt):
- Added concrete "Greenfield definition" to the techie requirement; scenarios now reference specific git state.
- Added new requirement: "techstack install-command markers" (`[shell]`/`[interactive]` tagging), with 2 scenarios.
- Added `created:` field to the backlog skill's frontmatter schema and a new ordering scenario.
- Rewrote the release subagent requirement to add the pre-push/PR confirmation pause, with a new scenario for the user confirming.
- Added a cycle scenario covering how the confirmation pause is surfaced rather than swallowed.
- Updated Out of Scope to name both existing skills this feature amends (`plan-grill`, `techstack`) instead of just `plan-grill`.

## Deferred Questions

- [ ] Whether concurrent `/superspecs:cycle` invocations need any locking to avoid double-dispatching the same READY spec — deferred because this is a single-operator CLI tool today; no evidence of concurrent invocation being a real usage pattern. Can be revisited if it becomes one.
- [ ] Exact wording/UX of the "manual follow-up" report format for `[interactive]`-marked installs, and of the pre-push confirmation prompt in `release` — deferred to implementation (Wave 2), since these are presentation details, not behavior-defining requirements.

## Verdict

**READY** — All decision branches resolved. Proceed to `/pick-spec`.

---

## Amendment Grill (2026-09-11): Persistent cycle, dev-branch integration, autonomous release

Before execution started, the user requested the scope change documented in `DISCUSS.md`'s amendment section. This re-opens the spec, so a second, lighter grill pass was run over the changed decisions only (not the whole spec again).

### Q1: If a spec is stuck `draft` (nobody has run `/grill` on it yet), `cycle` waits and re-scans forever by design — is that acceptable, or does it need a give-up condition?
**Recommended:** Accept it as-is. The loop's whole purpose is unattended completion of everything already in the pipeline; a human can always stop it (or run `/grill` on the stuck spec) out of band. Adding a give-up/timeout condition would contradict "run until everything is done."
**Resolved:** Accepted as recommended — no timeout added.
**Impact:** No spec change; documented as accepted behavior (not a defect) in `DISCUSS.md`'s amendment risk note.

### Q2: Does branching every spec off `dev` (instead of `main`) create any conflict with the one existing spec, `auth-jwt`, which predates this feature?
**Recommended:** No — `auth-jwt`'s branch (if any) was created under the old convention and is unaffected; the new dev-branch-base logic only applies to branches `execute-branch` creates going forward. No retroactive migration needed.
**Resolved:** Accepted as recommended.
**Impact:** No spec change. Confirmed `auth-jwt`'s existing spec/branch state (if any) isn't touched by this feature.

### Q3: Is the local-merge-into-`dev` step safe from races, given `cycle` also dispatches per-task subagents inside `/subagent` during execute?
**Recommended:** Yes — `cycle` processes one spec fully (execute, then release, including the `dev` merge) before starting the next spec's `/branch`, so there is never more than one spec's branch being merged into `dev` at a time. The parallelism inside `/subagent` is within a single spec's task list, not across specs, so it doesn't touch `dev`.
**Resolved:** Accepted as recommended.
**Impact:** No spec change — this was already implied by "processing matches sequentially" in the cycle requirement; confirmed no gap.

## Spec Changes Required (this amendment)

None beyond what was already applied directly to `spec.md`, `DISCUSS.md`, and `tasks.md` during this conversation (release made fully autonomous; new "dev integration branch" requirement; cycle rewritten to be persistent with `ScheduleWakeup`-based token-exhaustion retry; `execute-branch` and `ship` added to the list of touched existing skills; Out of Scope/Non-Functional/Error Behavior/Glossary updated to match).

## Deferred Questions (this amendment)

- [ ] Whether `cycle` should eventually surface a periodic status summary while waiting on a stuck `draft` spec (vs. silently re-scanning) — deferred to implementation as a presentation detail, not a behavior-defining requirement.

## Verdict (amendment)

**READY** — Re-opened decisions resolved. Proceed to `/pick-spec`.
