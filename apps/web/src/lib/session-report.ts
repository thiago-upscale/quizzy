import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  answers,
  attempts,
  participants,
  questions,
  quizSessions,
  quizzes,
  quizVersions,
  sessionEvents,
} from "@/db/schema";

type SnapshotQuestion = {
  content?: {
    options?: string[];
    question?: string;
  };
  correctAnswer?: {
    index?: number;
  };
  timeLimitSeconds?: number;
  type?: string;
};

type ReportAnswer = {
  answerIndex: number | null;
  attemptId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  questionId: string;
  questionOrderIndex: number;
  timeSpentMs: number;
};

export type SessionReportLeaderboardEntry = {
  accuracyPercent: number;
  answeredCount: number;
  attemptsCount: number;
  correctCount: number;
  email: string | null;
  nickname: string;
  participantId: string;
  rank: number;
  score: number;
  totalTimeMs: number;
};

export type SessionReportQuestionBreakdown = {
  accuracyPercent: number;
  averageTimeMs: number | null;
  correctCount: number;
  orderIndex: number;
  prompt: string;
  responsesCount: number;
  skipped: boolean;
};

export type SessionReportDetailedRow = {
  accuracyPercent: number;
  attemptId: string | null;
  attemptNumber: number | null;
  answeredCount: number;
  correctCount: number;
  email: string | null;
  isBestAttempt: boolean;
  nickname: string;
  participantId: string;
  perQuestion: Array<{
    answerIndex: number | null;
    isCorrect: boolean;
    orderIndex: number;
    pointsEarned: number;
    prompt: string;
    timeSpentMs: number | null;
  }>;
  rank: number;
  score: number;
  totalTimeMs: number;
};

export type SessionReportAttemptRow = {
  accuracyPercent: number;
  answeredCount: number;
  attemptId: string;
  attemptNumber: number;
  correctCount: number;
  email: string | null;
  finishedAt: Date | null;
  isBestAttempt: boolean;
  nickname: string;
  participantId: string;
  score: number;
  totalTimeMs: number;
};

export type SessionReport = {
  attemptRows: SessionReportAttemptRow[];
  detailedRows: SessionReportDetailedRow[];
  leaderboard: SessionReportLeaderboardEntry[];
  questionBreakdown: SessionReportQuestionBreakdown[];
  session: {
    id: string;
    mode: string;
    pin: string | null;
    quizTitle: string;
    shareToken: string | null;
    status: string;
    versionNumber: number;
  };
  summary: {
    accuracyPercent: number;
    answersCount: number;
    averageScore: number;
    averageTimePerAnswerMs: number | null;
    hardestQuestion:
      | {
          accuracyPercent: number;
          orderIndex: number;
          prompt: string;
          responsesCount: number;
        }
      | null;
    participantsCount: number;
  };
};

type AuthorizedSession = {
  id: string;
  mode: string;
  pin: string | null;
  quizId: string;
  questionsSnapshot: unknown;
  quizTitle: string;
  shareToken: string | null;
  status: string;
  versionNumber: number;
};

function toQuestionSnapshotList(value: unknown) {
  return Array.isArray(value) ? (value as SnapshotQuestion[]) : [];
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function safePercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return roundToTwo((numerator / denominator) * 100);
}

function formatDuration(totalTimeMs: number) {
  const totalSeconds = Math.round(totalTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function getQuestionDefinitions(params: {
  currentQuestions: Array<{
    id: string;
    orderIndex: number;
  }>;
  snapshotQuestions: SnapshotQuestion[];
}) {
  const { currentQuestions, snapshotQuestions } = params;

  const byOrderIndex = new Map(
    currentQuestions.map((question) => [question.orderIndex, question.id]),
  );

  return snapshotQuestions.map((question, index) => ({
    correctOptionIndex:
      typeof question.correctAnswer?.index === "number"
        ? question.correctAnswer.index
        : null,
    orderIndex: index,
    options: Array.isArray(question.content?.options)
      ? question.content.options
      : [],
    prompt: question.content?.question?.trim() || `Pergunta ${index + 1}`,
    questionId: byOrderIndex.get(index) ?? null,
  }));
}

export async function getAuthorizedSessionMetadata(params: {
  organizationId: string;
  sessionId: string;
}) {
  const [session] = await db
    .select({
      id: quizSessions.id,
      mode: quizSessions.mode,
      pin: quizSessions.pin,
      quizId: quizSessions.quizId,
      questionsSnapshot: quizVersions.questionsSnapshot,
      quizTitle: quizzes.title,
      shareToken: quizSessions.shareToken,
      status: quizSessions.status,
      versionNumber: quizVersions.versionNumber,
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .innerJoin(quizVersions, eq(quizSessions.quizVersionId, quizVersions.id))
    .where(
      and(
        eq(quizSessions.id, params.sessionId),
        eq(quizzes.organizationId, params.organizationId),
      ),
    )
    .limit(1);

  return (session ?? null) as AuthorizedSession | null;
}

export async function getSessionReport(params: {
  organizationId: string;
  sessionId: string;
}) {
  const session = await getAuthorizedSessionMetadata(params);

  if (!session) {
    return null;
  }

  const [
    participantRows,
    attemptRows,
    answerRows,
    currentQuestionRows,
    skippedQuestionEventRows,
  ] =
    await Promise.all([
      db
        .select({
          email: participants.email,
          id: participants.id,
          nickname: participants.nickname,
          score: participants.score,
          totalTimeMs: participants.totalTimeMs,
        })
        .from(participants)
        .where(eq(participants.sessionId, session.id)),
      db
        .select({
          attemptNumber: attempts.attemptNumber,
          finishedAt: attempts.finishedAt,
          id: attempts.id,
          participantId: attempts.participantId,
          score: attempts.score,
          status: attempts.status,
          totalTimeMs: attempts.totalTimeMs,
        })
        .from(attempts)
        .where(eq(attempts.sessionId, session.id))
        .orderBy(asc(attempts.participantId), asc(attempts.attemptNumber)),
      db
        .select({
          answer: answers.answer,
          attemptId: answers.attemptId,
          isCorrect: answers.isCorrect,
          participantId: answers.participantId,
          pointsEarned: answers.pointsEarned,
          questionId: answers.questionId,
          questionOrderIndex: questions.orderIndex,
          timeSpentMs: answers.timeSpentMs,
        })
        .from(answers)
        .innerJoin(questions, eq(answers.questionId, questions.id))
        .where(eq(answers.sessionId, session.id))
        .orderBy(asc(questions.orderIndex), asc(answers.createdAt)),
      db
        .select({
          id: questions.id,
          orderIndex: questions.orderIndex,
        })
        .from(questions)
        .where(eq(questions.quizId, session.quizId))
        .orderBy(asc(questions.orderIndex)),
      db
        .select({
          payload: sessionEvents.payload,
        })
        .from(sessionEvents)
        .where(
          and(
            eq(sessionEvents.sessionId, session.id),
            eq(sessionEvents.eventType, "session.question_skipped"),
          ),
        ),
    ]);

  const questionDefinitions = getQuestionDefinitions({
    currentQuestions: currentQuestionRows,
    snapshotQuestions: toQuestionSnapshotList(session.questionsSnapshot),
  });

  const answersByParticipant = new Map<string, ReportAnswer[]>();
  const answersByAttempt = new Map<string, ReportAnswer[]>();
  const answersByQuestionOrder = new Map<number, ReportAnswer[]>();
  const skippedQuestionIndexes = new Set(
    skippedQuestionEventRows
      .map((event) => {
        const payload = event.payload as { questionIndex?: unknown } | null;
        return typeof payload?.questionIndex === "number"
          ? payload.questionIndex
          : null;
      })
      .filter((index): index is number => index !== null),
  );

  for (const row of answerRows) {
    const answerValue = row.answer as { index?: number } | null;
    const answerEntry: ReportAnswer = {
      answerIndex:
        typeof answerValue?.index === "number" ? answerValue.index : null,
      attemptId: row.attemptId,
      isCorrect: row.isCorrect,
      pointsEarned: row.pointsEarned,
      questionId: row.questionId,
      questionOrderIndex: row.questionOrderIndex,
      timeSpentMs: row.timeSpentMs,
    };

    const participantAnswers =
      answersByParticipant.get(row.participantId) ?? [];
    participantAnswers.push(answerEntry);
    answersByParticipant.set(row.participantId, participantAnswers);

    const questionAnswers =
      answersByQuestionOrder.get(row.questionOrderIndex) ?? [];
    questionAnswers.push(answerEntry);
    answersByQuestionOrder.set(row.questionOrderIndex, questionAnswers);

    if (row.attemptId) {
      const currentAttemptAnswers = answersByAttempt.get(row.attemptId) ?? [];
      currentAttemptAnswers.push(answerEntry);
      answersByAttempt.set(row.attemptId, currentAttemptAnswers);
    }
  }

  const attemptsByParticipant = new Map<string, typeof attemptRows>();

  for (const attempt of attemptRows) {
    const participantAttempts =
      attemptsByParticipant.get(attempt.participantId) ?? [];
    participantAttempts.push(attempt);
    attemptsByParticipant.set(attempt.participantId, participantAttempts);
  }

  const leaderboard = participantRows
    .map((participant) => {
      const participantAnswers = answersByParticipant.get(participant.id) ?? [];
      const answeredCount = participantAnswers.length;
      const correctCount = participantAnswers.filter(
        (answer) => answer.isCorrect,
      ).length;

      return {
        accuracyPercent: safePercent(correctCount, answeredCount),
        answeredCount,
        attemptsCount: attemptsByParticipant.get(participant.id)?.length ?? 0,
        correctCount,
        email: participant.email,
        nickname: participant.nickname,
        participantId: participant.id,
        rank: 0,
        score: participant.score,
        totalTimeMs: participant.totalTimeMs,
      } satisfies SessionReportLeaderboardEntry;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.totalTimeMs !== right.totalTimeMs) {
        return left.totalTimeMs - right.totalTimeMs;
      }

      return left.nickname.localeCompare(right.nickname);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  const bestAttemptIdByParticipant = new Map<string, string>();

  for (const participant of participantRows) {
    const participantAttempts = attemptsByParticipant.get(participant.id) ?? [];
    const bestAttempt = [...participantAttempts].sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.totalTimeMs !== right.totalTimeMs) {
        return left.totalTimeMs - right.totalTimeMs;
      }

      return left.attemptNumber - right.attemptNumber;
    })[0];

    if (bestAttempt) {
      bestAttemptIdByParticipant.set(participant.id, bestAttempt.id);
    }
  }

  const participantDetailedRows = leaderboard.map((entry) => {
    const participantAnswers =
      answersByParticipant.get(entry.participantId) ?? [];
    const byQuestionOrder = new Map(
      participantAnswers.map((answer) => [answer.questionOrderIndex, answer]),
    );

    return {
      ...entry,
      attemptId: null,
      attemptNumber: null,
      isBestAttempt: true,
      perQuestion: questionDefinitions.map((question) => {
        const answer = byQuestionOrder.get(question.orderIndex);

        return {
          answerIndex: answer?.answerIndex ?? null,
          isCorrect: answer?.isCorrect ?? false,
          orderIndex: question.orderIndex,
          pointsEarned: answer?.pointsEarned ?? 0,
          prompt: question.prompt,
          timeSpentMs: answer?.timeSpentMs ?? null,
        };
      }),
    } satisfies SessionReportDetailedRow;
  });

  const questionBreakdown = questionDefinitions.map((question) => {
    const questionAnswers =
      answersByQuestionOrder.get(question.orderIndex) ?? [];
    const correctCount = questionAnswers.filter(
      (answer) => answer.isCorrect,
    ).length;
    const averageTimeMs =
      questionAnswers.length > 0
        ? Math.round(
            questionAnswers.reduce(
              (total, answer) => total + answer.timeSpentMs,
              0,
            ) / questionAnswers.length,
          )
        : null;

    return {
      accuracyPercent: safePercent(correctCount, questionAnswers.length),
      averageTimeMs,
      correctCount,
      orderIndex: question.orderIndex,
      prompt: question.prompt,
      responsesCount: questionAnswers.length,
      skipped: skippedQuestionIndexes.has(question.orderIndex),
    } satisfies SessionReportQuestionBreakdown;
  });

  const individualAttemptRows =
    session.mode === "individual"
      ? attemptRows
          .map((attempt) => {
            const participant = participantRows.find(
              (row) => row.id === attempt.participantId,
            );

            if (!participant) {
              return null;
            }

            const currentAttemptAnswers =
              answersByAttempt.get(attempt.id) ?? [];
            const answeredCount = currentAttemptAnswers.length;
            const correctCount = currentAttemptAnswers.filter(
              (answer) => answer.isCorrect,
            ).length;
            const byQuestionOrder = new Map(
              currentAttemptAnswers.map((answer) => [
                answer.questionOrderIndex,
                answer,
              ]),
            );

            return {
              accuracyPercent: safePercent(correctCount, answeredCount),
              answeredCount,
              attemptId: attempt.id,
              attemptNumber: attempt.attemptNumber,
              correctCount,
              email: participant.email,
              finishedAt: attempt.finishedAt,
              isBestAttempt:
                bestAttemptIdByParticipant.get(participant.id) === attempt.id,
              nickname: participant.nickname,
              perQuestion: questionDefinitions.map((question) => {
                const answer = byQuestionOrder.get(question.orderIndex);

                return {
                  answerIndex: answer?.answerIndex ?? null,
                  isCorrect: answer?.isCorrect ?? false,
                  orderIndex: question.orderIndex,
                  pointsEarned: answer?.pointsEarned ?? 0,
                  prompt: question.prompt,
                  timeSpentMs: answer?.timeSpentMs ?? null,
                };
              }),
              participantId: participant.id,
              rank:
                leaderboard.find(
                  (leaderboardEntry) =>
                    leaderboardEntry.participantId === participant.id,
                )?.rank ?? 0,
              score: attempt.score,
              totalTimeMs: attempt.totalTimeMs,
            } satisfies SessionReportAttemptRow & SessionReportDetailedRow;
          })
          .filter(
            (row): row is SessionReportAttemptRow & SessionReportDetailedRow =>
              Boolean(row),
          )
      : [];

  const detailedRows =
    session.mode === "individual"
      ? individualAttemptRows
      : participantDetailedRows;

  const answersCount = answerRows.length;
  const totalCorrectAnswers = answerRows.filter((row) => row.isCorrect).length;
  const hardestQuestion =
    questionBreakdown.some((question) => !question.skipped)
      ? questionBreakdown
          .filter((question) => !question.skipped)
          .sort((left, right) => {
          if (left.accuracyPercent !== right.accuracyPercent) {
            return left.accuracyPercent - right.accuracyPercent;
          }

          if (left.responsesCount !== right.responsesCount) {
            return right.responsesCount - left.responsesCount;
          }

          return left.orderIndex - right.orderIndex;
          })[0] ?? null
      : null;

  return {
    attemptRows: individualAttemptRows,
    detailedRows,
    leaderboard,
    questionBreakdown,
    session: {
      id: session.id,
      mode: session.mode,
      pin: session.pin,
      quizTitle: session.quizTitle,
      shareToken: session.shareToken,
      status: session.status,
      versionNumber: session.versionNumber,
    },
    summary: {
      accuracyPercent: safePercent(totalCorrectAnswers, answersCount),
      answersCount,
      averageScore:
        participantRows.length > 0
          ? roundToTwo(
              participantRows.reduce(
                (total, participant) => total + participant.score,
                0,
              ) / participantRows.length,
            )
          : 0,
      averageTimePerAnswerMs:
        answersCount > 0
          ? Math.round(
              answerRows.reduce((total, answer) => total + answer.timeSpentMs, 0) /
                answersCount,
            )
          : null,
      hardestQuestion: hardestQuestion
        ? {
            accuracyPercent: hardestQuestion.accuracyPercent,
            orderIndex: hardestQuestion.orderIndex,
            prompt: hardestQuestion.prompt,
            responsesCount: hardestQuestion.responsesCount,
          }
        : null,
      participantsCount: participantRows.length,
    },
  } satisfies SessionReport;
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const rawValue = String(value);

  if (/[",\n\r]/.test(rawValue)) {
    return `"${rawValue.replaceAll('"', '""')}"`;
  }

  return rawValue;
}

function createCsvContent(
  rows: Array<Record<string, string | number | boolean | null>>,
) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(","),
    ),
  ];

  return lines.join("\n");
}

export function createSummaryCsv(report: SessionReport) {
  const skippedQuestions = report.questionBreakdown
    .filter((question) => question.skipped)
    .map((question) => `Q${question.orderIndex + 1}`)
    .join(";");
  const rows = report.leaderboard.map((entry) => ({
    accuracy_percent: entry.accuracyPercent,
    answered_count: entry.answeredCount,
    attempts_count: entry.attemptsCount,
    correct_count: entry.correctCount,
    email: entry.email,
    nickname: entry.nickname,
    position: entry.rank,
    score: entry.score,
    skipped_questions: skippedQuestions,
    skipped_questions_count: report.questionBreakdown.filter(
      (question) => question.skipped,
    ).length,
    total_time_display: formatDuration(entry.totalTimeMs),
    total_time_ms: entry.totalTimeMs,
  }));

  return createCsvContent(rows);
}

export function createDetailedCsv(report: SessionReport) {
  const sourceRows =
    report.session.mode === "individual" && report.attemptRows.length > 0
      ? report.attemptRows.map((attemptRow) => {
          const detailedRow = report.detailedRows.find(
            (entry) =>
              entry.participantId === attemptRow.participantId &&
              entry.attemptId === attemptRow.attemptId,
          );

          return {
            ...attemptRow,
            perQuestion: detailedRow?.perQuestion ?? [],
            rank: detailedRow?.rank ?? 0,
          };
        })
      : report.detailedRows;

  const rows = sourceRows.map((entry) => {
    const baseRow: Record<string, string | number | boolean | null> = {
      accuracy_percent: entry.accuracyPercent,
      attempt_id: "attemptId" in entry ? entry.attemptId : null,
      attempt_number: "attemptNumber" in entry ? entry.attemptNumber : null,
      answered_count: entry.answeredCount,
      correct_count: entry.correctCount,
      email: entry.email,
      is_best_attempt: "isBestAttempt" in entry ? entry.isBestAttempt : true,
      nickname: entry.nickname,
      position: entry.rank,
      score: entry.score,
      total_time_display: formatDuration(entry.totalTimeMs),
      total_time_ms: entry.totalTimeMs,
    };

    for (const question of entry.perQuestion) {
      const prefix = `q${question.orderIndex + 1}`;
      baseRow[`${prefix}_answer_index`] = question.answerIndex;
      baseRow[`${prefix}_is_correct`] =
        question.answerIndex === null ? null : question.isCorrect;
      baseRow[`${prefix}_points`] = question.pointsEarned;
      baseRow[`${prefix}_prompt`] = question.prompt;
      baseRow[`${prefix}_skipped`] =
        report.questionBreakdown.find(
          (breakdown) => breakdown.orderIndex === question.orderIndex,
        )?.skipped ?? false;
      baseRow[`${prefix}_time_ms`] = question.timeSpentMs;
    }

    return baseRow;
  });

  return createCsvContent(rows);
}

export function getSessionReportFilename(params: {
  extension: "csv";
  reportType: "detailed" | "summary";
  session: SessionReport["session"];
}) {
  const sessionReference = params.session.pin ?? params.session.id;

  return `quizzy-session-${sessionReference}-${params.reportType}.${params.extension}`;
}

export function formatReportDuration(totalTimeMs: number | null) {
  if (totalTimeMs === null) {
    return "Nao respondida";
  }

  return formatDuration(totalTimeMs);
}
