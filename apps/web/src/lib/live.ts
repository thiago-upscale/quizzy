import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants, quizSessions, quizzes, quizVersions } from "@/db/schema";

export type LiveBranding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
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

export function isJoinableLiveStatus(status: string) {
  return inArrayValue(status, ["waiting", "countdown", "playing"]);
}

export function isWaitingRoomStatus(status: string) {
  return inArrayValue(status, ["waiting", "countdown"]);
}

function inArrayValue(value: string, values: string[]) {
  return values.includes(value);
}
