# Subagents & the Build Loop

> **Status:** Designed, not yet built. This describes the target usage once
> `superspec/specs/subagent-orchestration/` (verdict: READY) has gone through
> `/pick-spec` → `/branch` → implementation. Treat this as the spec's intended
> user-facing behavior, not a shipped feature yet.

Claude Code only — subagents (`.claude/agents/*.md`, dispatched via the
Task/Agent tool) are a Claude-Code-specific primitive. On every other
platform SuperSpecs supports (Cursor, Windsurf, OpenCode, Codex, Gemini,
Copilot, Kiro, Pi) you keep using the granular commands
(`/discuss`, `/spec`, `/grill`, `/pick-spec`, `/branch`, `/subagent`, `/tdd`,
`/code-review`, `/verify`, `/ship`) one at a time, exactly as today.

---

## The five commands

| Command | What it does | Runs as |
|---|---|---|
| `/superspecs:techie` | Installs SuperSpecs into the current project (`setup.sh`); on a greenfield project also runs `/techstack` and auto-installs the shell-installable recommended skills | one-shot subagent |
| `/superspecs:plan` | Runs `/discuss` → `/spec` → `/grill` for one feature; if you don't give it a topic, it pulls the next item from the backlog | one-shot subagent |
| `/superspecs:execute` | Runs `/pick-spec` → `/branch` → `/subagent` → `/tdd` → `/code-review` for one spec that's already READY | one-shot subagent |
| `/superspecs:release` | Runs `/verify` → `/ship` for one spec — commit, push, and PR, fully unattended | one-shot subagent |
| `/superspecs:cycle` | The loop: keeps running `execute` → `release` for every spec that becomes READY, until everything is built | skill (not a subagent) |

`execute` and `release` are deliberately not named `tdd`/`ship` — those two
commands already exist as the narrower single-step skills and keep working
exactly as before, standalone.

---

## Typical usage

**Set up a new project once:**

```
/superspecs:techie
```

Runs `setup.sh`. If the repo has no real history yet (0–1 commits, nothing
tracked besides dotfiles/README), it also runs `/techstack` and installs
whatever recommended skills it can install with a plain shell command —
anything that needs an interactive command (e.g. `/plugin marketplace add …`)
is listed at the end instead of run.

**Plan features, one at a time or from a backlog:**

```
/superspecs:plan                       # picks the oldest backlog item
/superspecs:plan "add rate limiting"   # or give it a topic directly
```

`plan` walks `/discuss` → `/spec` → `/grill`. If `/grill` comes back NEEDS
REVISION, `plan` stops and hands the verdict back to you — it does not loop
on its own. Only a READY spec (`spec.md`'s `**Status:**` line reading
`ready-for-execution`) is picked up by the next step.

**Build everything that's ready, and keep going:**

```
/superspecs:cycle
```

This is the part that runs unattended. Start it under `/loop` so it can
survive being interrupted (see below), and it will:

1. Scan `superspec/specs/*/spec.md` for `ready-for-execution`.
2. For each match, run `execute` then `release`, one spec fully at a time.
3. Not stop when the queue empties — if any spec is still `draft` (not yet
   grilled), it waits and re-scans, picking it up the moment it turns READY.
4. Only exit once every spec under `superspec/specs/` has shipped.

You can also run `execute` or `release` by hand for a single spec if you
don't want the full unattended loop.

---

## The `dev` branch — why specs don't each go straight to `main`

Specs can depend on each other, so `cycle` doesn't send every spec's PR
straight to your default branch. Instead:

```
main
 └── dev                     ← persistent integration branch, created on first use
      ├── feature-a           ← spec A's branch, created off dev
      └── feature-b           ← spec B's branch, created off dev's tip *after* A merged
```

- `/branch` creates `dev` from your default branch the first time it's
  needed, then branches each spec off `dev` — never off `main` directly.
- After a spec ships, its branch is merged into local `dev` and `dev` is
  pushed to `origin` immediately — this happens whether or not that spec's
  own PR has been reviewed yet. That's what lets spec B start from spec A's
  finished work without waiting on GitHub.
- Each spec still gets its own PR (base `dev`) so you have a normal
  per-feature review trail.
- **Promoting `dev` into `main` is a separate, manual step.** Nothing in this
  feature does that automatically — you decide when `dev` is ready to go out.

Running `/superspecs:ship` by hand, outside the loop, is unaffected — it
still targets `main` by default.

---

## Full automode — what's unattended and what still stops the loop

You asked for tdd, branch creation, verify, commit, push, and PR to all run
without stopping to ask — and that's what `release` does now: no
confirmation pause before pushing or opening a PR.

What still stops the loop, because these are correctness gates, not
"risky action" confirmations:

- A **Critical finding** from `/code-review` — execution halts for that spec.
- A **failing test** in `/verify` — release halts before the wiki-import
  stage and before `/ship`.
- `dev` is **never** auto-merged into `main`.

A stopped spec doesn't stop the whole loop — `cycle` reports the failure and
keeps the rest of the queue moving.

---

## Surviving token exhaustion

`cycle` is designed to run inside a `/loop` invocation:

```
/loop /superspecs:cycle
```

If a dispatch to `execute` or `release` fails because the account is out of
usage (a rate-limit-style error, not a task failure), `cycle` does not treat
that as broken — it schedules a wakeup and retries the same spec once
tokens are available again, repeating for as long as it takes. This reuses
the same wakeup mechanism the generic `/loop` skill already provides; no new
infrastructure is required.

---

## Backlog

`/superspecs:plan` with no topic pulls from `superspec/backlog/` — one
markdown file per candidate feature, with `status: todo | in-discussion |
planned` and a `created:` date used to pick the oldest item first. An item
flips to `planned` once its resulting spec reaches `ready-for-execution`.
There's no MCP-backed backlog source yet — markdown files only, for now.
