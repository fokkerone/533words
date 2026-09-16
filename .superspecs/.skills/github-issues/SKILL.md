---
name: github-issues
description: Read, list, and summarize GitHub issues (github.com or a self-hosted GitHub Enterprise Server instance) via the project's configured `github` MCP server. Read-only — never creates, edits, or closes issues. Triggers on /issues, "show open issues", "read issue #<n>", "what issues are open", "list github issues".
slash_command: issues
phase: "1.0 — Plan › GitHub Issues"
---

# Skill: github-issues

You read GitHub issues for the current project so a human (or `/superspecs:discuss`) has real context before planning. This skill is read-only: it never creates, edits, comments on, or closes anything on GitHub.

**Prerequisite:** a `github` MCP server must be configured in this project's `.mcp.json` (created by `setup.sh` — see "MCP Setup" below) and the tools it exposes must be available. If no `github`-prefixed MCP tool is available, stop and say:

> "No GitHub MCP server is connected. Check `.mcp.json` for a `github` entry, and make sure `GITHUB_PERSONAL_ACCESS_TOKEN` (and `GITHUB_HOST`, if this is GitHub Enterprise Server) are exported in your shell before starting this session."

## MCP Setup (per project, configurable)

`setup.sh` writes a default `.mcp.json` pointing at the official `github-mcp-server` (via Docker) configured for **github.com**:

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

This is only written if `.mcp.json` doesn't already exist — an existing file is never overwritten. Each project configures its own credentials by exporting `GITHUB_PERSONAL_ACCESS_TOKEN` in its own shell/CI environment. Nothing secret is ever committed.

**For a self-hosted GitHub Enterprise Server instance:** add a `GITHUB_HOST` entry to both `args` and `env` in `.mcp.json`:

```json
"args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "-e", "GITHUB_HOST", "ghcr.io/github/github-mcp-server"],
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}",
  "GITHUB_HOST": "${GITHUB_HOST}"
}
```

...then export `GITHUB_HOST=https://github.<your-company>.com` alongside the token. This is a one-time, per-project edit — `setup.sh` never assumes GHE for you, since the same framework installs into both github.com and GHE projects.

## Steps

### 1. Determine the target repository

Unless the user gives an explicit `owner/repo`, infer it from the current git remote:

```bash
git remote get-url origin
```

Parse `owner` and `repo` out of that URL (works for both `git@host:owner/repo.git` and `https://host/owner/repo.git` forms — the `host` may be `github.com` or a GHE domain).

If there's no git remote and no explicit `owner/repo` was given, stop and ask for one.

### 2. Determine the request

Listen for what's being asked:

- **List issues** (default): open issues, unless the user asks for closed/all. Support filtering by label, assignee, or milestone if mentioned.
- **Read one issue**: a specific issue number — fetch its full body, labels, comments if asked.
- **Search**: a free-text query — use the MCP server's search/list capability with that query.

Do not invent filters the user didn't ask for. Default to open issues, unpaginated beyond a reasonable first page (~30), and say so ("showing the first 30 open issues — ask for more if needed").

### 3. Fetch via the MCP server

Use whichever `github`-prefixed MCP tool matches the request (list issues / get issue / search issues). Pass the resolved `owner`/`repo` (and `host`, implicitly handled by the server's own configuration — never hardcode a host in the tool call).

### 4. Summarize

For a list: a compact table — number, title, labels, assignee, age. For a single issue: number, title, author, state, labels, body (trimmed if very long), and a short synthesis of what it's asking for.

Do not editorialize about priority or feasibility unless asked — this skill reads and reports, it doesn't triage.

### 5. Offer next steps (don't act on them)

If the issue looks like it describes a feature to build, mention that `/superspecs:discuss` or `/superspecs:plan` can turn it into a spec — but do not run either automatically. This skill's job ends at reporting.

## What NOT to do

- Do not create, edit, comment on, close, or label any issue — this skill is read-only.
- Do not hardcode a GitHub host — always rely on however the project's own `.mcp.json` has the `github` server configured.
- Do not guess `owner/repo` if there's no git remote and none was given — ask instead.
- Do not silently fall back to a different data source if the MCP server isn't available — report the missing prerequisite (see above) instead of, say, shelling out to `gh` or scraping the web.
