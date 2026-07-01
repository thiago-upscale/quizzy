import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  answers,
  participants,
  questions,
  quizSessions,
  quizzes,
  quizVersions,
  sessionEvents,
} from "@/db/schema";

export type BackgroundDimming = "nenhum" | "leve" | "medio" | "forte";

export const BACKGROUND_DIMMING_VALUES: BackgroundDimming[] = [
  "nenhum",
  "leve",
  "medio",
  "forte",
];

export type LogoPosition = "top-left" | "top-right" | "hidden";
export type TimerStyle = "number" | "bar" | "circle";

export const LOGO_POSITION_VALUES: LogoPosition[] = [
  "top-left",
  "top-right",
  "hidden",
];
export const TIMER_STYLE_VALUES: TimerStyle[] = ["number", "bar", "circle"];

export type LiveBranding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  backgroundDimming: BackgroundDimming;
  logoUrl: string | null;
  showQuestionOnMobile: boolean;
  slogan: string;
  logoPosition: LogoPosition;
  timerStyle: TimerStyle;
  showPinOnDisplay: boolean;
  showParticipantCount: boolean;
  showLeaderboardBetweenQuestions: boolean;
  autoAdvanceSeconds: number;
  hideQuizzyBranding: boolean;
  showScoreOnMobile: boolean;
  showRankOnMobile: boolean;
  welcomeMessage: string;
  countdownMessage: string;
  endMessage: string;
  postQuizUrl: string;
  enableAnimations: boolean;
  surpriseMode: boolean;
  anonymousMode: boolean;
  enableSounds: boolean;
  enableVibration: boolean;
};

export type RuntimeLiveQuestion = {
  correctIndex: number;
  id: string;
  imageUrl: string | null;
  options: string[];
  orderIndex: number;
  persistable: boolean;
  pointsBase: number;
  prompt: string;
  timeLimitSeconds: number;
  type: "multiple_choice" | "true_false" | "poll" | "scale";
  // scale-specific
  minValue?: number;
  maxValue?: number;
  step?: number;
  targetValue?: number;
};

export type LiveRecoveryParticipant = {
  avatar: string;
  currentStreak: number;
  id: string;
  nickname: string;
  participantToken: string;
  score: number;
  totalTimeMs: number;
};

export type LiveRecoveryAnswer = {
  answerIndex: number;
  isCorrect: boolean;
  participantToken: string;
  pointsEarned: number;
  timeSpentMs: number;
};

export type LiveRecoverySnapshot = {
  countdownStartedAt: string | null;
  currentQuestionAnswers: LiveRecoveryAnswer[];
  currentQuestionIndex: number | null;
  participants: LiveRecoveryParticipant[];
  pin: string;
  questionStartedAt: string | null;
  questions: RuntimeLiveQuestion[];
  sessionId: string;
  status: string;
};

export const defaultLiveBranding: LiveBranding = {
  primaryColor: "#0f766e",
  secondaryColor: "#10233f",
  accentColor: "#f59e0b",
  fontFamily: "DM Sans",
  backgroundImageUrl: null,
  backgroundDimming: "medio",
  logoUrl: null,
  showQuestionOnMobile: false,
  slogan: "",
  logoPosition: "top-left",
  timerStyle: "number",
  showPinOnDisplay: true,
  showParticipantCount: true,
  showLeaderboardBetweenQuestions: false,
  autoAdvanceSeconds: 0,
  hideQuizzyBranding: false,
  showScoreOnMobile: true,
  showRankOnMobile: true,
  welcomeMessage: "",
  countdownMessage: "",
  endMessage: "",
  postQuizUrl: "",
  enableAnimations: true,
  surpriseMode: false,
  anonymousMode: false,
  enableSounds: true,
  enableVibration: true,
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
    backgroundImageUrl:
      typeof branding?.backgroundImageUrl === "string"
        ? branding.backgroundImageUrl
        : defaultLiveBranding.backgroundImageUrl,
    backgroundDimming: BACKGROUND_DIMMING_VALUES.includes(
      branding?.backgroundDimming as BackgroundDimming,
    )
      ? (branding?.backgroundDimming as BackgroundDimming)
      : defaultLiveBranding.backgroundDimming,
    logoUrl:
      typeof branding?.logoUrl === "string"
        ? branding.logoUrl
        : defaultLiveBranding.logoUrl,
    showQuestionOnMobile:
      typeof branding?.showQuestionOnMobile === "boolean"
        ? branding.showQuestionOnMobile
        : defaultLiveBranding.showQuestionOnMobile,
    slogan:
      typeof branding?.slogan === "string"
        ? branding.slogan
        : defaultLiveBranding.slogan,
    logoPosition: LOGO_POSITION_VALUES.includes(
      branding?.logoPosition as LogoPosition,
    )
      ? (branding?.logoPosition as LogoPosition)
      : defaultLiveBranding.logoPosition,
    timerStyle: TIMER_STYLE_VALUES.includes(branding?.timerStyle as TimerStyle)
      ? (branding?.timerStyle as TimerStyle)
      : defaultLiveBranding.timerStyle,
    showPinOnDisplay:
      typeof branding?.showPinOnDisplay === "boolean"
        ? branding.showPinOnDisplay
        : defaultLiveBranding.showPinOnDisplay,
    showParticipantCount:
      typeof branding?.showParticipantCount === "boolean"
        ? branding.showParticipantCount
        : defaultLiveBranding.showParticipantCount,
    showLeaderboardBetweenQuestions:
      typeof branding?.showLeaderboardBetweenQuestions === "boolean"
        ? branding.showLeaderboardBetweenQuestions
        : defaultLiveBranding.showLeaderboardBetweenQuestions,
    autoAdvanceSeconds:
      typeof branding?.autoAdvanceSeconds === "number" &&
      branding.autoAdvanceSeconds >= 0
        ? Math.floor(branding.autoAdvanceSeconds)
        : defaultLiveBranding.autoAdvanceSeconds,
    hideQuizzyBranding:
      typeof branding?.hideQuizzyBranding === "boolean"
        ? branding.hideQuizzyBranding
        : defaultLiveBranding.hideQuizzyBranding,
    showScoreOnMobile:
      typeof branding?.showScoreOnMobile === "boolean"
        ? branding.showScoreOnMobile
        : defaultLiveBranding.showScoreOnMobile,
    showRankOnMobile:
      typeof branding?.showRankOnMobile === "boolean"
        ? branding.showRankOnMobile
        : defaultLiveBranding.showRankOnMobile,
    welcomeMessage:
      typeof branding?.welcomeMessage === "string"
        ? branding.welcomeMessage
        : defaultLiveBranding.welcomeMessage,
    countdownMessage:
      typeof branding?.countdownMessage === "string"
        ? branding.countdownMessage
        : defaultLiveBranding.countdownMessage,
    endMessage:
      typeof branding?.endMessage === "string"
        ? branding.endMessage
        : defaultLiveBranding.endMessage,
    postQuizUrl:
      typeof branding?.postQuizUrl === "string"
        ? branding.postQuizUrl
        : defaultLiveBranding.postQuizUrl,
    enableAnimations:
      typeof branding?.enableAnimations === "boolean"
        ? branding.enableAnimations
        : defaultLiveBranding.enableAnimations,
    surpriseMode:
      typeof branding?.surpriseMode === "boolean"
        ? branding.surpriseMode
        : defaultLiveBranding.surpriseMode,
    anonymousMode:
      typeof branding?.anonymousMode === "boolean"
        ? branding.anonymousMode
        : defaultLiveBranding.anonymousMode,
    enableSounds:
      typeof branding?.enableSounds === "boolean"
        ? branding.enableSounds
        : defaultLiveBranding.enableSounds,
    enableVibration:
      typeof branding?.enableVibration === "boolean"
        ? branding.enableVibration
        : defaultLiveBranding.enableVibration,
  };
}

function toBrandingPartial(value: unknown): Partial<LiveBranding> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Partial<LiveBranding>;
}

export function resolveLiveBranding(params: {
  quizBranding: unknown;
  versionBranding: unknown;
}) {
  return normalizeLiveBranding({
    ...toBrandingPartial(params.versionBranding),
    ...toBrandingPartial(params.quizBranding),
  });
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
      requireParticipantEmail: quizSessions.requireParticipantEmail,
      quizId: quizzes.id,
      quizOrganizationId: quizzes.organizationId,
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
      requireParticipantEmail: quizSessions.requireParticipantEmail,
      quizOrganizationId: quizzes.organizationId,
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
      currentStreak: participants.currentStreak,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
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
      currentStreak: participants.currentStreak,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
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
          content?: {
            imageUrl?: string | null;
            options?: string[];
            question?: string;
            minValue?: number;
            maxValue?: number;
            step?: number;
          };
          correctAnswer?: { index?: number; value?: number };
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

    const qType =
      question.type === "true_false"
        ? "true_false"
        : question.type === "poll"
          ? "poll"
          : question.type === "scale"
            ? "scale"
            : "multiple_choice";

    return {
      correctIndex:
        question.type === "poll" || question.type === "scale"
          ? -1
          : (question.correctAnswer?.index ?? 0),
      id: currentQuestion?.id ?? `virtual-${liveSession.id}-${index}`,
      imageUrl:
        typeof question.content?.imageUrl === "string"
          ? question.content.imageUrl
          : null,
      options,
      orderIndex: index,
      persistable: Boolean(currentQuestion?.id),
      pointsBase: currentQuestion?.pointsBase ?? 1000,
      prompt: question.content?.question ?? `Pergunta ${index + 1}`,
      timeLimitSeconds: question.timeLimitSeconds ?? 20,
      type: qType,
      ...(qType === "scale"
        ? {
            minValue: question.content?.minValue ?? 0,
            maxValue: question.content?.maxValue ?? 10,
            step: question.content?.step ?? 1,
            targetValue: question.correctAnswer?.value ?? 5,
          }
        : {}),
    } satisfies RuntimeLiveQuestion;
  });
}

function getEventQuestionIndex(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "questionIndex" in payload &&
    typeof payload.questionIndex === "number"
  ) {
    return payload.questionIndex;
  }

  return null;
}

function getAnswerIndexFromPayload(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "index" in value &&
    typeof value.index === "number"
  ) {
    return value.index;
  }

  return 0;
}

function getAnswerValueFromPayload(value: unknown): number | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "number"
  ) {
    return value.value;
  }

  return undefined;
}

export async function buildLiveRecoverySnapshot(params: {
  pin?: string;
  sessionId?: string;
}) {
  const pin = params.pin?.trim();
  const sessionId = params.sessionId?.trim();

  if (!pin && !sessionId) {
    return null;
  }

  const [liveSession] = await db
    .select({
      id: quizSessions.id,
      pin: quizSessions.pin,
      status: quizSessions.status,
    })
    .from(quizSessions)
    .where(
      pin
        ? and(eq(quizSessions.pin, pin), eq(quizSessions.mode, "live"))
        : and(
            eq(quizSessions.id, sessionId as string),
            eq(quizSessions.mode, "live"),
          ),
    )
    .limit(1);

  if (!liveSession?.pin) {
    return null;
  }

  const [runtimeQuestions, participantRows, eventRows] = await Promise.all([
    buildRuntimeQuestionsForSession(liveSession.id),
    db
      .select({
        avatar: participants.avatar,
        currentStreak: participants.currentStreak,
        id: participants.id,
        nickname: participants.nickname,
        participantToken: participants.participantToken,
        score: participants.score,
        totalTimeMs: participants.totalTimeMs,
      })
      .from(participants)
      .where(eq(participants.sessionId, liveSession.id))
      .orderBy(asc(participants.joinedAt), asc(participants.nickname)),
    db
      .select({
        createdAt: sessionEvents.createdAt,
        eventType: sessionEvents.eventType,
        payload: sessionEvents.payload,
      })
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, liveSession.id))
      .orderBy(desc(sessionEvents.createdAt))
      .limit(40),
  ]);

  const latestQuestionStarted = eventRows.find(
    (event) => event.eventType === "session.question_started",
  );
  const latestCountdownStarted = eventRows.find(
    (event) => event.eventType === "session.countdown_started",
  );
  const currentQuestionIndex = latestQuestionStarted
    ? getEventQuestionIndex(latestQuestionStarted.payload)
    : null;
  const currentQuestion =
    currentQuestionIndex !== null
      ? (runtimeQuestions[currentQuestionIndex] ?? null)
      : null;

  const currentQuestionAnswers = currentQuestion?.persistable
    ? await db
        .select({
          answer: answers.answer,
          isCorrect: answers.isCorrect,
          participantToken: participants.participantToken,
          pointsEarned: answers.pointsEarned,
          timeSpentMs: answers.timeSpentMs,
        })
        .from(answers)
        .innerJoin(participants, eq(answers.participantId, participants.id))
        .where(
          and(
            eq(answers.sessionId, liveSession.id),
            eq(answers.questionId, currentQuestion.id),
          ),
        )
    : [];

  return {
    countdownStartedAt: latestCountdownStarted?.createdAt.toISOString() ?? null,
    currentQuestionAnswers: currentQuestionAnswers.map((row) => ({
      answerIndex: getAnswerIndexFromPayload(row.answer),
      answerValue: getAnswerValueFromPayload(row.answer),
      isCorrect: row.isCorrect,
      participantToken: row.participantToken,
      pointsEarned: row.pointsEarned,
      timeSpentMs: row.timeSpentMs,
    })),
    currentQuestionIndex,
    participants: participantRows,
    pin: liveSession.pin,
    questionStartedAt: latestQuestionStarted?.createdAt.toISOString() ?? null,
    questions: runtimeQuestions,
    sessionId: liveSession.id,
    status: liveSession.status,
  } satisfies LiveRecoverySnapshot;
}

export function isJoinableLiveStatus(status: string) {
  return inArrayValue(status, [
    "waiting",
    "countdown",
    "playing",
    "question_result",
  ]);
}

export function canAccessLiveStatus(status: string) {
  return inArrayValue(status, [
    "waiting",
    "countdown",
    "playing",
    "question_result",
    "interrupted",
    "finished",
  ]);
}

export function isWaitingRoomStatus(status: string) {
  return inArrayValue(status, ["waiting", "countdown"]);
}

function inArrayValue(value: string, values: string[]) {
  return values.includes(value);
}
