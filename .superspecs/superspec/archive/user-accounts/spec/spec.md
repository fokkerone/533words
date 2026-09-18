# User Accounts (Better Auth login/register + per-user scores) Specification

**Slug:** user-accounts
**Status:** draft
**Depends on:** none (builds on the already-shipped flashcard-session, speech-controls, session-size-summary, editorial-redesign)

## Purpose

533words is moving from a single-family tool to something a group of classmates can each use independently. This feature adds real account registration and login (email+password and Google), requires an active session to use the practice screen, and restructures word scoring from one global score per word into an independent score per learner per word — so each classmate's progress is tracked separately, even when multiple learners share the same device.

## Requirements

### Requirement: Email + Password Registration
The system SHALL let a visitor create a new account using an email address and password, without requiring email verification before the account can be used.

#### Scenario: Successful registration
- GIVEN a visitor on the registration page
- WHEN they submit an email address with no existing account and a password
- THEN a new account is created
- AND they are immediately signed in with an active session
- AND they are taken to the practice screen

#### Scenario: Registering with an email that's already in use
- GIVEN an email address that already has an account
- WHEN a visitor attempts to register with that same email
- THEN registration is rejected
- AND a clear error is shown
- AND no new account or session is created

### Requirement: Email + Password Login
The system SHALL let a learner with an existing email+password account sign in with their credentials.

#### Scenario: Successful login
- GIVEN a registered email+password account
- WHEN the learner submits the correct email and password
- THEN an active session is created
- AND they are taken to the practice screen

#### Scenario: Incorrect credentials
- GIVEN either an unregistered email or a registered email with the wrong password
- WHEN the learner submits those credentials
- THEN login is rejected with a generic error
- AND no session is created

### Requirement: Google Sign-In
The system SHALL let a visitor register or sign in using their Google account, as a single action (no separate "create account" step for Google).

#### Scenario: First-time Google sign-in creates an account
- GIVEN a visitor with no existing account linked to their Google identity
- WHEN they complete Google sign-in
- THEN a new account is created and linked to that Google identity
- AND an active session begins
- AND they are taken to the practice screen

#### Scenario: Returning Google sign-in reuses the existing account
- GIVEN a learner who previously signed in with a given Google identity
- WHEN they sign in with Google again
- THEN they are signed into that same existing account, not a new one

### Requirement: Logout
The system SHALL let a signed-in learner end their session from the header user menu.

#### Scenario: Logging out ends the session
- GIVEN a signed-in learner
- WHEN they activate Logout in the header user menu
- THEN their session ends
- AND a subsequent visit to the practice screen requires signing in again

### Requirement: Practice Screen Requires an Active Session
The system SHALL require an active session to view the practice screen, redirecting an unauthenticated visitor to the login page before any word-bank content is shown.

#### Scenario: Unauthenticated visit redirects to login
- GIVEN no active session
- WHEN a visitor navigates to the practice screen
- THEN they are redirected to the login page
- AND no word text, score, or session-progress content is shown first

#### Scenario: Authenticated visit shows the practice screen
- GIVEN an active session
- WHEN the learner navigates to the practice screen
- THEN the practice screen renders as already shipped (word bank, header, hero region, etc.)

### Requirement: Header User Menu
The system SHALL show the signed-in learner's identity and a Logout action in the header, alongside the existing session-size/theme/New-Session controls, whenever a session is active.

#### Scenario: User menu shows identity and logout
- GIVEN an active session
- WHEN the header is inspected
- THEN the learner's identity (name or email) is shown
- AND a Logout action is present

### Requirement: Per-Learner Word Scores
The system SHALL track each learner's correct/incorrect flags as a score independent of every other learner's score for the same word. A learner's score record for a given word SHALL be created only the first time they flag that word — until then, that word's score for that learner is implicitly 0.

#### Scenario: Flagging a word creates that learner's own score
- GIVEN a learner who has never flagged a particular word
- WHEN they flag it correct or incorrect
- THEN a score record is created for that learner and that word, reflecting the flag
- AND no other learner's score for that word is affected

#### Scenario: Two learners' scores for the same word stay independent
- GIVEN two learners who have each already flagged the same word at least once
- WHEN one of them flags that word again
- THEN only that learner's score changes
- AND the other learner's score for the same word is unchanged

#### Scenario: An unflagged word has an implicit score of 0
- GIVEN a learner who has never flagged a particular word
- WHEN their word bank / session pool is built
- THEN that word's score for them is treated as 0 — identical to the previously-shipped single-user default

### Requirement: Prior Global Scores Are Not Carried Forward
The system SHALL NOT preserve or migrate the previously-shipped single global score value per word into the new per-learner scoring model.

#### Scenario: Every learner starts at an implicit 0, including the original user
- GIVEN the previously-shipped word bank with non-zero global score values
- WHEN per-learner scoring is in place
- THEN no learner's score for any word reflects the old global value
- AND every learner, including the app's original user, starts at an implicit score of 0 for every word

### Requirement: Client-Side State Scoped Per Learner
The system SHALL scope all client-side persisted state — the in-progress session and the speed/voice/session-size/theme settings — to the currently signed-in learner, so that a different learner signing in on the same device never sees or resumes another learner's state.

#### Scenario: Switching accounts on the same device does not leak state
- GIVEN Learner A has an in-progress session and customized settings persisted on a device
- WHEN Learner A signs out and Learner B signs in on the same device
- THEN Learner B sees neither Learner A's in-progress session nor Learner A's settings

#### Scenario: Returning to the same account restores that learner's own state
- GIVEN Learner A previously had an in-progress session and settings persisted on a device
- WHEN Learner A signs out and later signs back in on the same device
- THEN Learner A's own in-progress session and settings are restored, matching the existing single-user reload behavior

### Requirement: Word/Score Data Fetching Is Scoped Per Learner
The system SHALL fetch and cache word/score data per the currently signed-in learner, so that cached data from one learner's session is never shown to a different learner without a fresh, correctly-scoped fetch.

#### Scenario: Cached data does not leak between accounts
- GIVEN Learner A's word/score data has already been fetched and cached on a device
- WHEN Learner B signs in on that same device
- THEN Learner B's word bank view reflects Learner B's own scores, not Learner A's cached data

## Error Behavior

- The system SHALL NOT create a session when registration or login fails.
- The system SHALL NOT reveal, on a failed login, whether the failure was an unrecognized email or an incorrect password — the error message SHALL be generic either way.
- The system SHALL show a retry-capable error (consistent with the existing "Score write fails" behavior) if a signed-in learner's score write fails.
- The application SHALL NOT provide any code path that reads or writes another learner's score data — every score read/write the app itself issues SHALL be scoped to the currently signed-in learner's own ID.

## Non-Functional Requirements

- No email verification step gates registration or login.
- No password-reset ("forgot password") flow is provided in this pass.
- Secrets required for authentication (the session-signing secret, Google OAuth client credentials) SHALL be supplied via environment variables and SHALL NOT be committed to source control — the same handling already established for the Turso access token.
- This feature SHALL NOT regress any already-shipped, still-applicable scenario from flashcard-session, speech-controls, session-size-summary, or editorial-redesign beyond the specific behavior changes described above (e.g. word reveal, speed/voice controls, theme toggle, results summary all continue to work, now per authenticated learner).
- Accepted trust boundary: word/score data remains client-direct against Turso (no server-side authorization layer, per this feature's architecture decision — see Out of Scope). The application's own code never writes to another learner's score, but nothing at the database level prevents a user with browser devtools access from crafting a request that does. This is consistent with the app's pre-existing trust model (the Turso access token has always been reachable from the browser) and is accepted as reasonable for a small group of non-adversarial classmates, not a security guarantee against a malicious user.

## Out of Scope

- Password reset / "forgot password" flow
- Email verification at registration
- Roles or permissions (e.g. teacher vs. student, admin capabilities)
- Any social sign-in provider besides Google
- Migrating or attributing the old global score values to any specific account
- Moving word/score reads or writes behind server routes or Server Actions — they remain client-direct against Turso, scoped by the signed-in learner's ID, exactly as today's architecture but scoped
- A dedicated profile/settings page beyond the header user menu (no avatar upload, no display-name editing)
- Rate limiting or abuse prevention beyond whatever Better Auth provides by default

## Glossary

- **Learner:** an authenticated user of the app — a classmate or the app's original user.
- **Score record:** a per-(learner, word) value tracking correct/incorrect flags, replacing the previous single global per-word score.
- **Active session:** the signed-in state Better Auth establishes after successful registration, login, or Google sign-in, and ends on logout.
