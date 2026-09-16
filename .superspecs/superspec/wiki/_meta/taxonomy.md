---
title: Wiki Taxonomy
updated: ""
---

# Wiki Taxonomy

Canonical vocabulary for this vault: domain folders and tags.
- Run `/superspecs:tag-taxonomy` to audit and normalize tags.
- Run `/superspecs:wiki-lint` to detect domain drift.

---

## Domains

Domains are concern-centric, not feature-centric. A page's domain describes *what the
knowledge is about*, not which feature introduced it. Feature traceability lives in
`spec:` frontmatter, not in the folder name.

### Core Domains

| Domain | Folder | What goes here |
|--------|--------|----------------|
| `patterns` | `patterns/` | Cross-cutting implementation patterns: error handling, caching, retry, testing |
| `decisions` | `decisions/` | Architecture Decision Records — why X was chosen over Y |
| `auth` | `auth/` | Authentication, authorization, sessions, tokens |
| `api` | `api/` | API contracts, endpoint design, versioning, request/response shapes |
| `data` | `data/` | Data models, schemas, storage strategy, migrations |
| `ui` | `ui/` | Frontend components, routing, state management, styling patterns |
| `infra` | `infra/` | Deployment, CI/CD, environment config, hosting |
| `techstack` | `techstack/` | Stack profile and library choices (managed by /techstack) |

### Routing Rules

When ingesting a feature, assign each knowledge unit to a domain using this decision tree:

1. **Reusable cross-cutting pattern** (error handling, caching, retry, logging)? → `patterns/`
2. **Architecture decision** — why X was chosen over Y? → `decisions/`
3. **Auth, sessions, tokens, permissions**? → `auth/`
4. **API contract, endpoint, or request/response shape**? → `api/`
5. **Data model, schema, or storage decision**? → `data/`
6. **Infrastructure or deployment**? → `infra/`
7. **Frontend / UI concern**? → `ui/`
8. **Feature-specific knowledge that fits none of the above**?
   → Create a domain named after the feature slug (e.g. `payment-flow/`)
   → Add it to this file under "Project Domains" before creating the folder

**One domain per page.** If a page spans multiple concerns, split it into separate pages.
**Prefer existing domains.** Only create a new domain if nothing above fits.

### Project Domains

_(feature-specific domains added here as the project grows)_

---

## Domain Tags

Tags mirror domain names. Every page gets a tag matching its domain.

- `auth` — authentication and authorization
- `api` — API design and contracts
- `data` — data models and storage
- `ui` — frontend and interface
- `infra` — infrastructure and deployment
- `patterns` — reusable implementation patterns
- `decisions` — architecture decision records

## Topic Tags

_(add project-specific topic tags here)_

## Meta Tags

- `index` — index and home pages (reserved)
- `log` — activity log (reserved)
- `insights` — generated insights pages (reserved)
- `lint` — lint report pages (reserved)
- `query-derived` — pages created from /wiki-query results
- `capture` — pages created from /wiki-capture

## Aliases

_(non-canonical → canonical mappings, managed by /tag-taxonomy)_
