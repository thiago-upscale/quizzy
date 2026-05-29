import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { questions, quizSessions, quizzes, quizVersions } from "@/db/schema";

export type IndividualQuestion = {
  correctIndex: number;
  id: string | null;
  imageUrl: string | null;
  options: string[];
  orderIndex: number;
  pointsBase: number;
  prompt: string;
  timeLimitSeconds: number;
  type: "multiple_choice" | "true_false";
};

type SnapshotQuestion = {
  content?: {
    imageUrl?: string | null;
    options?: string[];
    question?: string;
  };
  correctAnswer?: { index?: number };
  timeLimitSeconds?: number;
  type?: string;
};

export function getIndividualParticipantCookieName(shareToken: string) {
  return `quizzy_individual_${shareToken}`;
}

export async function getIndividualSessionByShareToken(shareToken: string) {
  const [session] = await db
    .select({
      createdAt: quizSessions.createdAt,
      endsAt: quizSessions.endsAt,
      expiresAt: quizSessions.expiresAt,
      id: quizSessions.id,
      maxAttempts: quizSessions.maxAttempts,
      mode: quizSessions.mode,
      questionsSnapshot: quizVersions.questionsSnapshot,
      quizBranding: quizzes.branding,
      quizDescription: quizzes.description,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      shareToken: quizSessions.shareToken,
      requireParticipantEmail: quizSessions.requireParticipantEmail,
      startsAt: quizSessions.startsAt,
      status: quizSessions.status,
      versionBranding: quizVersions.branding,
      versionDescription: quizVersions.description,
      versionNumber: quizVersions.versionNumber,
      versionTitle: quizVersions.title,
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .innerJoin(quizVersions, eq(quizSessions.quizVersionId, quizVersions.id))
    .where(
      and(
        eq(quizSessions.shareToken, shareToken),
        eq(quizSessions.mode, "individual"),
      ),
    )
    .limit(1);

  return session ?? null;
}

export function isIndividualSessionExpired(params: {
  endsAt: Date | null;
  expiresAt: Date | null;
}) {
  const deadline = params.endsAt ?? params.expiresAt;

  if (!deadline) {
    return false;
  }

  return deadline.getTime() < Date.now();
}

export async function buildIndividualQuestionsForSession(params: {
  questionsSnapshot: unknown;
  quizId: string;
}) {
  const snapshot = Array.isArray(params.questionsSnapshot)
    ? (params.questionsSnapshot as SnapshotQuestion[])
    : [];

  const currentQuestions = await db
    .select({
      id: questions.id,
      orderIndex: questions.orderIndex,
      pointsBase: questions.pointsBase,
    })
    .from(questions)
    .where(eq(questions.quizId, params.quizId))
    .orderBy(asc(questions.orderIndex));

  const currentQuestionByOrder = new Map(
    currentQuestions.map((question) => [question.orderIndex, question]),
  );

  return snapshot.map((question, index) => {
    const currentQuestion = currentQuestionByOrder.get(index);

    return {
      correctIndex: question.correctAnswer?.index ?? 0,
      id: currentQuestion?.id ?? null,
      imageUrl:
        typeof question.content?.imageUrl === "string"
          ? question.content.imageUrl
          : null,
      options:
        question.type === "true_false"
          ? ["Verdadeiro", "Falso"]
          : (question.content?.options ?? []),
      orderIndex: index,
      pointsBase: currentQuestion?.pointsBase ?? 1000,
      prompt: question.content?.question?.trim() || `Pergunta ${index + 1}`,
      timeLimitSeconds: question.timeLimitSeconds ?? 20,
      type: question.type === "true_false" ? "true_false" : "multiple_choice",
    } satisfies IndividualQuestion;
  });
}
