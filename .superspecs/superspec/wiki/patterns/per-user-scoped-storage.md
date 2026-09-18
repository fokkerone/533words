---
title: Per-User Scoped localStorage & Query-Key Pattern
summary: The convention used to make every localStorage key and Tanstack Query cache key include the signed-in learner's ID, so a shared device never leaks one learner's state or cached data into another's session.
tags: [patterns, user-accounts, state-management, react, turso]
spec: "[[user-accounts]]"
created: 2026-09-18
updated: 2026-09-18
provenance:
  sources: [specs/user-accounts/spec.md, phases/user-accounts-execute/review-log.md]
  extracted: 60%
  inferred: 35%
  ambiguous: 5%
---

# Per-User Scoped localStorage & Query-Key Pattern

## Summary
Once 533words became multi-user, every piece of client-side persisted state (the in-progress session, and the speed/voice/session-size/theme settings) and every Tanstack Query cache entry needed to be scoped to whichever learner is currently signed in — otherwise two classmates sharing a school laptop would see or resume each other's data.

## Context
All five settings modules ([[ui/session-state-pattern]]'s established never-throw save/load convention) and the word/score query hook predate multi-user accounts and used fixed, global `localStorage` keys and a fixed query key. user-accounts had to retrofit per-learner scoping into all of them without breaking the existing never-throw contract.

## Patterns

### Storage-key scheme: `533words:<userId>:<key>`
Every settings module gained a small private `storageKey(userId)` helper prefixing its existing key with the learner's ID:

```ts
// src/lib/theme-settings.ts (representative of all five modules)
function storageKey(userId: string): string {
  return `533words:${userId}:theme`;
}

export function saveTheme(userId: string, theme: Theme): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(theme));
  } catch { /* best-effort, never throws */ }
}
```

`userId` was made a **required** (not optional/defaulted) first parameter on every save/load/clear function across `session-storage.ts`, `speech-settings.ts`, `voice-settings.ts`, `session-size-settings.ts`, and `theme-settings.ts`. The never-throw behavior (corrupt data, unavailable `localStorage`, etc. all resolve to a safe default rather than throwing) was preserved unchanged from before this feature — only the key's shape and the function signatures changed.

### Query-key scoping: fold `userId` into the array
```ts
// src/hooks/use-words.ts
export const WORDS_QUERY_KEY = ["words"] as const;

export function useWords(userId: string) {
  return useQuery({
    queryKey: [...WORDS_QUERY_KEY, userId],
    queryFn: () => fetchWords(getDb(), userId),
  });
}
```
Tanstack Query treats a different `queryKey` array as a wholly separate cache entry, so this alone guarantees learner A's cached data is never served to learner B — no manual cache invalidation on login/logout needed. `useFlagWord`'s `invalidateQueries` call uses the same scoped key, so a mutation only ever invalidates its own learner's cache entry.

### Handling the pre-session-resolution render
Every one of these hooks/functions needs a real, non-null `userId` at the moment they run. Rather than making every call site defensively handle a possibly-null ID, `page.tsx`'s top-level component resolves the session first and only mounts the component tree that uses these hooks once a `userId` is guaranteed to exist (see [[auth/better-auth-setup]]'s `Home`/`PracticeScreen` split). This keeps every downstream module's signature simple (`userId: string`, never `userId: string | null`).

## Gotchas
- **This is a retrofit, not a from-scratch design:** every one of these five modules and the query hook already existed with unscoped signatures before this feature — the diff pattern (add a required `userId` first param, prefix the storage key, thread it from the caller) is mechanical and repeats five times. Worth remembering as the template if a sixth per-user-scoped module is ever added.
- **Orphaned old keys are left alone on purpose:** pre-existing, unscoped `localStorage` keys (`533words:session`, `533words:speed`, etc.) from before this feature shipped are never cleaned up — they just become inert dead entries in any browser that used the app pre-accounts. A deliberate, explicit decision (not an oversight) — see `superspec/specs/user-accounts/GRILL.md`.

## Related
- [[auth/better-auth-setup]] — where the `userId` value threaded through this pattern actually comes from (the signed-in session)
- [[ui/session-state-pattern]] — the settings-module save/load convention this pattern extends
- `src/lib/session-storage.ts`, `src/lib/speech-settings.ts`, `src/lib/voice-settings.ts`, `src/lib/session-size-settings.ts`, `src/lib/theme-settings.ts`, `src/hooks/use-words.ts` — implementation
