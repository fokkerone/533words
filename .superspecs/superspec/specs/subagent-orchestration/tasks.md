# Implementation Tasks: Subagent Orchestration

## Context Window Budget
Estimated spec + task tokens: ~13k / 200k ✅

## Note on "tests" in this project

SuperSpecs ships as markdown skill files + a bash installer — there is no application runtime. "Test requirement" below means a shell assertion (typically added to a `test/setup.sh.bats`-style script or a plain bash script under `test/`) that fails before the change and passes after: e.g. asserting a symlink exists, a generated file's frontmatter matches, or no filename collision occurs. Where a task only adds/edits prompt instructions (the subagent/skill markdown bodies), "test" means a structural assertion (file exists, has required frontmatter fields, references the right skill names) — not an assertion about LLM behavior, which isn't mechanically testable.

## Wave 1 — Foundation

### Task 1.1: Create `.claude-agents/` canonical source directory with 4 subagent stubs
**What:** Create `.claude-agents/techie.md`, `plan.md`, `execute.md`, `release.md`, each with correct YAML frontmatter (`name`, `description`, `tools`) per spec's "Canonical subagent source directory" requirement. Bodies can start as a short orchestration outline (filled in fully in Wave 2).
**Files to create/modify:** `.claude-agents/techie.md`, `.claude-agents/plan.md`, `.claude-agents/execute.md`, `.claude-agents/release.md`
**Test requirement:** A test asserts all 4 files exist and each has `name:`, `description:`, and `tools:` frontmatter fields, and that `execute.md`'s tools include `Agent` while `techie.md`'s do not.
**Done when:** Test passes, no regressions.

### Task 1.2: Create `.skills/backlog/SKILL.md` skeleton
**What:** New skill file with `slash_command: backlog`, describing the markdown-file schema under `superspec/backlog/` (`status: todo|in-discussion|planned`, `created: <ISO date>`).
**Files to create/modify:** `.skills/backlog/SKILL.md`
**Test requirement:** A test asserts the file exists, has `slash_command: backlog` in frontmatter, and does not collide with any existing `slash_command` value in `.skills/*/SKILL.md`.
**Done when:** Test passes, no regressions.

### Task 1.3: Create `.skills/cycle/SKILL.md` skeleton
**What:** New skill file with `slash_command: cycle`, describing the scan-for-`ready-for-execution` behavior.
**Files to create/modify:** `.skills/cycle/SKILL.md`
**Test requirement:** A test asserts the file exists, has `slash_command: cycle`, and no collision with existing slash commands.
**Done when:** Test passes, no regressions.

### Task 1.4: Create wrapper skill skeletons for techie/plan/execute/release commands
**What:** New skill files `.skills/dispatch-techie/SKILL.md` (`slash_command: techie`), `.skills/dispatch-plan/SKILL.md` (`slash_command: plan`), `.skills/dispatch-execute/SKILL.md` (`slash_command: execute`), `.skills/dispatch-release/SKILL.md` (`slash_command: release`). Each body's entire job: dispatch the matching subagent via the Agent/Task mechanism, passing along any arguments.
**Files to create/modify:** `.skills/dispatch-techie/SKILL.md`, `.skills/dispatch-plan/SKILL.md`, `.skills/dispatch-execute/SKILL.md`, `.skills/dispatch-release/SKILL.md`
**Test requirement:** A test asserts all 4 files exist with the correct distinct `slash_command` values (`techie`, `plan`, `execute`, `release`) and confirms none equals `tdd` or `ship`.
**Done when:** Test passes, no regressions.

## Wave 2 — Core Logic

### Task 2.1: Write full `superspecs-techie` orchestration body
**What:** Implement the full behavior from spec's "techie subagent behavior" requirement: run `setup.sh`, detect greenfield via the exact `git log --oneline | wc -l` + `git ls-files` check defined in spec, conditionally invoke `techstack`, auto-install `[shell]`-marked recommended skills (reading the markers added in Task 2.1a), report manual follow-ups for `[interactive]`-marked ones.
**Files to create/modify:** `.claude-agents/techie.md`
**Test requirement:** A bash test stages 2 temp git repos (one matching the greenfield definition, one with 5 commits + tracked source files) and asserts a helper script mirroring the documented detection command classifies them correctly; a separate structural check confirms the file's text covers both the `[shell]` and `[interactive]` branches.
**Done when:** Test passes, no regressions.

### Task 2.1a: Add `[shell]`/`[interactive]` markers to `techstack`
**What:** Implement the "techstack install-command markers" requirement: every install command line written into `profile.md` (curated baseline and live-fetched) gets tagged `[shell]` or `[interactive]`.
**Files to create/modify:** `.skills/techstack/SKILL.md`
**Test requirement:** A structural check confirms every install-command example line in the curated baseline table now carries one of the two tags, and the live-fetch section's output format instructions require the same tagging.
**Done when:** Test passes, no regressions.

### Task 2.2: Write full `superspecs-plan` orchestration body
**What:** Implement discuss → spec → grill sequencing, backlog consultation when no topic given, and the "stop on NEEDS REVISION" behavior.
**Files to create/modify:** `.claude-agents/plan.md`
**Test requirement:** Structural check confirming the file's steps reference `/discuss`, `/spec`, `/grill`, the `backlog` skill, and explicitly instruct stopping (not looping) on NEEDS REVISION.
**Done when:** Test passes, no regressions.

### Task 2.3: Write full `superspecs-execute` orchestration body
**What:** Implement pick-spec → branch → subagent → tdd → code-review sequencing, with the pre-check that `spec.md` is `ready-for-execution` before starting, and the stop-on-Critical-finding rule.
**Files to create/modify:** `.claude-agents/execute.md`
**Test requirement:** Structural check confirming all 5 referenced skills appear in order and the status pre-check + Critical-finding stop rule are both present in the text.
**Done when:** Test passes, no regressions.

### Task 2.4: Write full `superspecs-release` orchestration body
**What:** Implement verify → ship sequencing with the stop-on-test-failure gate. `/ship` runs fully unattended end to end (commit, push, PR against `dev`) — no confirmation pause.
**Files to create/modify:** `.claude-agents/release.md`
**Test requirement:** Structural check confirming both referenced skills appear in order, the stop-before-ship-on-failure rule is present, and the text explicitly states `/ship` is invoked with base branch `dev` and runs without pausing for confirmation.
**Done when:** Test passes, no regressions.

### Task 2.4a: Add dev-branch base to `execute-branch`
**What:** Implement the "dev integration branch" requirement's branch-creation half: `/branch` creates `dev` from the current default branch if it doesn't exist, then creates the spec's branch off `dev` instead of off the default branch.
**Files to create/modify:** `.skills/execute-branch/SKILL.md`
**Test requirement:** A bash test in a temp git repo (a) with no `dev` branch, asserts running the documented branch-creation steps results in `dev` existing and the spec branch's merge-base being `dev`'s tip; (b) with `dev` already existing and ahead of the default branch, asserts the new spec branch is created off `dev`'s current tip, not the default branch.
**Done when:** Test passes, no regressions.

### Task 2.4b: Add configurable PR base branch + autonomous push to `ship`
**What:** Implement the "dev integration branch" requirement's release-time half: `ship` accepts a base-branch parameter (default `main`, unchanged for standalone `/superspecs:ship` use); when invoked by `superspecs-release` with base `dev`, it pushes and opens the PR against `dev` without pausing for confirmation, then merges the spec branch into local `dev` and pushes `dev` to `origin`.
**Files to create/modify:** `.skills/ship/SKILL.md`
**Test requirement:** A bash test asserts (a) `ship` invoked with no base-branch argument still targets `main` (regression check for standalone use), (b) `ship` invoked with base `dev` opens the PR against `dev`, merges the spec branch into local `dev`, and pushes `dev` to `origin`.
**Done when:** Test passes, no regressions.

### Task 2.5: Implement `backlog` skill logic
**What:** Full read/write logic: list items, pick oldest `todo` by `created` date (fallback filename order), mark `in-discussion`, mark `planned`, auto-create `superspec/backlog/` if missing.
**Files to create/modify:** `.skills/backlog/SKILL.md`
**Test requirement:** A bash test creates a temp `superspec/backlog/` with 3 sample files (mixed statuses and `created` dates), and asserts the skill's documented listing/selection logic (exercised via a small helper script mirroring the described algorithm) matches the 4 backlog scenarios in spec, including picking by earliest `created` date.
**Done when:** Test passes, no regressions.

### Task 2.6: Implement `cycle` skill logic (persistent, one full pass)
**What:** Full scan-and-dispatch logic: find all `spec.md` files with `**Status:** ready-for-execution`, process sequentially (execute then release per spec, only dispatching release on execute's success), determine whether any spec remains in a pre-shipped state (to decide wait-and-rescan vs. exit), report and exit only when nothing remains pre-shipped.
**Files to create/modify:** `.skills/cycle/SKILL.md`
**Test requirement:** A bash test creates 2–3 temp spec directories with varying `**Status:**` lines (including one `draft`) and asserts a grep-based scan (matching the skill's documented detection method) correctly identifies the `ready-for-execution` ones for dispatch while recognizing the `draft` one as "not yet done" (so the skill's documented exit-condition check would not exit).
**Done when:** Test passes, no regressions.

### Task 2.6a: Add ScheduleWakeup-based token-exhaustion retry to `cycle`
**What:** Implement the "cycle skill (persistent)" requirement's token-exhaustion scenario: on a usage/rate-limit dispatch failure, call `ScheduleWakeup` with an appropriately long delay and retry the same spec from the failed step on wake, instead of reporting a blocking failure. Document that `cycle` is expected to run under `/loop`.
**Files to create/modify:** `.skills/cycle/SKILL.md`
**Test requirement:** Structural check confirming the skill's text explicitly distinguishes a usage/rate-limit error from a task failure, and instructs calling `ScheduleWakeup` (not stopping) for the former.
**Done when:** Test passes, no regressions.

### Task 2.7: Add grill status-flag step to `plan-grill`
**What:** Add the step (per spec's "grill status flag" requirement) so a READY verdict flips `spec.md`'s `**Status:**` line to `ready-for-execution`, and a NEEDS REVISION verdict leaves it untouched.
**Files to create/modify:** `.skills/plan-grill/SKILL.md`
**Test requirement:** A bash test creates a temp `spec.md` with `**Status:** draft`, and asserts that applying the described sed/replace step (as documented in the skill) changes the line only when a READY marker is present in a companion GRILL.md-like fixture, and leaves it unchanged for a NEEDS REVISION fixture.
**Done when:** Test passes, no regressions.

## Wave 3 — Integration

### Task 3.1: Extend `setup.sh` to distribute `.claude-agents/`
**What:** Add a new step (parallel to `symlink_skills`) that symlinks every file in `.claude-agents/` into `$PROJECT_DIR/.claude/agents/` and `$HOME/.claude/agents/`, gated on the existing "Claude Code (project)" / "Claude Code (global)" selections (indices 0 and 4 in `setup.sh`'s `SEL` array). Also wire the 5 new wrapper skills (`techie`, `plan`, `execute`, `release`, `cycle`) through the existing `install_commands` calls (no new call sites needed — they run automatically since `install_commands` iterates all of `.skills/*/`).
**Files to create/modify:** `setup.sh`
**Test requirement:** A bash test runs `setup.sh` (with `SUPERSPECS_PROJECT_DIR` pointed at a temp dir and non-interactive input selecting only project-level Claude Code) and asserts: (a) `.claude/agents/techie.md` etc. are symlinks resolving into `.claude-agents/`, (b) `.claude/commands/superspecs/techie.md` etc. exist, (c) no `.claude/agents/` directory or files appear for a run that selects only Cursor.
**Done when:** Test passes, no regressions.

### Task 3.2: Regression check across all 12 existing destinations
**What:** Confirm the addition in 3.1 doesn't alter existing skill-symlink or command-generation behavior for any of the 12 pre-existing destinations.
**Files to create/modify:** none (verification only, plus fixing `setup.sh` if a regression is found)
**Test requirement:** Run the existing informal setup.sh smoke path (or a new bash test) selecting all 12 destinations and asserting the existing `.skills/*/SKILL.md` symlink count and generated command count match pre-change output exactly, with the 4 new agent files and 5 new commands as the only diff.
**Done when:** Test passes, no regressions.

### Task 3.3: Update `README.md` / `HOWITWORKS.md` handoff text
**What:** Document the new `/superspecs:techie`, `/superspecs:plan`, `/superspecs:execute`, `/superspecs:release`, `/superspecs:cycle` commands and their relationship to the existing granular commands, matching the "First feature workflow" block already printed by `setup.sh`.
**Files to create/modify:** `README.md`, `HOWITWORKS.md`, `setup.sh` (final echo block)
**Test requirement:** Structural check (grep) confirming all 5 new command names appear in each updated doc.
**Done when:** Test passes, no regressions.

## Done Criteria
The feature is DONE when:
- [ ] All tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests (existing 12-destination setup.sh behavior unchanged)
