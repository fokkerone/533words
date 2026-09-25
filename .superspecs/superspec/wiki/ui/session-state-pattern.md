title: Immutable Session State Pattern
summary: How flashcard-session models a multi-step practice flow (pick → speak → reveal → flag) as pure, immutable state transitions, kept separate from React and from the DB. Extended by session-size-summary with a configurable session size and flag-order tracking, by editorial-redesign with an auto-advance consumer pattern, by user-accounts with a per-learner Home/PracticeScreen split, by star-total with an independent header badge query, and by star-progress-display with a goal-distance header message and a session-progress indicator.
tags: [ui, flashcard-session, session-size-summary, editorial-redesign, user-accounts, star-total, star-progress-display, state-management, react]
spec: "[[flashcard-session]]"
created: 2026-09-16
updated: 2026-09-25
provenance:
  sources: [specs/flashcard-session/spec.md, specs/flashcard-session/GRILL.md, phases/flashcard-session-execute/review-log.md, specs/session-size-summary/spec.md, specs/session-size-summary/GRILL.md, phases/session-size-summary-execute/review-log.md, specs/editorial-redesign/spec.md, phases/editorial-redesign-execute/review-log.md, specs/user-accounts/spec.md, phases/user-accounts-execute/review-log.md, specs/star-total/spec.md, phases/star-total-execute/review-log.md, specs/star-progress-display/DISCUSS.md, specs/star-progress-display/spec.md, specs/star-progress-display/GRILL.md, phases/star-progress-display-execute/review-log.md]
  extracted: 65%
  inferred: 30%
  ambiguous: 5%

# Immutable Session State Pattern

## Summary
The practice session's state machine (`SessionState`) is pure, framework-free TypeScript — no React, no DB — and every transition returns a new state rather than mutating in place. `src/app/page.tsx` is a thin consumer that wires this pure logic to React state, Tanstack Query, speech, and localStorage.

## Context
flashcard-session needed session logic (word pool, current word, flag results, completion) to be independently testable, resumable from `localStorage`, and safe against a set of edge cases surfaced during spec-grilling (double-flagging, flagging a non-current word, empty pools). Modeling it as an immutable value type made all of that straightforward to test without React or a DOM.

## Key Decisions

### Pure state object over a React reducer or external state library
**Chose:** Plain functions over a `SessionState` value (`createSessionState`, `pickNextWord`, `flagWord`, `isSessionComplete`), called from `page.tsx`'s local `useState`.
**Over:** `useReducer`, Zustand, or another state library.
**Because:** The logic needed to be testable in isolation (see `src/lib/session.test.ts`'s 19 tests) and serializable directly to `localStorage` via a generic `saveSession<T>`/`loadSession<T>` pair (see below) — a plain object needs no adapter for either.
**Trade-off:** `page.tsx` has to manually pair every state-changing call with a `saveSession` call; a reducer or store could centralize that, but wasn't judged worth the extra abstraction for a single-page app. ^[inferred]

### DB write before local save, always
**Chose:** In `handleFlag`, the Turso write (`flagMutation.mutateAsync`) happens and resolves *before* the local `SessionState` is updated and saved.
**Over:** Optimistic local update first, then a DB write with rollback-on-failure.
**Because:** The spec's grilled requirement is that a failed score write must leave the word "not yet flagged" (retryable), and a failed *local* save must never roll back an already-successful DB write. Ordering the DB write first makes the second guarantee structural — the local save literally cannot run before the DB write has already succeeded.
**Trade-off:** No optimistic UI — the flag buttons stay "pending" for the DB round-trip. Acceptable given `useFlagWord`'s `isPending` state is available if a future pass wants a loading indicator; not built in this pass (see Out of Scope in `superspec/specs/flashcard-session/spec.md`: "Visual/interaction design polish").

### Generic, type-parameterized localStorage layer
**Chose:** `saveSession<T>(state: T)` / `loadSession<T>(): T | null` in `session-storage.ts`, not coupled to `SessionState`.
**Over:** A `session.ts`-specific `saveSessionState`/`loadSessionState` pair.
**Because:** `session-storage.ts` was built by a subagent running in parallel with the subagent building `session.ts` — the concrete `SessionState` type didn't exist yet at that point. Keeping the persistence layer generic avoided a cross-task dependency and turned out to be a reasonable design on its own merits (reusable for any future serializable state).
**Trade-off:** None significant — `page.tsx` just supplies the type parameter (`saveSession<SessionState>(state)`).

### Session size is a required parameter, not a hardcoded constant or an internal default
**Chose:** `createSessionState(words, sessionSize)` / `startSession(words, sessionSize)` — `sessionSize` is required, replacing the original hardcoded `SESSION_SIZE = 24` constant. Every caller (the auto-start effect, `startNewSession`) supplies it explicitly from a `sessionSize` React state value, itself initialized from persisted settings.
**Over:** Keeping `sessionSize` optional with a default of 24 inside `session.ts` itself.
**Because:** the same "there's always a configured value, so make the caller supply it" reasoning already established for `speak(text, rate)` in [[patterns/web-speech-voice-selection]] — an internal default would let a future caller silently forget to pass the learner's actual chosen size.
**Trade-off:** a breaking signature change that broke `page.tsx`'s build until the integration task updated its call sites — same accepted transient-build-break pattern used for the `speak()` rate change (session-logic tests pass before the UI catches up; full `npm run build` is a later task's responsibility, not the signature-change task's).

### `startNewSession` unified into one parameterized function
**Chose:** `startNewSession(size: number)` is the single "discard and start fresh" code path, called by both the "New Session" button (passing the current `sessionSize` state) and the new session-size selector's change handler (passing the newly selected size).
**Over:** A separate handler for the size selector that duplicates `startNewSession`'s discard logic.
**Because:** grilled explicitly — avoids two implementations of the same "replace `session` with a fresh `createSessionState` call" logic drifting apart over time.
**Trade-off:** none — the caller-supplied `size` argument is used directly (not the `sessionSize` state) to avoid a stale-closure bug where `setSessionSize(size)` followed immediately by reading `sessionSize` in the same function body would still see the pre-update value (React state updates are not synchronous within a single event handler).

## Patterns

### The state shape
```ts
type Word = { id: string; text: string; score: number };
type FlagValue = "correct" | "incorrect";
type SessionState = {
  pool: Word[];                        // remaining, not-yet-presented words
  current: Word | null;                // the word currently shown/being flagged
  flagged: Record<string, FlagValue>;  // wordId -> how it was flagged this session
  flagOrder: string[];                 // wordIds in the exact order they were flagged
  total: number;                       // pool size at session start, for completion math
};
```

`flagOrder` was added by session-size-summary specifically to drive an ordered results-summary view — `flagged` alone (a plain object/`Record`) was judged too implicit a source of ordering to rely on as a contract, even though JS objects with string keys do preserve insertion order in practice. `flagWord` appends to `flagOrder` only on its actual-flag-applied path, never on either no-op path (non-current word, already-flagged word) — so the no-op guarantees below extend automatically to cover order too, without extra code.

### Completion is derived, not stored
```ts
isSessionComplete(state) =
  state.pool.length === 0 &&
  state.current === null &&
  Object.keys(state.flagged).length === state.total
```
No separate `status: "active" | "complete"` field — completion always follows from the other three fields, so it can't drift out of sync with them.

### Resolving text for a results view without storing it in SessionState
The results-summary table (session-size-summary) needs each flagged word's *text*, but `SessionState` only ever stores `Word` objects while they're in `pool`/`current` — once a word is flagged, only its ID survives (in `flagged`/`flagOrder`). Rather than adding a `text` field to flagged entries, `page.tsx` resolves it at render time: `session.flagOrder.map(id => words?.find(w => w.id === id))`, using the already-fetched `useWords()` data as a lookup table. Keeps `SessionState` from duplicating data that's already available elsewhere, at the cost of an O(n²) `find` over a session-sized list — judged fine at these sizes (max 64 words per session).

### Defensive no-ops instead of thrown errors
`flagWord` silently returns the input state unchanged if the target isn't the current word, or was already flagged, rather than throwing. This matches the spec's "SHALL NOT change score" wording (a behavioral requirement, not an error case) and keeps the UI layer simple — no try/catch needed around state transitions, only around the async DB call.

### `advance()` — flagging and picking-the-next-word unified into one consumer-level helper
**Chose:** `page.tsx` has a small local helper, `advance(state): SessionState`, that wraps `pickNextWord(state)` + `speak(next.current.text, rate, selectedVoiceURI)` and returns the updated state. `handleFlag` calls it after a successful DB write + `flagWord`, but only when `!isSessionComplete(next)`. The same helper is also called once at session start (both the auto-start effect and `startNewSession`), since removing the standalone "Next Word" button (editorial-redesign) meant nothing else would ever populate the very first word of a session.
**Over:** Keeping pick-and-speak logic only behind a dedicated "Next Word" button handler (the pre-editorial-redesign shape), or duplicating the pick+speak call at both the flag site and the session-start site.
**Because:** editorial-redesign's spec required flagging a word to "both record that flag and select/present the next word in the same action — without requiring a separate 'next word' action," and explicitly forbids a standalone next-word control. `advance()` is `session.ts`'s pure `pickNextWord` plus the speech side-effect, still kept at the `page.tsx` consumer layer (not pushed into `session.ts`, which stays framework/side-effect-free per the original design decision above).
**Trade-off:** none significant — this is a straightforward consequence of the "no separate next-word control" requirement, confirmed as a reasonable, necessary scope resolution during code review (not scope creep) since without it a session could never advance past `current: null` at start.

### `Home`/`PracticeScreen` split — decoupling session resolution from the practice UI
**Chose:** `page.tsx`'s default export (`Home`) became a thin wrapper: it resolves the signed-in learner's ID from Better Auth's `useSession()` and renders a minimal loading placeholder until that ID is known, then mounts a separate `PracticeScreen({ userId })` component containing everything that used to be in `page.tsx` directly (the `SessionState`, all settings, `advance()`, etc.).
**Over:** Keeping one component and defensively handling a possibly-null `userId` inside every hook/localStorage call.
**Because:** user-accounts (2026-09-18) made `userId` a required parameter on `useWords`/`useFlagWord` and on every settings module's save/load functions (see [[patterns/per-user-scoped-storage]]) — after Better Auth's session gating, there's a real client-render window where `useSession()` hasn't resolved yet. Splitting the component means `PracticeScreen`'s own hooks and lazy `useState` initializers (e.g. `restoreSession(userId)`, `loadSpeed(userId)`) can all assume a stable, non-null `userId` from their very first render, exactly like they already assumed a stable `rate`/`sessionSize` before this change.
**Trade-off:** none significant — this is a mechanical decomposition, not a design compromise. The loading placeholder itself also satisfies the "no word-bank content shown before a session resolves" requirement at the client level (on top of, not instead of, `[[auth/better-auth-setup]]`'s server-side `proxy.ts` redirect gate).

### Header star badge — a second, independent Tanstack Query hook, not derived state
**Chose:** star-total (2026-09-24) added `useUserStars(userId)` as a genuinely separate `useQuery` hook (own `STAR_TOTAL_QUERY_KEY`), rendered as a badge in the header next to the learner's identity, even though `useWords`'s already-loaded per-word scores could technically be summed client-side for free.
**Over:** Deriving the total from `useWords`'s cached data (a selector/computed value, zero extra network round-trip).
**Because:** keeps the header self-sufficient regardless of what else is loaded on a given page — this app already has pages (`/login`, `/register`) outside the practice screen, so a header/badge that doesn't depend on the full 533-word bank having loaded is more robust if the header ever needs to appear elsewhere.
**Trade-off:** one extra network query per page load that a derived value wouldn't need — accepted as negligible at this scale. See [[data/word-bank-schema]]'s "aggregate totals computed on read" entry for the full data-layer reasoning (including why this isn't a maintained cache table either).

### Header goal-distance message — only rendered once real data has loaded, and hidden below `tablet`
**Chose:** star-progress-display (2026-09-25) added a "Du benötigst noch X Sterne" / "Ziel erreicht! 🎉" message next to the star badge, driven directly by `useUserStars`'s raw `starTotal`/`isLoading`/`isError` — **not** `displayedStarTotal`'s existing 0-fallback. The message renders nothing at all while `starsLoading` or `starsError` is true, or while `starTotal` is `undefined`; only once a real value has loaded does it show either the distance sentence or the goal-reached message. The element also carries `hidden tablet:inline-flex` so it's absent below the `tablet` breakpoint (48rem/768px) entirely — not wrapped, not truncated.
**Over:** Reusing `displayedStarTotal`'s 0-fallback for this element too (would have briefly shown "Du benötigst noch 533.0 Sterne" during every load, a misleading flash of a wrong value); or making the message wrap onto a second header line on narrow viewports instead of hiding.
**Because:** grilled explicitly — a loading-state fallback of 0 makes sense for the star *badge* (a compact, always-present element where "0.0" briefly flashing is harmless), but embedding that same fallback into a full sentence risks showing a specific, wrong, confidently-stated number. Hiding below `tablet` was a direct user preference change mid-grill (from an initially-recommended `flex-wrap` solution) — the header already has many controls at that width, and the sentence is the longest single element in it.
**Trade-off:** the star badge itself and the goal-distance message now have *different* fallback/visibility rules for the exact same underlying `useUserStars` query — worth remembering if either element is touched again: they are not interchangeable, and "loading" looks different for each (badge: shows "0.0"; message: renders nothing).
**Testing note:** jsdom cannot evaluate real CSS media queries (same limitation as [[ui/design-tokens-theming]]'s Tailwind breakpoint tiers), so the `hidden`/`tablet:inline-flex` visibility is verified by asserting the Tailwind utility classes are present on the element (`toHaveClass("hidden", "tablet:inline-flex")`), not by an actual viewport resize.

### Session-progress indicator — a static "X / Y" derived directly from `SessionState`, no new state
**Chose:** star-progress-display (2026-09-25) added a `<p>` immediately above the practice-word-display area showing `{session.flagOrder.length + 1} / {session.total}` (e.g. "1 / 16" for the first word, "16 / 16" for the last), gated on `session?.current` alone — the same truthiness check the Play button and revealed-word text already used individually, but here applied without the `!revealed`/`revealed` split, so the indicator stays visible across the reveal transition rather than toggling with it.
**Over:** Introducing a new counter field on `SessionState`, or deriving progress from `session.pool.length` instead of `flagOrder.length`.
**Because:** `flagOrder.length + 1` and `session.total` were already exactly the values needed — no new state, no `session.ts` changes. Using `flagOrder.length` (rather than `pool.length`) matches how session-size-summary's results view already derives ordering from the same field, keeping one source of truth for "how many words have been flagged so far."
**Trade-off:** none significant — this is a pure display derivation with no new state to keep in sync.
**Accessibility:** static text with a German `aria-label` (`` `Wort ${X} von ${Y}` ``); explicitly **no** `aria-live` — grilled and confirmed the user did not want every word transition announced to screen-reader users, consistent with the rest of the header (the star badge also has no `aria-live`).

## Gotchas

- **Two `flagWord` functions, same name, different jobs:** `session.ts`'s `flagWord(state, wordId, correct): SessionState` (pure, in-memory) collided in name with `words.ts`'s original DB-writing function. Caught in code review after both were built in parallel by separate subagents; the DB-writing one was renamed to `writeWordFlag` rather than aliasing imports in the UI layer. Worth remembering if adding more session-adjacent modules: `flagWord`/`flag*` is an easy name to collide on.
- **Reveal state lives outside `SessionState` on purpose:** whether the current word's text is shown (`revealed`) is local `useState` in `page.tsx`, not part of the persisted session. Confirmed correct behavior in manual testing: reloading mid-session restores the same current word, but re-hides it (learner has to press Reveal again) — this wasn't explicitly speced but fell out naturally from the design and matches the spirit of "don't spoil the answer on refresh."

## Related
- [[data/word-bank-schema]] — where the `Word`/score data this state operates on comes from (per-learner since user-accounts), the "compute on read" star-total decision, and the negative-total note added by star-progress-display
- [[patterns/fake-db-client-testing]] — how the DB-touching half of the flow (`writeWordFlag`) is tested
- [[patterns/web-speech-voice-selection]] — the sibling required-vs-optional parameter reasoning `sessionSize` follows
- [[patterns/per-user-scoped-storage]] — the `userId`-scoping convention `PracticeScreen`'s settings/session calls all follow
- [[auth/better-auth-setup]] — where the `userId` passed into `PracticeScreen` comes from
- [[ui/design-tokens-theming]] — the visual redesign and theme-toggle work shipped alongside the `advance()` auto-advance pattern
- `src/lib/session.ts`, `src/lib/session-storage.ts`, `src/lib/session-size-settings.ts`, `src/app/page.tsx` — implementation
