title: Patterns
tags: [index, patterns]
updated: 2026-09-25

# Patterns

Reusable, cross-cutting implementation patterns.

## Pages

- [[fake-db-client-testing]] — how Turso-touching code is unit-tested without a real DB or a wire-protocol mock
- [[web-speech-voice-selection]] — German voice selection, overlap prevention, and a real async-loading race found via manual browser testing
- [[jsdom-radix-polyfills]] — the browser API no-op polyfills needed for shadcn/Radix components to mount under jsdom
- [[per-user-scoped-storage]] — the localStorage/Tanstack-Query cache-key convention for scoping state to the signed-in learner
- [[german-ui-text]] — the German-UI localization convention: no i18n framework, the Login/Logout exception, icon-over-translation, and the translated-heading/raw-detail error pattern
