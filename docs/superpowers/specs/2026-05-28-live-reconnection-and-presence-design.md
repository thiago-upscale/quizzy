# Live Reconnection And Presence Design

## Objective

Improve the live session experience so temporary connection loss does not break gameplay or create participant duplication.

This iteration must provide:

- stable participant identity across reconnects
- host visibility into online and offline participants
- a participant-facing return confirmation flow
- state recovery into the current live step

## Scope

This design covers:

- participant reconnect behavior for live sessions
- presence modeling in realtime
- host UI presence status
- participant confirmation before resuming a session

This iteration does not cover:

- browser push notifications
- explicit session kick/ban controls
- automatic multi-device merge logic
- background sync for offline answer buffering

## Recommended Approach

Use the existing `participantToken` as the stable session identity and separate identity from presence.

Recommended behavior:

- participant identity remains stable in the room and database
- websocket connection state toggles `online/offline`
- reconnecting users confirm that they want to resume
- after confirmation, they return to the exact current phase of the session

## User Flow

### Participant reconnect

1. Participant previously joined a live session and still has a valid session cookie
2. They return to `/live/[pin]`
3. If the session is still accessible and the participant token is valid, show a short resume screen
4. The screen explains that their progress was preserved
5. The participant taps `Retomar agora`
6. They enter `/live/[pin]/lobby`
7. The realtime layer restores the current session state:
   - waiting
   - countdown
   - active question
   - round result
   - final result

### Host visibility

The host should continue seeing all joined participants in the operational list, including those who are temporarily disconnected.

Each participant should expose a presence state:

- `online`
- `offline`

Offline participants remain in:

- the ranking
- report data
- the participant roster

They are removed only from the connected-count metric.

## Architecture

### Identity vs presence

The participant record remains the durable identity.

Realtime room state adds transient presence:

- `connected: boolean`
- `socketId: string | null`

This lets Quizzy preserve score and historical participation while still showing accurate operational presence.

### Web app

The web app is responsible for:

- detecting valid session cookies
- deciding whether to show join or resume UI
- rendering the resume confirmation page

### Realtime service

The realtime service is responsible for:

- marking participants online/offline
- restoring room snapshots
- resending current-session context to reconnecting sockets

## Presence model

Participant data in room state should include:

- stable identity fields
- score
- total time
- `connected`
- `socketId`

The room should no longer treat disconnect as removal.

Instead:

- on disconnect, mark the participant offline
- on reconnect with the same token, update the existing room participant

## Realtime behavior

### On participant join

If `participantToken` already exists in the room:

- reuse the existing participant entry
- update `connected = true`
- replace the `socketId`

If the participant is new:

- create the entry normally

### On disconnect

When a participant socket disconnects:

- keep the participant in room state
- set `connected = false`
- clear the `socketId`
- broadcast updated presence to the room

### On reconnect during an active question

The reconnecting participant should receive the current state snapshot.

If they had already answered the current question:

- restore their submitted state
- prevent duplicate answering
- keep the same visual confirmation as before disconnect

If they had not answered and time remains:

- allow answering with the real remaining time

If the round already closed:

- show the current round result

If the session already finished:

- show final ranking

## Resume confirmation flow

When a participant revisits `/live/[pin]` with a valid cookie and still-accessible session:

- do not redirect immediately
- render a compact resume screen instead

Recommended content:

- title: `Voce voltou para a sessao`
- participant nickname
- current room phase
- reassurance that progress was preserved
- primary button: `Retomar agora`
- secondary link: `Voltar ao inicio`

The confirmation is intentionally lightweight and should not feel like a separate workflow.

## Access rules

The resume screen should appear only when:

- the session exists
- the participant token maps to a real participant in that session
- the session is in a resumable status

If those conditions fail:

- fall back to the normal join page
- or show an unavailable-session message when appropriate

## Host UI

The host participant list should show:

- nickname
- score
- presence badge

Recommended badge labels:

- `online`
- `offline`

The connected-count metric should use only currently connected participants.

The leaderboard should continue to include everyone regardless of presence.

## Payload changes

### `participant:list`

Add:

- `connectedCount`
- participant presence field

Recommended participant payload shape:

```ts
{
  participants: Array<{
    id: string;
    nickname: string;
    avatar: string;
    score: number;
    totalTimeMs: number;
    presenceStatus: "online" | "offline";
  }>;
  connectedCount: number;
}
```

### Participant reconnect restoration

On reconnect, the socket should also receive enough direct context to rebuild its own submitted state during an active question.

This can be done by re-emitting:

- current question snapshot
- `answer:ack` equivalent to the reconnecting socket when applicable

## Error handling

If a reconnecting participant no longer has a valid session:

- do not silently fail
- show a clear message
- offer navigation back to `/join`

If the room state is temporarily empty but the database identity is still valid:

- allow the participant to rejoin and repopulate the room entry

## Testing plan

### Functional scenarios

1. Disconnect in lobby and reconnect
2. Disconnect during countdown and reconnect
3. Disconnect during an active question before answering and reconnect
4. Disconnect after answering and reconnect
5. Disconnect during `question_result` and reconnect
6. Disconnect after final state and reconnect
7. Host sees online/offline transitions correctly
8. Connected-count excludes offline users

### Validation

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- simulated reconnect smoke test against deployed realtime

## Delivery plan

### Phase 1

- presence-aware room payloads
- host UI status badges
- connected-count correction

### Phase 2

- participant resume confirmation screen
- reconnect restoration into current state
- resend answered-state on reconnect

## Recommendation

Deliver presence robustness first, then the participant-facing resume confirmation on top of it.

This keeps the system honest operationally before adding the UX polish that depends on it.
