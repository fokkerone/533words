# Subagent Orchestration Specification

**Slug:** subagent-orchestration
**Status:** draft
**Depends on:** none

## Purpose

SuperSpecs currently requires a human to invoke each lifecycle skill one at a time (`/discuss`, `/spec`, `/grill`, `/pick-spec`, `/branch`, `/subagent`, `/tdd`, `/code-review`, `/verify`, `/ship`). This feature adds four Claude Code subagents — `superspecs-techie`, `superspecs-plan`, `superspecs-execute`, `superspecs-release` — each of which drives one lifecycle phase to completion by calling the existing skills in sequence, plus a `superspecs/cycle` skill that keeps running until every spec that has cleared `/grill` has been executed and shipped — fully unattended (including commit, push, and PR creation), resilient to running out of tokens mid-run, and integrating all spec branches into a shared `dev` branch so specs that build on each other stay in order. Existing skills are unchanged in behavior except for four additions: `/grill` writes a machine-readable READY flag into `spec.md`; `techstack` tags install commands `[shell]`/`[interactive]`; `/branch` targets `dev` instead of the default branch; and `/ship` accepts a configurable PR base branch.

## Requirements

### Requirement: Canonical subagent source directory
The system SHALL provide a canonical source directory `.claude-agents/` at the repo root containing one markdown file per subagent (`techie.md`, `plan.md`, `execute.md`, `release.md`), each with YAML frontmatter fields `name`, `description`, and `tools`.

#### Scenario: Subagent file has correct tool whitelist
- GIVEN `.claude-agents/techie.md`
- WHEN its frontmatter `tools` list is read
- THEN it includes `Bash`, `Read`, `Write`, `Edit`, `Skill`, `Glob`, `Grep` and excludes tools it has no use for (e.g. `Agent`)

#### Scenario: Subagent file has correct tool whitelist for execute
- GIVEN `.claude-agents/execute.md`
- WHEN its frontmatter `tools` list is read
- THEN it includes `Skill`, `Bash`, `Read`, `Write`, `Edit`, `Agent` (needed because `/subagent` dispatches further per-task agents)

### Requirement: setup.sh distributes subagents to Claude Code only
The system SHALL symlink every file in `.claude-agents/` into `$PROJECT_DIR/.claude/agents/` and `$HOME/.claude/agents/` when those destinations are selected, and SHALL NOT create any equivalent files under any of the other 10 existing skill destinations (Cursor, Windsurf, OpenCode/generic, Codex, Gemini, Copilot, Kiro, Pi — project and global variants).

#### Scenario: Claude Code project selected
- GIVEN the user selects "Claude Code (project)" during `setup.sh`
- WHEN setup completes
- THEN `$PROJECT_DIR/.claude/agents/techie.md`, `plan.md`, `execute.md`, `release.md` exist as symlinks to `.claude-agents/*.md`

#### Scenario: Non-Claude-Code destination selected
- GIVEN the user selects only "Cursor (project)"
- WHEN setup completes
- THEN no `agents/` directory is created under `.cursor/` and no subagent files are installed anywhere for Cursor

### Requirement: New wrapper slash commands
The system SHALL provide five new skill files with `slash_command` frontmatter values `techie`, `plan`, `execute`, `release`, `cycle`, distributed the same way existing skills are (via `.skills/<name>/SKILL.md`, symlinked/generated into all applicable destinations by the existing `install_commands`/`symlink_skills` machinery). These SHALL NOT collide with the existing `slash_command: tdd` or `slash_command: ship` skills.

#### Scenario: New commands generate without filename collision
- GIVEN `.skills/execute-tdd/SKILL.md` (`slash_command: tdd`) and `.skills/ship/SKILL.md` (`slash_command: ship`) already exist
- WHEN the new skill files for `execute` and `release` are added
- THEN `install_commands` writes `superspecs/tdd.md`, `superspecs/ship.md`, `superspecs/execute.md`, and `superspecs/release.md` as four distinct files with no overwrite

### Requirement: techie subagent behavior
The system SHALL define `superspecs-techie` to, in order: (1) run `setup.sh` via Bash to install SuperSpecs into the current project, (2) detect whether the project is greenfield, (3) if greenfield, invoke the `techstack` skill, (4) read the resulting recommendations' `[shell]`/`[interactive]` markers (see "techstack install-command markers" requirement) and run the `[shell]`-marked install command for each recommended skill automatically, without asking per-item confirmation, (5) report a summary of what was installed and what requires manual follow-up.

**Greenfield definition:** a project is greenfield when, before `setup.sh` runs, `git log --oneline | wc -l` is 0 or 1 AND `git ls-files` lists nothing besides dotfiles and a top-level `README*`. Any other state (more commits, or tracked non-dotfile source files) is treated as an existing codebase.

#### Scenario: Greenfield project
- GIVEN a git repository with 0 commits and no tracked files besides `README.md`
- WHEN `superspecs-techie` runs
- THEN it runs `setup.sh`, then invokes `techstack`, then auto-installs every recommended skill marked `[shell]`

#### Scenario: Existing codebase
- GIVEN a repository with 5 commits and tracked source files beyond dotfiles/README
- WHEN `superspecs-techie` runs
- THEN it runs `setup.sh` and does NOT invoke `techstack`

#### Scenario: Recommended skill requires an interactive command
- GIVEN a recommended skill's install line is marked `[interactive]` (e.g. `/plugin marketplace add owner/repo`)
- WHEN `superspecs-techie` reaches the auto-install step
- THEN it does NOT attempt to run that command via Bash, and instead lists it in the final report as a manual follow-up step

### Requirement: techstack install-command markers
The system SHALL modify the `techstack` skill so that every install command it writes into `superspec/wiki/techstack/profile.md` (both curated-baseline and live-fetched picks) is tagged `[shell]` (a command directly runnable via Bash: `npx`, `git clone`, `cargo install`, etc.) or `[interactive]` (anything requiring a host slash command, e.g. `/plugin marketplace add ...`).

#### Scenario: Curated pick tagged correctly
- GIVEN the curated baseline entry `npx skills@latest add mattpocock/skills`
- WHEN `techstack` writes it into `profile.md`
- THEN the line is tagged `[shell]`

#### Scenario: Plugin-marketplace pick tagged correctly
- GIVEN a recommendation whose install command is `/plugin marketplace add owner/repo`
- WHEN `techstack` writes it into `profile.md`
- THEN the line is tagged `[interactive]`

### Requirement: plan subagent behavior
The system SHALL define `superspecs-plan` to run `/discuss` → `/spec` → `/grill` in sequence for one feature. If no topic is given, it SHALL consult the `backlog` skill to pick the next `todo` item before running `/discuss`. If `/grill` returns a NEEDS REVISION verdict, `superspecs-plan` SHALL stop and report the verdict back to the user rather than looping back into revision automatically.

#### Scenario: Topic given explicitly
- GIVEN the user dispatches `superspecs-plan` with a feature description
- WHEN it runs
- THEN it skips the backlog lookup and runs `/discuss` directly with that description

#### Scenario: No topic given, backlog has a todo item
- GIVEN `superspec/backlog/` contains at least one file with `status: todo`
- WHEN `superspecs-plan` is dispatched with no topic
- THEN it picks the oldest `todo` item, runs `/discuss` seeded with that item's content, and marks the item `status: in-discussion`

#### Scenario: No topic given, backlog is empty
- GIVEN `superspec/backlog/` has no `todo` items
- WHEN `superspecs-plan` is dispatched with no topic
- THEN it stops and reports that there is nothing to plan, without inventing a feature

#### Scenario: Grill returns NEEDS REVISION
- GIVEN `/grill` completes with a NEEDS REVISION verdict
- WHEN `superspecs-plan` reaches that point
- THEN it stops, reports the verdict and the required changes, and does not re-run `/grill` on its own

### Requirement: execute subagent behavior
The system SHALL define `superspecs-execute` to run `/pick-spec` → `/branch` → `/subagent` → `/tdd` → `/code-review` for one spec whose `spec.md` has `**Status:** ready-for-execution`, stopping if any step reports a blocking failure (e.g. a Critical code review finding, per the project's existing hard rule).

#### Scenario: Spec is ready
- GIVEN a spec with `**Status:** ready-for-execution`
- WHEN `superspecs-execute` is dispatched with that spec's slug
- THEN it runs all five steps in order and completes

#### Scenario: Spec is not ready
- GIVEN a spec with `**Status:** draft`
- WHEN `superspecs-execute` is dispatched with that spec's slug
- THEN it stops immediately and reports that the spec has not cleared `/grill`

#### Scenario: Critical code review finding
- GIVEN `/code-review` reports a Critical finding during execution
- WHEN `superspecs-execute` reaches that point
- THEN it stops and does not proceed, per the project's existing "never proceed past a Critical finding" rule

### Requirement: release subagent behavior
The system SHALL define `superspecs-release` to run `/verify` for one spec, stopping if `/verify`'s test-suite stage fails (per the project's existing gate: tests must pass before wiki import runs). If verify passes, it SHALL run `/ship` fully unattended — including commit, push, and pull request creation — with the PR's base branch set to `dev` (see "dev integration branch" requirement). No confirmation pause is required before push or PR creation: the user has explicitly requested full automode for this workflow (commit, push, PR all included), overriding the project's general default of confirming risky/visible actions.

#### Scenario: Verify passes
- GIVEN all tests pass and scenario coverage is complete
- WHEN `superspecs-release` is dispatched for that spec's slug
- THEN it completes `/verify` (both stages), then runs all of `/ship` (changelog, archive, mark-complete, commit, push, PR against `dev`) without pausing for confirmation

#### Scenario: Verify fails
- GIVEN the test suite has failures
- WHEN `superspecs-release` reaches the verify step
- THEN it stops before the wiki-import stage and before `/ship`, and reports the failures

### Requirement: dev integration branch
The system SHALL maintain a persistent local (and origin-pushed) `dev` branch that all spec branches build on, since specs may depend on each other. `execute-branch`'s branch-creation step SHALL create each spec's branch off `dev` (creating `dev` from the repository's current default branch first, if `dev` does not yet exist), instead of off the default branch directly. After `superspecs-release` opens a spec's PR (base `dev`), it SHALL immediately merge that spec's branch into the local `dev` branch and push the updated `dev` to `origin`, regardless of the PR's review state. Promoting `dev` into the default branch is out of scope for this feature.

#### Scenario: First spec, dev doesn't exist yet
- GIVEN no `dev` branch exists yet
- WHEN `superspecs-execute` runs `/branch` for the first spec
- THEN `dev` is created from the current default branch, and the spec's branch is created off `dev`

#### Scenario: Later spec builds on an earlier one
- GIVEN spec A already shipped and was merged locally into `dev`
- WHEN `superspecs-execute` runs `/branch` for spec B
- THEN spec B's branch is created off the current tip of `dev`, which includes spec A's changes

#### Scenario: Local merge happens regardless of PR review state
- GIVEN spec A's PR (base `dev`) is still open and unreviewed
- WHEN `superspecs-release` finishes shipping spec A
- THEN spec A's branch is merged into local `dev` and `dev` is pushed to `origin` anyway — the loop does not wait for PR approval

### Requirement: grill status flag
The system SHALL modify `plan-grill`'s step that writes/updates `spec.md` so that, on a READY verdict, it changes the `**Status:**` line from `draft` to `ready-for-execution`. On a NEEDS REVISION verdict, the line SHALL remain `draft` (or whatever it currently is — grill does not advance it).

#### Scenario: READY verdict updates status
- GIVEN a grill session concludes with verdict READY
- WHEN `plan-grill` finishes its steps
- THEN `spec.md`'s `**Status:**` line reads `ready-for-execution`

#### Scenario: NEEDS REVISION verdict does not update status
- GIVEN a grill session concludes with verdict NEEDS REVISION
- WHEN `plan-grill` finishes its steps
- THEN `spec.md`'s `**Status:**` line is unchanged

### Requirement: backlog skill
The system SHALL provide a `backlog` skill that reads and writes markdown files under `superspec/backlog/`, one file per item, each with frontmatter `status: todo | in-discussion | planned` and `created: <ISO date>` (plus a free-text title/body). It SHALL support: listing items, picking the `todo` item with the earliest `created` date (falling back to filename alpha order if `created` is missing on a tie or on legacy files), marking an item `in-discussion`, and marking an item `planned` once its resulting spec reaches `ready-for-execution`.

#### Scenario: List backlog items
- GIVEN `superspec/backlog/` contains 3 files with mixed statuses
- WHEN the backlog skill lists items
- THEN it reports all 3 with their current status

#### Scenario: Pick oldest todo item by created date
- GIVEN two `todo` items with `created: 2026-01-01` and `created: 2026-03-01`
- WHEN `superspecs-plan` asks the backlog skill for the next item
- THEN the `2026-01-01` item is picked

#### Scenario: Mark item planned
- GIVEN a backlog item is `in-discussion` and its resulting spec just reached `ready-for-execution`
- WHEN the backlog skill is invoked to sync status
- THEN that backlog item's `status` becomes `planned`

#### Scenario: No backlog folder exists yet
- GIVEN `superspec/backlog/` does not exist
- WHEN the backlog skill is invoked
- THEN it creates the folder and reports an empty list, rather than erroring

### Requirement: cycle skill (persistent)
The system SHALL provide a `superspecs/cycle` skill (not itself a subagent) that scans `superspec/specs/*/spec.md` for `**Status:** ready-for-execution`, and for every match, dispatches `superspecs-execute` and, only on its successful completion, dispatches `superspecs-release` for that spec — processing matches sequentially, one spec fully through execute-then-release before starting the next. Unlike a one-shot scan, `cycle` SHALL keep running until every spec present under `superspec/specs/` has reached a shipped/archived state: after processing all currently-matching specs, if any spec remains that is not yet `ready-for-execution` and not yet shipped (e.g. still `draft`, awaiting a human to run `/grill` on it), `cycle` SHALL wait and re-scan rather than exiting. It only exits once no spec remains in any pre-shipped state.

#### Scenario: One spec is ready, none left afterward
- GIVEN exactly one spec has `**Status:** ready-for-execution` and no other spec exists in any pre-shipped state
- WHEN `/superspecs:cycle` runs
- THEN it dispatches `superspecs-execute` then `superspecs-release` for that spec, confirms no specs remain pre-shipped, and exits

#### Scenario: Multiple specs are ready
- GIVEN two specs both have `**Status:** ready-for-execution`
- WHEN `/superspecs:cycle` runs
- THEN it fully processes the first spec (execute then release, including the local `dev` merge) before starting the second

#### Scenario: A spec is still draft when cycle starts
- GIVEN one spec is `ready-for-execution` and another is still `draft` (not yet grilled)
- WHEN `/superspecs:cycle` finishes the ready spec
- THEN it does not exit — it waits and re-scans, since the draft spec has not yet reached a shipped state, and picks it up once it becomes `ready-for-execution`

#### Scenario: No specs are ready or pending
- GIVEN no spec exists in `superspec/specs/`, or every spec has already shipped
- WHEN `/superspecs:cycle` runs
- THEN it reports that everything is built and exits

#### Scenario: execute fails
- GIVEN `superspecs-execute` stops on a blocking failure for a given spec (e.g. a Critical code review finding)
- WHEN `/superspecs:cycle` observes that
- THEN it does NOT dispatch `superspecs-release` for that spec, reports the failure, and stops advancing that spec — it continues processing other matched specs, but does not treat the failed spec as shipped, so it does not exit while that spec remains stuck

#### Scenario: subagent dispatch fails due to usage/token exhaustion
- GIVEN a dispatch of `superspecs-execute` or `superspecs-release` fails with a usage/rate-limit error rather than a task failure
- WHEN `/superspecs:cycle` observes that
- THEN it calls `ScheduleWakeup` with a delay appropriate to a token-exhaustion wait (not a tight poll), and on waking, retries the same spec from the step that failed — it does NOT report this as a blocking failure to the user, and does NOT give up on the run

## Error Behavior

- The system SHALL NOT run `techstack` on a non-greenfield project, even if requested, without explicit user confirmation that they want to re-run it.
- The system SHALL NOT silently execute an install command that isn't a plain shell command; it SHALL always surface such commands as manual steps in the final report.
- The system SHALL NOT advance a spec's status to `ready-for-execution` on any verdict other than READY.
- The system SHALL NOT dispatch `superspecs-execute` for a spec whose status is not `ready-for-execution`.
- The system SHALL NOT dispatch `superspecs-release` for a spec whose `superspecs-execute` run did not complete successfully.
- The system SHALL NOT create duplicate or colliding slash-command filenames when generating the 5 new commands alongside the existing 11.
- The system SHALL NOT push the `dev` branch into the repository's default branch (e.g. `main`) automatically, under any condition — that promotion is always a separate, human-initiated action.
- The system SHALL NOT treat a usage/rate-limit dispatch failure as a reason to abandon a spec — it SHALL retry after a `ScheduleWakeup` delay instead of surfacing it as a blocking error.

## Non-Functional Requirements

- Each subagent file SHALL be an orchestration wrapper: it SHALL invoke existing `.skills/*/SKILL.md` content via the `Skill` tool rather than re-describing those skills' internal steps.
- `setup.sh`'s new `.claude-agents/` distribution step SHALL be additive: existing behavior for all 12 current destinations SHALL be unaffected, verifiable by running `setup.sh` with only non-Claude-Code destinations selected and confirming no `.claude/agents` side effects occur outside the Claude Code selections.
- `cycle`'s token-exhaustion retry SHALL reuse the harness's existing `ScheduleWakeup` mechanism (the same primitive the `/loop` skill uses) rather than inventing new scheduling infrastructure; `cycle` is expected to run under `/loop`'s dynamic self-pacing so it can actually receive those wakeups.

## Out of Scope

- Cross-platform (non-Claude-Code) equivalents of the four subagents.
- Any MCP-backed backlog source or MCP client code.
- Any change to the internal instructions of `plan-discuss`, `plan-spec`, `execute-pick-spec`, `execute-subagent`, `execute-tdd`, `execute-review`, or `verify`, beyond the `plan-grill` status-flag addition, the `techstack` install-command-marker addition, the `execute-branch` dev-branch-base addition, and the `ship` configurable-PR-base-branch addition.
- Renaming or altering the existing `/superspecs:tdd` or `/superspecs:ship` commands (their default, standalone behavior — e.g. `/superspecs:ship`'s PR base branch when run by a human outside the loop — stays `main`, unchanged).
- Auto-driving `/discuss` → `/spec` → `/grill` against the backlog. The loop automates execute + release only; planning remains human-paced.
- Promoting `dev` into the repository's default branch (e.g. opening or merging a `dev` → `main` PR).

## Glossary

- **Subagent:** A Claude Code agent definition (`.claude/agents/*.md`) dispatchable via the Task/Agent tool, running with its own context.
- **READY flag:** The string `ready-for-execution` written into a spec's `**Status:**` line by `plan-grill` on a READY verdict.
- **dev branch:** A persistent local (and origin-pushed) integration branch that every spec branch is created from and merged back into, so specs that depend on each other build on top of one another without waiting for PR review.
- **Persistent (cycle):** Keeps running — waiting and re-scanning — until every spec has shipped, rather than exiting after one pass.
