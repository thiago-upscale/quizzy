# Live Results And Ranking Design

## Objective

Complete the live gameplay loop with:

- per-question result reveal
- live leaderboard updates
- final session results

The goal is to move Quizzy from a functional live answer flow to a hostable corporate quiz experience with a clear rhythm between question, reveal, and next round.

## Scope

This design covers:

- `question_result` as a new live session state
- leaderboard updates during and after each question
- participant-facing round result and final session screens
- host-facing round result and final ranking panels
- realtime events and room snapshots needed to support reconnects

This design does not yet cover:

- media-rich answer reveal animations
- downloadable reports
- team mode
- automatic next-question progression

## Recommended Approach

Use a staged live state machine:

- `waiting`
- `countdown`
- `playing`
- `question_result`
- `finished`

This keeps the host in control of progression while giving participants a clear result surface between questions.

## User Flow

### Participant

1. Join session and wait in lobby
2. Countdown begins
3. Question opens
4. Participant submits an answer or times out
5. Session transitions to `question_result`
6. Participant sees:
   - whether they were correct
   - points earned in the round
   - correct option
   - updated ranking
7. Host advances to the next question
8. After the last round, participant sees final ranking and session closure

### Host

1. Start session countdown
2. Question opens
3. Watch submitted count and participant standings update
4. Close the round manually or let the timer expire
5. Review round result panel
6. Advance to next question
7. After the last question, view final ranking and end state

## Architecture

### Realtime service

The realtime service remains the source of truth for transient live state.

It will manage:

- active question lifecycle
- round closure
- per-round result snapshots
- live leaderboard snapshots
- final session snapshot

### Web app

The web app remains responsible for:

- host and participant rendering
- persistence of answers and session events
- internal endpoints used by the realtime service

## Realtime State Model

Extend room state with:

- `status`
- `currentQuestionIndex`
- `questionStartedAt`
- `questionClosedAt`
- `currentQuestionResult`
- `leaderboard`

### `currentQuestionResult`

Stores the frozen reveal payload for the current round:

- `questionId`
- `questionOrderIndex`
- `correctOptionIndex`
- `submittedCount`
- `correctCount`
- `leaderboard`

This snapshot must remain available until the next question begins so reconnecting clients can render the correct state.

## Realtime Events

### Existing

- `participant:list`
- `session:state`
- `session:countdown`
- `session:started`
- `session:question`
- `question:stats`
- `answer:ack`
- `session:finished`

### New

- `question:closed`
- `question:result`
- `leaderboard:update`
- `session:final`

## Payload Design

### `leaderboard:update`

```ts
{
  entries: Array<{
    participantId: string;
    nickname: string;
    avatar: string;
    score: number;
    totalTimeMs: number;
    rank: number;
  }>;
}
```

### `question:result`

```ts
{
  questionId: string;
  questionOrderIndex: number;
  correctOptionIndex: number;
  submittedCount: number;
  correctCount: number;
  leaderboard: LeaderboardEntry[];
}
```

### `session:final`

```ts
{
  leaderboard: LeaderboardEntry[];
  totalQuestions: number;
  status: "finished";
}
```

## Leaderboard Rules

Ranking order:

1. higher `score`
2. lower `totalTimeMs`
3. alphabetical `nickname`

This matches the current schema and keeps ties stable.

## UI Changes

### Participant UI

The live participant view should render four surfaces:

- lobby
- active question
- round result
- final result

#### Round result content

- correct or incorrect status
- points earned in the round
- correct answer reveal
- participant position
- top leaderboard slice
- waiting state for the next question

#### Final result content

- final rank
- final score
- leaderboard
- session closed message

### Host UI

The host panel should render:

- active question monitoring
- leaderboard during the question
- round result summary
- next-question control
- final ranking panel

#### Round result content

- correct option
- total responses
- total correct responses
- leaderboard
- action to advance

## Round Closure Rules

A round closes when either:

- the timer expires
- the host closes it manually

After closure:

- no more answers are accepted
- result snapshot is frozen
- leaderboard is emitted
- session enters `question_result`

## Reconnect Behavior

Reconnect behavior must follow room snapshot state:

- during `playing`, reconnecting participants see the active question if time remains
- during `question_result`, reconnecting participants see the frozen result snapshot
- during `finished`, reconnecting participants see the final ranking

## Persistence

No schema change is required for this iteration.

Persisted sources already available:

- `participants.score`
- `participants.totalTimeMs`
- `answers`
- `session_events`

Recommended additional session events:

- `session.question_closed`
- `session.question_result_revealed`
- `session.final_results_revealed`

## Error Handling

- answers submitted after round closure are rejected
- duplicate answers remain rejected
- round result must still render when zero participants answer
- final state must not skip the last round reveal

## Validation Plan

1. Local validation:
   - `pnpm format:check`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm build`
2. Simulated realtime test with multiple participants
3. Manual smoke test with host and at least two real participant devices

## Delivery Plan

### Phase 1

- realtime support for `question_result`
- leaderboard snapshots
- participant round result UI
- host round result UI

### Phase 2

- final session screen for participant
- final host leaderboard panel
- final session events and edge-case cleanup
