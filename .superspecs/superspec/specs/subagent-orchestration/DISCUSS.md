# Discussion: Subagent Orchestration

Date: 2026-09-11
Participants: human + AI

## What We're Building

SuperSpecs currently runs its whole PLAN → EXECUTE → VERIFY → SHIP lifecycle as a sequence of skills invoked one at a time in a single conversation. We're adding four Claude-Code-only **subagents** that each own one phase of that lifecycle end-to-end, plus a fifth orchestrator skill (`superspecs/cycle`) that watches for specs that have cleared the `/grill` gate and drives them through execution and shipping without further manual step-by-step invocation.

The subagents don't replace the existing skills — they call them. Each subagent is a thin orchestration wrapper around the same `.skills/*/SKILL.md` files that already exist, dispatched via the Task/Agent tool so the work can run with its own context and, for `techie`, largely unattended.

## Goals

- Four new subagents, each covering one lifecycle phase:
  - `superspecs-techie` — installs SuperSpecs into a project (runs `setup.sh`), runs `/techstack` on greenfield projects, and auto-installs the recommended skills it can install via a shell command.
  - `superspecs-plan` — runs `/discuss` → `/spec` → `/grill` in sequence, using a new `backlog` skill to pick what to plan next when the user doesn't specify a topic.
  - `superspecs-execute` — runs `/pick-spec` → `/branch` → `/subagent` → `/tdd` → `/code-review` for one spec.
  - `superspecs-release` — runs `/verify` → `/ship` for one spec.
- A new skill, `superspecs/cycle`, that scans `superspec/specs/*/spec.md` for a `ready-for-execution` status flag and, for each match, dispatches `superspecs-execute` then `superspecs-release` in sequence. One-shot: it processes whatever is READY right now and exits: it does not keep polling.
- A new skill, `superspecs/backlog`, backed by markdown files under `superspec/backlog/`, that `superspecs-plan` can consult to pick the next item to discuss.
- A small addition to the existing `plan-grill` skill: on a READY verdict, it flips `spec.md`'s `**Status:**` line to `ready-for-execution` (today that line is written once as `draft` and never updated by anything — nothing currently makes the verdict machine-readable).
- New wrapper slash commands: `/superspecs:techie`, `/superspecs:plan`, `/superspecs:execute`, `/superspecs:release`, `/superspecs:cycle`. Each wrapper's whole job is to dispatch the corresponding subagent (or, for `cycle`, to run the scan-and-dispatch skill directly since it isn't itself a subagent).
- `setup.sh` gains a new canonical source directory, `.claude-agents/*.md` (parallel to `.skills/*/SKILL.md`), symlinked only into the two Claude Code destinations (`.claude/agents/` project and global) — no other supported platform (Cursor, Windsurf, OpenCode, Codex, Gemini, Copilot, Kiro, Pi) gets these files, since none of them have a subagent primitive.

## Non-Goals (explicitly out of scope)

- No cross-platform subagent equivalent. Non-Claude-Code platforms keep using the existing skill-by-skill flow manually.
- No persistent/background version of `superspecs/cycle`. It is one-shot; a user who wants recurring polling can wrap it with the generic `/loop` skill themselves — that's not something this feature builds.
- No MCP-backed backlog source. `superspecs/backlog` is markdown-file-only. The design should leave an obvious extension point (e.g. a documented but unimplemented config field) for a future MCP source, but no MCP client code is written now.
- No auto-execution of skill installs that require an interactive slash command (e.g. `/plugin marketplace add ...`). `superspecs-techie` runs only installs that are plain shell commands; anything else is surfaced as a manual follow-up step.
- No change to the existing `.skills/*/SKILL.md` files' actual step-by-step instructions, except the one addition to `plan-grill` described above.
- No rename or behavior change to the existing `/superspecs:tdd` (execute-tdd, the RED-GREEN-REFACTOR skill) or `/superspecs:ship` commands — they keep their current narrower meaning. The new subagent wrapper commands are deliberately named `execute` and `release` instead, to avoid collision.

## Constraints

- **Technical:** Subagents are a Claude Code–only primitive (Task tool / `.claude/agents/*.md` with `name`/`description`/`tools` frontmatter). They must be able to call the existing skills via the `Skill` tool rather than duplicating instructions, so the skills stay the single source of truth.
- **Scope:** This feature only adds orchestration around the existing four-phase lifecycle; it does not change what `/discuss`, `/spec`, `/pick-spec`, `/subagent`, `/tdd`, `/code-review`, or `/verify` actually do internally. It does make four small, additive changes: `/grill`'s status-flag write, `/techstack`'s install-command markers, `/branch`'s dev-branch base, and `/ship`'s configurable PR base branch (see the amendment below).
- **Other:** `setup.sh`'s existing symlink/selection UX (fzf/gum/fallback) must keep working for the 12 existing destinations; the new `.claude-agents/` step is additive, only touching the two Claude Code destinations.

## Key Decisions Made

### Decision: Platform scope
**We will:** build these as real Claude Code subagents only (`.claude/agents/*.md`), distributed via a new `.claude-agents/` canonical source dir.
**Because:** subagents are a Claude-Code-specific primitive; other platforms in setup.sh's distribution list have no equivalent, and faking one with a plain skill would be misleading about what it can actually do (no unattended execution).
**We won't:** build a degraded cross-platform equivalent skill for this cycle.

### Decision: techie automation mode
**We will:** dispatch `superspecs-techie` as a one-shot run (install → techstack if greenfield → auto-install shell-installable recommended skills → report and exit).
**Because:** "loop im automode" was clarified to mean "doesn't stop to ask permission at each step," not "repeats itself."
**We won't:** build a persistent watcher that re-triggers itself on new projects.

### Decision: READY flag mechanism
**We will:** have `plan-grill` write `**Status:** ready-for-execution` into `spec.md` on a READY verdict; `superspecs/cycle` scans for that string across `superspec/specs/*/spec.md`.
**Because:** today's READY verdict is free text inside `GRILL.md`, which is not reliably machine-scannable; `spec.md`'s existing `**Status:**` line is the natural place for a structured flag since it's already part of the spec's contract.
**We won't:** introduce YAML frontmatter into `spec.md` for this — the existing `**Status:** draft` line format is kept, just made meaningful.

### Decision: cycle dispatch model
**We will:** make `superspecs/cycle` a one-shot skill (not itself a subagent) that scans for READY specs and, for each, dispatches `superspecs-execute` then waits for it to finish before dispatching `superspecs-release`, then exits after processing everything currently READY.
**Because:** matches the "file flag + one-shot dispatch" choice — simpler to reason about and debug than a persistent background loop, and composable with the generic `/loop` skill if the user wants recurrence later.
**We won't:** build automatic re-triggering or background polling into `cycle` itself.

### Decision: backlog skill scope
**We will:** back `superspecs/backlog` with markdown files under `superspec/backlog/` (one file per item, simple status frontmatter: `todo` / `in-discussion` / `planned`), consulted by `superspecs-plan` to pick the next item when no topic is given, and updated to `planned` once a spec reaches `ready-for-execution`.
**Because:** the MCP side isn't designed yet ("mehr dazu später"); building a stub now would guess at an interface that doesn't exist.
**We won't:** implement any MCP client or config wiring for it in this cycle — only leave the door open via documentation.

### Decision: wrapper command naming
**We will:** name the new wrapper slash commands `/superspecs:techie`, `/superspecs:plan`, `/superspecs:execute`, `/superspecs:release`, `/superspecs:cycle`.
**Because:** `/superspecs:tdd` and `/superspecs:ship` already exist as narrower single-step skills (the RED-GREEN-REFACTOR cycle, and the PR/changelog/archive step respectively); reusing those names for the broader subagent wrappers would collide in `setup.sh`'s `install_commands` (same generated filename) and confuse users about which one does what.
**We won't:** rename or remove the existing `/superspecs:tdd` or `/superspecs:ship` commands.

## Open Questions

- [ ] Exact frontmatter schema for `.claude-agents/*.md` (tool whitelist per subagent) — to be nailed down in `/spec`.
- [ ] Exact markdown schema for backlog items (frontmatter fields beyond `status`) — to be nailed down in `/spec`.
- [ ] Whether `superspecs/cycle` processes all currently-READY specs in one run or only the first one found — leaning toward "all," to be confirmed in `/spec`.
- [ ] Whether `superspecs-plan` should stop and hand back to the user on a `NEEDS REVISION` grill verdict, or loop back into revision automatically — leaning toward "stop and hand back," to be confirmed in `/spec`.

## Success Criteria

- [ ] Running `/superspecs:techie` in a fresh, empty git repo installs SuperSpecs, runs `/techstack`, and auto-installs at least the shell-installable recommended skills without further prompting per step.
- [ ] Running `/superspecs:plan` with no arguments picks a backlog item (if one exists), runs discuss → spec → grill, and stops with a clear READY/NEEDS REVISION verdict.
- [ ] A spec whose `spec.md` reads `**Status:** ready-for-execution` is picked up by `/superspecs:cycle`, which runs it through `superspecs-execute` then `superspecs-release` without manual step-by-step invocation.
- [ ] `setup.sh` still installs cleanly for all 12 existing destinations, and additionally symlinks the 4 new agent files into the 2 Claude Code destinations only.
- [ ] `/superspecs:tdd` and `/superspecs:ship` continue to work unchanged.

## Risks

- **Subagents duplicating skill logic instead of calling it:** mitigate by making `.skills/*/SKILL.md` the single source of truth and giving each subagent the `Skill` tool; subagent files should stay short (orchestration + sequencing only).
- **`techie` auto-installing something risky in "automode":** mitigate by restricting auto-install to plain shell commands from the curated/live skill list, and always surfacing (never silently skipping) anything requiring an interactive command.
- **Grill status-flag change breaking existing specs:** the one existing spec (`auth-jwt`) predates this flag; `/spec` should confirm this change is additive and doesn't break specs already in flight.
- **Naming confusion between `tdd`/`ship` (existing narrow skills) and `execute`/`release` (new broad subagent wrappers):** mitigated by the naming decision above; `/spec` should make sure the handoff text in each skill is unambiguous about which command to run next.

## Wiki References

None — wiki has no relevant pages for this feature (only an unrelated `auth` domain from a prior demo).

## Amendment (2026-09-11): Persistent cycle, dev-branch integration, fully autonomous release

After the spec first reached READY, the user asked to extend scope before execution started. This amendment **supersedes** the "cycle dispatch model" decision and the release half of the "release subagent behavior" grill resolution above.

**What changed:**

- `superspecs/cycle` is no longer one-shot. It SHALL keep running — processing every spec that reaches `ready-for-execution` — until every spec currently known to the project has shipped, not just the ones READY at the moment it started.
- If a subagent dispatch fails because the account is out of usage/tokens (a rate-limit style error), `cycle` SHALL NOT treat that as a blocking failure. It SHALL call `ScheduleWakeup` to retry later (reusing the harness's existing dynamic-loop-wakeup mechanism — the same one the `/loop` skill uses) and resume the same spec on wake, repeating as needed until it succeeds.
- `superspecs-release` no longer pauses for push/PR confirmation. Commit, push, and PR creation all run unattended, reversing the earlier grill resolution to Q4. The user explicitly requested full automode for tdd, branch creation, verify, commit, push, and PR — overriding the project's general "confirm risky actions" default for this specific, explicitly-requested workflow.
- Because specs may depend on each other, execution no longer targets `main` directly. All spec branches are created off (and, on success, immediately merged locally back into) a shared long-lived `dev` branch, so later specs build on top of earlier ones without waiting for GitHub-side PR review. Each spec still gets its own PR — base branch `dev` — for a human-reviewable history; the local merge into `dev` happens regardless of that PR's review state, and the updated `dev` is pushed to `origin` so the trail stays visible. Promoting `dev` to `main` (a final integration PR) is explicitly NOT part of this feature.

**Non-Goals updated:**
- ~~No persistent/background version of `superspecs/cycle`~~ — superseded; `cycle` is now persistent by design (see above).
- ~~Release pauses before push/PR~~ — superseded; release is now fully autonomous for this loop.
- New: promoting `dev` → `main` is out of scope — this feature stops at keeping `dev` current locally and on `origin`.
- New: the loop automates **execute + release only**. It does not auto-drive `/discuss` → `/spec` → `/grill` against the backlog — planning stays human-paced, consistent with the user listing only tdd/branch/verify/commit/push/PR for automode.
- Two more existing skills are touched beyond `plan-grill`/`techstack`: `execute-branch` (branch off `dev`, create it if missing) and `ship` (support a configurable PR base branch, defaulting to `main` for standalone `/superspecs:ship` use, but passed as `dev` when invoked from `superspecs-release`).

**New risk:** a "loop that keeps running across token exhaustion, in automode, with autonomous pushes and PRs" has real blast radius — a bug could spam PRs or push broken commits to `dev` repeatedly while unattended. Mitigated by: the existing Critical-code-review-finding gate still blocks (unchanged), `/verify`'s test-gate still blocks release (unchanged), and `dev` is never pushed to `main` automatically — a human still reviews before that final promotion.

**Accepted behavior (not a defect):** if a spec is left `draft` (nobody has run `/grill` on it), `cycle` waits and re-scans indefinitely rather than giving up — this is intentional, confirmed in the amendment grill pass. A human can always stop the loop or grill the stuck spec out of band.
