@AGENTS.md

# SuperSpecs — Ship Convention

This repo has a real GitHub remote (`origin`, `github.com/fokkerone/533words`) and the `gh` CLI is available. `/superspecs:ship` SHALL open a pull request against `main` for every feature branch (`gh pr create --base main --head superspec/<slug> ...`) — it SHALL NOT merge the feature branch into `main` locally.

Earlier in this project's history there was no GitHub remote configured, so `/ship` fell back to a local `git merge --no-ff` into `main` (see the archived specs' `status.md` files for that historical record — those are accurate for the time they were written and should not be edited retroactively). That workaround no longer applies now that a real remote exists — always create a PR, never merge locally, unless explicitly told otherwise for a specific ship.
