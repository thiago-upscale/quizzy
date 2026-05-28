# Live Operational Reliability Design

## Objective

Reduce the main operational risks in live sessions before beta without opening a large new platform surface.

This iteration must improve:

- operational visibility for the host
- resilience when the host disconnects
- protection against basic PIN-entry abuse
- rejection and observability of invalid or duplicate answers
- consistency of live room snapshots for reconnect and recovery flows

## Scope

This design covers:

- host-focused operational status inside the existing live session screen
- realtime handling for temporary host absence
- basic entry protection for public live routes
- stronger answer rejection semantics and structured logging
- richer room snapshots shared with host and participants

This iteration does not cover:

- a separate global admin dashboard
- advanced anti-fraud heuristics
- captcha or third-party abuse mitigation
- full Sentry tuning and alert routing
- business analytics or growth instrumentation

## Recommended Approach

Use a combined thin-slice approach:

1. strengthen the realtime session model with explicit operational state
2. expose the most useful operational status directly in the host session UI
3. add lightweight protection on public entry and answer submission
4. keep all changes compatible with a future dedicated operations dashboard

This approach is recommended because it improves real reliability and host confidence at the same time, without requiring a new subsystem.

## User Flow

### Host normal flow

1. Host opens the live session screen
2. The screen shows:
   - current session phase
   - host connection status
   - connected and offline participant counts
   - timestamp of the last critical room event
3. During gameplay, the host sees warnings if the session enters an unhealthy state

### Host disconnect and return

1. Host temporarily loses the websocket connection
2. The live room is not destroyed
3. The room enters an operationally interrupted state if the host does not reconnect within the grace window
4. Participants see a clear paused/interrupted message
5. When the host returns with the same session identity, control is restored
6. The current room snapshot is replayed and the host can continue safely

### Participant entry protection

1. Participant attempts to enter a PIN through the public flow
2. If attempts remain within the allowed limit, the flow proceeds normally
3. If attempts exceed the short-window threshold, the request is denied with a neutral message
4. The denial is logged as an operational security event

### Invalid answer handling

1. Participant submits an answer
2. The realtime service validates:
   - participant belongs to the session
   - the question is still open
   - the participant has not already submitted for the current question
3. If invalid, the answer is rejected with a structured reason and logged
4. If valid, the answer is accepted and persisted as before

## Architecture

### Web app responsibilities

The web app is responsible for:

- rendering operational status on the host session screen
- showing participant-facing interruption messages
- applying lightweight request gating on public join flows
- persisting state-change events from realtime callbacks

### Realtime service responsibilities

The realtime service is responsible for:

- tracking host presence independently from participant presence
- deciding when a room is interrupted
- broadcasting operational status changes
- rejecting invalid answers with explicit reasons
- exposing a richer room snapshot

## Session state model

Add an operational layer to the existing live flow.

Existing gameplay states:

- `waiting`
- `countdown`
- `playing`
- `question_result`
- `finished`

New operational state:

- `interrupted`

Recommended semantics:

- `interrupted` means the session did not finish naturally and is temporarily paused because host control is unavailable
- the room may move back from `interrupted` to its prior gameplay state if the host reconnects within the allowed window
- if the host does not return and the session can no longer continue safely, the room may be finalized from `interrupted`

## Presence model

Track host presence separately from room phase.

Suggested room snapshot additions:

- `hostPresenceStatus: "online" | "offline"`
- `hostLastSeenAt: string | null`
- `lastEventAt: string | null`
- `interruptionReason: "host_disconnected" | null`
- `connectedParticipantsCount: number`
- `offlineParticipantsCount: number`
- `rejectedAnswersCount: number`
- `pinRateLimitState` kept internal to the server and not broadcast publicly

This lets the UI distinguish:

- a session that is active and healthy
- a session that is active but host-disconnected
- a session that is operationally interrupted

## Host disconnect handling

### Grace window

When the host disconnects:

- do not interrupt the room immediately
- mark host presence offline
- start a short grace window timer

Recommended MVP default:

- `60 seconds` grace window for host recovery

If the host reconnects within the grace window:

- clear the interruption timer
- restore host presence to online
- keep the room in its previous gameplay state

If the host does not reconnect in time:

- transition the room to `interrupted`
- store the prior gameplay state in memory for possible recovery
- broadcast the interrupted snapshot

### Participant experience during interruption

Participants should see:

- a calm message that the session is temporarily paused
- reassurance that their progress is preserved
- no new answer controls while interrupted

### Host recovery

When the host returns:

- verify session ownership as today
- restore host presence
- resume from the saved gameplay state when safe
- emit an operational recovery event

## Public entry protection

Apply lightweight rate limiting to PIN entry in the web layer.

Recommended first version:

- limit failed PIN-entry attempts per IP in a short rolling window
- return a generic retry-later message
- log:
  - source IP hash or anonymized identifier
  - attempted PIN
  - timestamp
  - rejection reason `pin_rate_limited`

Suggested MVP defaults:

- `10` failed attempts per `5 minutes` per IP

This is intentionally simple and should not add captcha or vendor dependencies in this phase.

## Answer validation and rejection

The realtime service should emit and log explicit rejection reasons.

Supported rejection reasons:

- `duplicate_answer`
- `question_closed`
- `participant_not_in_session`
- `session_interrupted`
- `invalid_payload`

Recommended behavior:

- do not persist rejected answers
- increment a room-level rejected-answer counter
- include the reason in structured logs
- optionally ack the client with the rejection reason for clearer UI messaging

## Snapshot and recovery

Every room snapshot sent to host or participant should include enough operational context to render a reliable UI after reconnect.

Minimum additions:

- room phase including `interrupted`
- host presence
- last critical event timestamp
- current question progress metrics
- rejected-answer count for the current room
- interruption reason when relevant

This supports:

- participant reconnect flows
- host reconnect flows
- interrupted-state rendering without extra fetches

## Host UI

Enhance the existing host session screen with an operational panel.

Recommended fields:

- host realtime connection status
- host presence status
- session status
- connected participants
- offline participants
- last event timestamp
- rejected answers in current room
- warning badges for:
  - host offline
  - session interrupted
  - unusual entry rejection volume

This should live in the existing host session page first, with logic that can later feed a broader operations page.

## Participant UI

When the room is interrupted:

- replace active answer controls with an interruption state
- preserve the rest of the live shell and branding
- message clearly that the host is reconnecting and progress is preserved

When the room recovers:

- return the participant to the current valid room phase
- do not create duplicate participants or duplicate answer opportunities

## Logging and observability

Structured logs should be standardized for critical operational events.

Recommended events:

- `host.disconnected`
- `host.reconnected`
- `session.interrupted`
- `session.resumed`
- `pin.entry_rate_limited`
- `answer.rejected`
- `answer.accepted`

Each log should include:

- `sessionId`
- `pin`
- `quizId` when available
- `participantId` when relevant
- `socketId` when relevant
- reason code where applicable
- timestamp

This improves both console diagnosis and future Sentry/dashboard integration.

## Error handling

### PIN entry

If rate limited:

- show a neutral message such as `Muitas tentativas. Tente novamente em instantes.`
- do not disclose whether a PIN was valid

### Interrupted session

If a session is interrupted:

- participants should not see broken controls
- host should see a recovery action or reconnection state

### Rejected answer

If the client receives a rejection reason:

- translate it to a clear but minimal message
- avoid exposing internal implementation detail

## Testing

### Automated

- unit tests for:
  - PIN rate-limit policy
  - answer rejection rules
  - host interruption transitions
- integration tests for:
  - host disconnect then reconnect within grace window
  - host disconnect beyond grace window leading to `interrupted`
  - duplicate-answer rejection

### Manual

- host disconnect during lobby
- host disconnect during an active question
- host reconnect before timeout
- participant blocked after repeated PIN failures
- participant sees interruption state and later resumes cleanly
- host operational panel updates as expected during all above cases

## Success Criteria

This phase is successful when:

- host disconnects no longer leave room state ambiguous
- participant UI handles host absence gracefully
- duplicate and invalid answers are explicitly rejected and observable
- abusive PIN retries are limited with low user friction
- the host session screen exposes enough operational context for real-world troubleshooting

## Implementation Notes

Recommended delivery order:

1. realtime operational state and host interruption handling
2. answer rejection semantics and structured logging
3. PIN rate limiting on public join flows
4. host operational panel and participant interruption UI

This keeps the riskiest backend guarantees ahead of interface polish.
