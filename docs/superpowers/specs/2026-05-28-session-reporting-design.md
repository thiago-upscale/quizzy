# Session Reporting Design

## Objective

Add a first reporting layer for completed quiz sessions inside the existing session detail flow.

The MVP report must provide:

- final participant ranking
- per-question accuracy breakdown
- summary session metrics
- two CSV exports:
  - summary export
  - detailed export

## Scope

This design covers reporting for a single completed session at:

- `/dashboard/sessions/[sessionId]`

This iteration includes:

- a dedicated reporting section within the session page
- server-side aggregation from persisted session data
- downloadable CSV routes for summary and detailed data

This iteration does not include:

- charts or visual analytics
- organization-wide reporting
- historical report index pages
- PDF export
- participant-facing report views

## Recommended Approach

Use server-side aggregation in the web app, built from persisted tables:

- `quiz_sessions`
- `participants`
- `answers`
- `questions`
- `quiz_versions`

This keeps the report deterministic, version-aligned, and independent from transient realtime state.

## User Experience

### Report placement

The report should live as a dedicated section inside the session detail page, below the live operational area.

Recommended layout:

1. `Resumo da sessao`
2. `Ranking final`
3. `Desempenho por pergunta`
4. `Exportacoes`

### Visibility rules

- When session status is `finished`, show the full report.
- Before the session ends, show a compact placeholder informing the host that the report will become available after closure.

This keeps the page organized while preserving future expansion room.

## Data sources

### Ranking and participant metrics

Source:

- `participants`
- `answers`

Used for:

- nickname
- email
- final score
- total time
- answered count
- correct count
- accuracy

### Question breakdown

Source:

- `answers`
- `questions`
- `quiz_versions.questions_snapshot`

The question text and option labels should come from the published version used by the session, not from the editable current quiz.

This preserves report integrity if the quiz is edited after the session ends.

## Aggregation contract

Introduce a server-side report builder:

- `getSessionReport(sessionId)`

Recommended return shape:

```ts
type SessionReport = {
  summary: {
    participantsCount: number;
    answersCount: number;
    averageScore: number;
    accuracyPercent: number;
  };
  leaderboard: Array<{
    rank: number;
    participantId: string;
    nickname: string;
    email: string | null;
    score: number;
    totalTimeMs: number;
    answeredCount: number;
    correctCount: number;
    accuracyPercent: number;
  }>;
  questionBreakdown: Array<{
    orderIndex: number;
    prompt: string;
    responsesCount: number;
    correctCount: number;
    accuracyPercent: number;
    averageTimeMs: number | null;
  }>;
  detailedRows: Array<{
    participantId: string;
    nickname: string;
    email: string | null;
    score: number;
    totalTimeMs: number;
    perQuestion: Array<{
      orderIndex: number;
      prompt: string;
      answerIndex: number | null;
      isCorrect: boolean;
      pointsEarned: number;
      timeSpentMs: number | null;
    }>;
  }>;
};
```

## Ranking rules

Final ordering:

1. higher `score`
2. lower `totalTimeMs`
3. alphabetical `nickname`

This matches the live ranking behavior and avoids mismatch between gameplay and report.

## Report UI

### Summary block

Fields:

- total participants
- total answers recorded
- average score
- overall accuracy rate

This is meant to answer “how the session went” in a few seconds.

### Final leaderboard

Columns:

- position
- nickname
- email
- score
- total time
- answered count
- correct count
- accuracy

The leaderboard should be dense and table-oriented, not card-based.

### Question breakdown

Columns:

- question number
- question prompt
- responses count
- correct count
- accuracy percent
- average response time

This is the fastest view for spotting which questions were easy, hard, or skipped.

### Export block

Actions:

- `Baixar CSV resumo`
- `Baixar CSV detalhado`

## CSV exports

### Summary CSV

Columns:

- `position`
- `nickname`
- `email`
- `score`
- `total_time_ms`
- `total_time_display`
- `answered_count`
- `correct_count`
- `accuracy_percent`

### Detailed CSV

Participant-level columns:

- `position`
- `nickname`
- `email`
- `score`
- `total_time_ms`

Per-question dynamic columns:

- `q1_prompt`
- `q1_answer_index`
- `q1_is_correct`
- `q1_points`
- `q1_time_ms`

Repeat for every question in the session version.

## Export delivery

Recommended routes:

- `/dashboard/sessions/[sessionId]/report/summary.csv`
- `/dashboard/sessions/[sessionId]/report/detailed.csv`

These routes should:

- require authenticated access
- verify organization ownership of the session
- respond with `text/csv`
- generate content on demand

## CSV formatting rules

The exporter must:

- escape commas
- escape quotes
- preserve line breaks safely
- emit UTF-8 text
- allow empty fields for missing email or missing answers

This is important for spreadsheet compatibility and predictable downstream use.

## Edge cases

The report must still render correctly when:

- the session has zero participants
- participants have no email
- some questions received zero answers
- a participant joined but never answered
- question text contains punctuation or commas

Expected behavior:

- show empty but valid tables
- show `0%` accuracy where applicable
- export CSVs with blank cells instead of synthetic placeholders

## Technical design

### Server-side aggregation layer

Add a focused reporting utility module in the web app, responsible for:

- loading session metadata
- resolving published version question text
- grouping answers by participant and by question
- calculating derived metrics
- producing exportable row data

This should stay separate from the live runtime logic in `lib/live.ts`.

Recommended file:

- `apps/web/src/lib/session-report.ts`

### Session detail integration

Update the session detail page so it:

- loads report data when the session exists
- renders the reporting section
- shows either:
  - report placeholder
  - full report

### Export route implementation

Each route should:

- reuse the shared report builder
- serialize either summary or detailed rows
- set `Content-Disposition` with a meaningful filename

Suggested filenames:

- `quizzy-session-<pin-or-id>-summary.csv`
- `quizzy-session-<pin-or-id>-detailed.csv`

## Testing plan

### Local validation

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

### Functional validation

Use a completed live session with multiple participants and verify:

1. final leaderboard matches live session outcome
2. question accuracy matches persisted answers
3. summary metrics are numerically consistent
4. both CSV downloads open correctly in a spreadsheet

## Delivery plan

### Phase 1

- shared `getSessionReport(sessionId)` aggregator
- report section in session detail page
- final leaderboard table
- per-question breakdown table

### Phase 2

- summary CSV route
- detailed CSV route
- filename and CSV formatting polish

## Recommendation

Build the report directly into the existing session view first, with dense readable tables and export actions.

This gives Quizzy a meaningful corporate outcome:

- the host can run the session
- review the results immediately
- export the data without leaving context
