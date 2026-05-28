import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  answers,
  participants,
  questions,
  quizSessions,
  quizzes,
  quizVersions,
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
  isCorrect: boolean;
  pointsEarned: number;
  questionId: string;
  questionOrderIndex: number;
  timeSpentMs: number;
};

export type SessionReportLeaderboardEntry = {
  accuracyPercent: number;
  answeredCount: number;
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
};

export type SessionReportDetailedRow = {
  accuracyPercent: number;
  answeredCount: number;
  correctCount: number;
  email: string | null;
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

export type SessionReport = {
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

  const [participantRows, answerRows, currentQuestionRows] = await Promise.all([
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
        answer: answers.answer,
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
  ]);

  const questionDefinitions = getQuestionDefinitions({
    currentQuestions: currentQuestionRows,
    snapshotQuestions: toQuestionSnapshotList(session.questionsSnapshot),
  });

  const answersByParticipant = new Map<string, ReportAnswer[]>();
  const answersByQuestionOrder = new Map<number, ReportAnswer[]>();

  for (const row of answerRows) {
    const answerValue = row.answer as { index?: number } | null;
    const answerEntry: ReportAnswer = {
      answerIndex:
        typeof answerValue?.index === "number" ? answerValue.index : null,
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

  const detailedRows = leaderboard.map((entry) => {
    const participantAnswers =
      answersByParticipant.get(entry.participantId) ?? [];
    const byQuestionOrder = new Map(
      participantAnswers.map((answer) => [answer.questionOrderIndex, answer]),
    );

    return {
      ...entry,
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
    } satisfies SessionReportQuestionBreakdown;
  });

  const answersCount = answerRows.length;
  const totalCorrectAnswers = answerRows.filter((row) => row.isCorrect).length;

  return {
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
  const rows = report.leaderboard.map((entry) => ({
    accuracy_percent: entry.accuracyPercent,
    answered_count: entry.answeredCount,
    correct_count: entry.correctCount,
    email: entry.email,
    nickname: entry.nickname,
    position: entry.rank,
    score: entry.score,
    total_time_display: formatDuration(entry.totalTimeMs),
    total_time_ms: entry.totalTimeMs,
  }));

  return createCsvContent(rows);
}

export function createDetailedCsv(report: SessionReport) {
  const rows = report.detailedRows.map((entry) => {
    const baseRow: Record<string, string | number | boolean | null> = {
      accuracy_percent: entry.accuracyPercent,
      answered_count: entry.answeredCount,
      correct_count: entry.correctCount,
      email: entry.email,
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
