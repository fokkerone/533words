@AGENTS.md

# SuperSpecs — Ship Convention

This repo has a real GitHub remote (`origin`, `github.com/fokkerone/533words`) and the `gh` CLI is available. `/superspecs:ship` SHALL open a pull request against `main` for every feature branch (`gh pr create --base main --head superspec/<slug> ...`) — it SHALL NOT merge the feature branch into `main` locally.

Earlier in this project's history there was no GitHub remote configured, so `/ship` fell back to a local `git merge --no-ff` into `main` (see the archived specs' `status.md` files for that historical record — those are accurate for the time they were written and should not be edited retroactively). That workaround no longer applies now that a real remote exists — always create a PR, never merge locally, unless explicitly told otherwise for a specific ship.

## Planning docs live on the feature branch, not `main`

`main` is now a protected branch on GitHub — direct commits to it are rejected; every change, including planning docs, must arrive via a PR. So `/discuss`, `/spec`, `/grill`, and `/pick-spec` SHALL commit their output (`DISCUSS.md`, `spec.md`, `tasks.md`, `GRILL.md`, `status.md`, and the `superspec/phases/<slug>-execute/` scaffold) directly onto the feature branch (`superspec/<slug>`), not onto `main` first. Create the branch as soon as planning docs need to be committed — earlier than `/branch`'s usual place in the lifecycle if necessary — rather than staging planning commits on `main` and moving them over later.

This is a project-specific convention (`main` branch protection), not a SuperSpecs skill default — none of the `discuss`/`spec`/`grill`/`pick-spec`/`branch` skill definitions themselves instruct where to commit; they only say which files to write.

## Branch from the latest merged state, not a stale `main`

Before `/branch` creates a new feature branch, check whether `origin/main` has commits not yet in the local `main` (`git fetch && git log main..origin/main`) and pull them in first. This alone isn't sufficient, though: if a *previous* feature's PR is still open (not yet merged into `origin/main`), a fresh branch from `main` will still be missing that work. In that case, either wait for the prior PR to merge before branching, or branch from the prior feature's own branch instead of `main` (and rebase onto `main` once that PR lands). This was learned the hard way: `star-progress-display` was branched from `main` while `german-ui`'s PR was still open, so its Task 1.1 executed against pre-translation English UI text and had to be rebased mid-execution onto `superspec/german-ui` once the gap was noticed.
