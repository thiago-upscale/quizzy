import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  participants,
  questions,
  quizSessions,
  quizzes,
  quizVersions,
} from "@/db/schema";

export type LiveBranding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
};

export type RuntimeLiveQuestion = {
  correctIndex: number;
  id: string;
  options: string[];
  orderIndex: number;
  persistable: boolean;
  pointsBase: number;
  prompt: string;
  timeLimitSeconds: number;
  type: "multiple_choice" | "true_false";
};

export const defaultLiveBranding: LiveBranding = {
  primaryColor: "#0f766e",
  secondaryColor: "#10233f",
  accentColor: "#f59e0b",
  fontFamily: "Manrope",
};

export function getLiveParticipantCookieName(pin: string) {
  return `quizzy_live_${pin}`;
}

export function normalizeLiveBranding(
  branding: Partial<LiveBranding> | null | undefined,
): LiveBranding {
  return {
    primaryColor: branding?.primaryColor ?? defaultLiveBranding.primaryColor,
    secondaryColor:
      branding?.secondaryColor ?? defaultLiveBranding.secondaryColor,
    accentColor: branding?.accentColor ?? defaultLiveBranding.accentColor,
    fontFamily: branding?.fontFamily ?? defaultLiveBranding.fontFamily,
  };
}

export function normalizeParticipantEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? normalizedEmail : null;
}

export function getAvatarForNickname(nickname: string) {
  const avatars = [
    "aurora",
    "cobalt",
    "ember",
    "forest",
    "gold",
    "indigo",
    "rose",
    "sky",
  ];

  const seed = nickname
    .trim()
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return avatars[seed % avatars.length] ?? "sky";
}

export async function getLiveSessionByPin(pin: string) {
  const [liveSession] = await db
    .select({
      id: quizSessions.id,
      pin: quizSessions.pin,
      mode: quizSessions.mode,
      status: quizSessions.status,
      createdAt: quizSessions.createdAt,
      startsAt: quizSessions.startsAt,
      expiresAt: quizSessions.expiresAt,
      finishedAt: quizSessions.finishedAt,
      maxAttempts: quizSessions.maxAttempts,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizDescription: quizzes.description,
      quizBranding: quizzes.branding,
      versionTitle: quizVersions.title,
      versionDescription: quizVersions.description,
      versionNumber: quizVersions.versionNumber,
      versionBranding: quizVersions.branding,
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .innerJoin(quizVersions, eq(quizSessions.quizVersionId, quizVersions.id))
    .where(and(eq(quizSessions.pin, pin), eq(quizSessions.mode, "live")))
    .limit(1);

  return liveSession ?? null;
}

export async function getLiveSessionById(sessionId: string) {
  const [liveSession] = await db
    .select({
      id: quizSessions.id,
      pin: quizSessions.pin,
      quizId: quizSessions.quizId,
      quizVersionId: quizSessions.quizVersionId,
      mode: quizSessions.mode,
      status: quizSessions.status,
      createdAt: quizSessions.createdAt,
      startsAt: quizSessions.startsAt,
      expiresAt: quizSessions.expiresAt,
      finishedAt: quizSessions.finishedAt,
      maxAttempts: quizSessions.maxAttempts,
      quizTitle: quizzes.title,
      quizDescription: quizzes.description,
      quizBranding: quizzes.branding,
      versionTitle: quizVersions.title,
      versionDescription: quizVersions.description,
      versionNumber: quizVersions.versionNumber,
      versionBranding: quizVersions.branding,
      questionsSnapshot: quizVersions.questionsSnapshot,
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .innerJoin(quizVersions, eq(quizSessions.quizVersionId, quizVersions.id))
    .where(eq(quizSessions.id, sessionId))
    .limit(1);

  return liveSession ?? null;
}

export async function getParticipantByToken(params: {
  participantToken: string;
  sessionId: string;
}) {
  const [participant] = await db
    .select({
      id: participants.id,
      nickname: participants.nickname,
      email: participants.email,
      participantToken: participants.participantToken,
      avatar: participants.avatar,
      score: participants.score,
      joinedAt: participants.joinedAt,
    })
    .from(participants)
    .where(
      and(
        eq(participants.participantToken, params.participantToken),
        eq(participants.sessionId, params.sessionId),
      ),
    )
    .limit(1);

  return participant ?? null;
}

export async function getSessionParticipants(sessionId: string) {
  return db
    .select({
      id: participants.id,
      nickname: participants.nickname,
      avatar: participants.avatar,
      score: participants.score,
      joinedAt: participants.joinedAt,
      finishedAt: participants.finishedAt,
    })
    .from(participants)
    .where(eq(participants.sessionId, sessionId))
    .orderBy(asc(participants.joinedAt), asc(participants.nickname));
}

export async function buildRuntimeQuestionsForSession(sessionId: string) {
  const liveSession = await getLiveSessionById(sessionId);

  if (!liveSession) {
    return [];
  }

  const snapshot =
    (liveSession.questionsSnapshot as
      | Array<{
          content?: { options?: string[]; question?: string };
          correctAnswer?: { index?: number };
          timeLimitSeconds?: number;
          type?: string;
        }>
      | undefined) ?? [];

  const currentQuestions = await db
    .select({
      id: questions.id,
      orderIndex: questions.orderIndex,
      pointsBase: questions.pointsBase,
    })
    .from(questions)
    .where(eq(questions.quizId, liveSession.quizId))
    .orderBy(asc(questions.orderIndex));

  return snapshot.map((question, index) => {
    const currentQuestion = currentQuestions[index];
    const options = question.content?.options ?? [];

    return {
      correctIndex: question.correctAnswer?.index ?? 0,
      id: currentQuestion?.id ?? `virtual-${liveSession.id}-${index}`,
      options,
      orderIndex: index,
      persistable: Boolean(currentQuestion?.id),
      pointsBase: currentQuestion?.pointsBase ?? 1000,
      prompt: question.content?.question ?? `Pergunta ${index + 1}`,
      timeLimitSeconds: question.timeLimitSeconds ?? 20,
      type: question.type === "true_false" ? "true_false" : "multiple_choice",
    } satisfies RuntimeLiveQuestion;
  });
}

export function isJoinableLiveStatus(status: string) {
  return inArrayValue(status, ["waiting", "countdown", "playing"]);
}

export function isWaitingRoomStatus(status: string) {
  return inArrayValue(status, ["waiting", "countdown"]);
}

function inArrayValue(value: string, values: string[]) {
  return values.includes(value);
}
