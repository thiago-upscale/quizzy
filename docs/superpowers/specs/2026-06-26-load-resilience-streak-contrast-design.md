# Load, Resilience, Streak And Contrast Design

## Context

This package combines three related goals already identified in the project backlog:

1. Validate live-session load and resilience with 80 concurrent Socket.IO participants.
2. Surface streak and ranking microinteractions in the live player flow.
3. Strengthen branding-editor accessibility feedback with inline WCAG AA contrast guidance.

The current codebase already contains most of the structural pieces:

- `apps/web/scripts/load-test.mjs` simulates participants, submits answers, and tracks ACKs, RTT, disconnects, and reconnects.
- The live participant flow already exposes `currentStreak`, `leaderboardVersion`, `rankDeltaById`, `question_result`, and interrupted-session states.
- The branding editor already computes basic contrast warnings, but only for a narrow set of color pairs and without a stronger inline preview treatment.

The work should stay incremental and reuse these primitives instead of introducing a new architecture.

## Goals

### 1. Load And Resilience Validation

Run the existing load test against a real local live session with 80 concurrent clients and validate:

- join stability and sustained socket connectivity
- answer ACK throughput and RTT behavior
- participant reconnect behavior after a real realtime-server crash
- host recovery behavior after the realtime server is restarted manually from the CLI
- preservation of score, streak, ranking, and session continuity after recovery

### 2. Streak And Ranking Microinteractions

Improve the participant live experience during `question_result` and leaderboard updates by making the existing scoring mechanics visible:

- show a streak badge once the player reaches streak `>= 2`
- add a pulse emphasis for streak `>= 5`
- animate score changes in the player-facing result and standing UI
- keep staggered ranking motion for leaderboard rows and ensure it remains intentional
- continue showing ranking deltas such as `+2` and `-1`
- respect `prefers-reduced-motion`

### 3. Inline WCAG Contrast Guidance

Expand the branding editor feedback so creators can tell which selected color is causing accessibility issues and what a compatible fix looks like:

- compute WCAG AA contrast checks for relevant text/background pairs in the editor preview
- show an inline warning chip below the problematic color control
- include the measured ratio and a suggested replacement hex color that reaches `4.5:1`
- visually mark the affected preview text area without blocking save

## Non-Goals

- no persistence-model changes
- no server protocol redesign
- no save-blocking validation in the branding editor
- no visual redesign of the entire live player or branding tab beyond the scoped microinteractions
- no infrastructure automation requirement for restarting the realtime process; manual CLI restart is acceptable for this validation pass

## Approach Options

### Option A: Incremental Package On Existing Primitives

Run the current load test, extend it only if signal is missing, and implement T4/T5 directly in the existing live player and branding editor.

Pros:

- smallest code delta
- fastest path to usable validation
- aligns with current architecture

Cons:

- operational validation depends on a manual test run
- some resilience evidence remains observational instead of fully scripted

### Option B: Build A New Test Harness First

First extend the load-test and dev scripts to orchestrate realtime crash/restart automatically, then implement UI changes.

Pros:

- more reproducible resilience testing
- cleaner future regression path

Cons:

- larger scope
- delays product-facing improvements

### Option C: Ship UI First, Validate Realtime Later

Implement T4 and T5 before touching load/resilience.

Pros:

- immediate visible progress

Cons:

- risks polishing flows whose realtime behavior is not yet validated under failure

## Decision

Choose **Option A**.

This package benefits most from validating the realtime baseline first, then landing UI improvements against a known-good session flow. The codebase already exposes the right hooks, so the package can remain local, incremental, and low-risk.

## Detailed Design

### A. Load And Resilience Validation

#### Execution Flow

1. Start the local stack and create or reuse a real live session.
2. Run `apps/web/scripts/load-test.mjs` with `--players 80`.
3. Observe successful joins, answer submissions, ACK count, RTT, and steady-state disconnect behavior.
4. Force a real crash of the realtime server process while the session is active.
5. Restart the realtime server manually via CLI.
6. Verify participant reconnection and host/session recovery behavior.
7. Record results, failures, and any missing telemetry.

#### Success Criteria

- all 80 simulated participants attempt to join the session
- the majority of participants reconnect after the realtime crash once the process returns
- the host-facing and participant-facing session state recovers to a safe live state
- ranking, score, and streak data remain coherent after recovery
- no fatal corruption prevents the session from continuing or finalizing

#### Allowed Script Adjustments

If needed, the load-test script may be extended to improve visibility into:

- reconnect timing windows
- post-restart answer recovery
- session-final completion status
- clearer reporter behavior when the initial reporter socket disconnects

Any script change should remain a local test utility, not production logic.

### B. Streak And Ranking Microinteractions

#### Scope

Primary implementation target: `apps/web/src/app/live/[pin]/lobby/lobby-client.tsx`.

Supporting state is already provided by `useLiveParticipantSocket.ts`, including:

- `answerState.currentStreak`
- `leaderboard`
- `leaderboardVersion`
- `rankDeltaById`
- player standing and score data

#### Player Result Feedback

During `question_result`:

- if the participant has an active streak `>= 2`, show a visible streak badge such as `Sequencia xN!`
- if streak `>= 5`, add pulse animation unless reduced motion is requested
- if the participant answered correctly, emphasize the correct-answer card with a brief scale treatment
- animate the visible score value toward the latest score over roughly 400ms when motion is allowed

#### Ranking Motion

For the ranking list:

- keep staggered row entry from bottom to top
- preserve per-row delta chips like `+2` and `-1`
- ensure animation timing stays within a subtle range, around `50-100ms` between rows
- avoid motion overload when the session updates repeatedly

#### Reduced Motion

When `prefers-reduced-motion` is true:

- disable pulse
- avoid incremental counter animation
- render ranking rows without stagger transitions

### C. Inline Contrast Guidance

#### Scope

Primary implementation targets:

- `apps/web/src/app/dashboard/quizzes/[quizId]/color-utils.ts`
- `apps/web/src/app/dashboard/quizzes/[quizId]/branding-tab.tsx`

#### Contrast Checks

Expand contrast evaluation beyond the current minimal checks so the editor warns on the meaningful preview combinations, including combinations equivalent to:

- white text on primary surfaces
- white text on secondary surfaces
- dark/navy text on accent chips and buttons
- any other text/background pair visibly represented in the preview where the user-selected color controls readability

#### Warning UI

For each affected picker:

- show an amber inline warning chip below the control
- include the exact ratio in `X:1` form
- include a suggested replacement hex that would satisfy `4.5:1`
- keep the message specific to the affected preview usage

#### Preview Affordance

When a preview text/background pairing is failing:

- add a non-blocking visual indicator on the preview region
- make it obvious which text is currently hard to read
- do not prevent save or input changes

## Testing Strategy

### Operational Validation

- run the local stack
- execute the live load test with 80 participants
- force realtime crash and manual restart
- verify reconnection behavior in logs and in the live UI

### Code Validation

- run targeted type checking after UI changes
- run build if feasible within the local environment
- manually inspect the player result state, leaderboard motion, and branding warnings

## Risks And Mitigations

### Risk: Realtime recovery exposes a server-side state bug

Mitigation:

- treat the load/resilience pass as the first step
- capture precise failure symptoms before changing UI

### Risk: Repeated leaderboard animation becomes noisy

Mitigation:

- keep timing short and stagger subtle
- disable motion when the user requests reduced motion

### Risk: Contrast suggestion is technically valid but visually off-brand

Mitigation:

- suggestions are advisory only
- save remains unblocked

## Implementation Order

1. Validate load and resilience with the current stack.
2. Patch the load-test utility only if missing telemetry blocks validation.
3. Implement T4 in the live participant flow.
4. Implement T5 in the branding editor.
5. Run type/build verification and summarize outcomes.
