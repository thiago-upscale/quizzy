# Live Participant Entry Design

## Context

Quizzy already supports:

- creator authentication
- quiz editing with branding
- live session creation with PIN generation
- host session detail view

What is still missing is the participant-facing live flow. Today the host can create a live session and obtain a PIN, but participants do not yet have a public entry path to join the session.

This spec defines the MVP participant entry flow for live sessions, with QR Code as the primary path and manual PIN entry as fallback.

## Goals

- Let participants join a live quiz through a public flow.
- Make QR Code the fastest path into a session.
- Preserve manual PIN entry as fallback.
- Keep the first realtime slice focused on presence and session-state changes.
- Reuse existing branding and session data so the participant experience already feels productized.

## Non-goals

- Full live gameplay engine for all question states.
- Answer submission and scoring logic in this slice.
- Final leaderboard and reporting updates.
- Individual async session flow improvements.

## User Decisions Captured

- QR Code should open the session directly, without asking for PIN first.
- Live entry should ask for nickname and optional email.
- The waiting screen should show branding, participant list, and a live-ready indicator.
- When the host starts the session, participants should see a short 3-second countdown and then transition automatically.

## Proposed Routes

- `GET /join`
  - public fallback page for manual PIN entry
- `GET /live/[pin]`
  - public entry page for a live session
  - if participant is not identified, this route shows the identification form
  - if participant already has a valid participant token, it can continue straight to the lobby state
- `GET /live/[pin]/lobby`
  - participant waiting room after identification
- existing host route remains:
  - `GET /dashboard/sessions/[sessionId]`

For the MVP, `pin` is the public live-session identifier because it already exists in the data model and matches the live host workflow.

## UX Flow

### 1. Host creates a live session

The host creates a live session from the quiz editor and lands on the host session detail page.

The host page should show:

- session PIN
- QR Code pointing to the public live route
- public session URL
- current session status
- participant count
- list of joined participants
- action to start the session

### 2. Participant enters through QR Code

The QR Code points to:

`/live/[pin]`

The participant should not need to type the PIN if they used the QR Code.

If the session is valid and in a joinable state, the participant sees:

- quiz title
- quiz branding
- nickname field
- optional email field
- join action

### 3. Participant enters through manual PIN

The `/join` page lets a participant:

- enter the session PIN
- continue to `/live/[pin]`

This page acts as fallback for users not scanning the QR Code.

### 4. Participant lobby

Once identified, the participant enters the live lobby and sees:

- quiz branding
- quiz title
- waiting state
- joined participant list
- participant count / room readiness indicator

This screen should feel alive even before gameplay starts.

### 5. Session start

When the host starts the session:

- session state changes from `waiting` to `countdown`
- participants receive a realtime event
- the lobby shows a 3-second countdown
- after countdown, the participant transitions automatically into the first question state

This slice only needs to hand off to a placeholder first-question screen if full gameplay is not yet implemented.

## Data Model and Persistence

Existing tables are sufficient for the MVP with no required schema change.

### `quiz_sessions`

Use `status` with these values in this slice:

- `waiting`
- `countdown`
- `playing`
- `finished`

### `participants`

Use existing fields:

- `nickname`
- `email`
- `participantToken`
- `joinedAt`

When a participant joins:

- create a participant row if needed
- store `participantToken` client-side for re-entry continuity during the life of the session

### `session_events`

Record:

- `participant.joined`
- `participant.left`
- `session.countdown_started`
- `session.started`

## Re-entry Behavior

Participant re-entry should work during the life of the session.

Mechanism:

- store `participantToken` in cookie or localStorage
- when returning to `/live/[pin]`, look up the participant by token and session
- if valid, skip the identification form and restore lobby/session state

If the token is invalid or the session is no longer joinable, the participant returns to the public entry state with a friendly message.

## Architecture

### Web app responsibilities

- render public join pages
- render public lobby pages
- render host session page updates
- generate QR Code URL
- create/join participant records through server actions or route handlers
- fetch initial session state for server-rendered entry points

### Realtime service responsibilities

- handle participant socket connections
- map sockets to sessions and participant tokens
- broadcast participant presence changes
- broadcast session status changes
- broadcast countdown start

This keeps SSR and forms in the web app while the realtime service focuses on presence and live updates.

## Realtime Contract

Initial event set:

- `session:join`
  - participant joins a live session channel
- `participant:list`
  - updated participant list for the lobby
- `session:state`
  - current session status payload
- `session:countdown`
  - countdown start payload
- `session:started`
  - transition signal into question mode

Suggested host-side events:

- `host:start-session`

The web app can trigger host actions through server endpoints and/or an authenticated socket connection, but the first implementation should keep host control simple and explicit.

## Error Handling

Public flow should explicitly handle:

- invalid PIN
- expired session
- finished session
- duplicate nickname in the same session
- reconnect with stale participant token
- network interruption during lobby presence

User-facing errors should be short and clear, especially on mobile.

## Security and Privacy

- Only live sessions in a joinable state should be publicly accessible by PIN.
- Participant email remains optional and should be clearly treated as such.
- Host dashboard routes remain authenticated.
- Public routes must not expose internal IDs when `pin` is sufficient.

## Testing Scope

This slice should be validated with:

- public access to `/join`
- public access to `/live/[pin]`
- QR Code URL generation from host session screen
- join with nickname only
- join with nickname + optional email
- duplicate nickname handling
- participant list updates across multiple browser tabs/devices
- host start action triggering participant countdown
- participant automatic transition after countdown
- re-entry using stored participant token

## Recommended Implementation Order

1. Add public routes for `/join` and `/live/[pin]`
2. Add participant creation/join flow with token persistence
3. Add host session enhancements: QR Code, public URL, participant list, start button
4. Add realtime presence and lobby updates
5. Add countdown transition from host to participants
6. Add placeholder first-question screen if full question flow is not yet ready

## Acceptance Criteria

- Host can create a live session and see a QR Code and public URL.
- Participant can scan the QR Code and reach the session without entering PIN.
- Participant can join with nickname and optional email.
- Participant sees a live lobby with branding and participant presence.
- Host can start the session.
- Participants receive a 3-second countdown and transition automatically.

