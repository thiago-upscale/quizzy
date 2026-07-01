"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import {
  answers,
  attempts,
  participants,
  questions,
  quizzes,
  quizSessions,
  quizVersions,
  sessionEvents,
} from "@/db/schema";
import { env } from "@/env";
import {
  buildRuntimeQuestionsForSession,
  getLiveSessionById,
} from "@/lib/live";
import { logger } from "@/lib/logger";
import { activeSessionStatuses } from "./dashboard-helpers";

export async function createQuiz() {
  const session = await requireAuthSession();

  const [quiz] = await db
    .insert(quizzes)
    .values({
      organizationId: session.user.organizationId,
      createdBy: session.user.id,
      title: "Novo quiz",
      description: "",
      branding: {
        primaryColor: "#0f766e",
        secondaryColor: "#10233f",
        accentColor: "#f59e0b",
        backgroundImageUrl: null,
        logoUrl: null,
        fontFamily: "Manrope",
        showQuestionOnMobile: false,
      },
    })
    .returning({ id: quizzes.id });

  if (!quiz) {
    throw new Error("Nao foi possivel criar o quiz.");
  }

  await db.insert(questions).values({
    quizId: quiz.id,
    orderIndex: 0,
    type: "multiple_choice",
    content: {
      question: "Sua primeira pergunta",
      options: ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
      imageUrl: null,
    },
    correctAnswer: { index: 0 },
    timeLimitSeconds: 20,
  });

  redirect(`/dashboard/quizzes/${quiz.id}`);
}

type QuestionPayload = {
  id?: string;
  type: "multiple_choice" | "true_false" | "poll" | "scale";
  question: string;
  options: string[];
  correctIndex: number;
  imageUrl?: string | null;
  timeLimitSeconds: number;
  // scale-specific
  minValue?: number;
  maxValue?: number;
  step?: number;
  targetValue?: number;
};

type BrandingPayload = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  backgroundDimming: "nenhum" | "leve" | "medio" | "forte";
  logoUrl: string | null;
  showQuestionOnMobile: boolean;
  slogan: string;
  logoPosition: "top-left" | "top-right" | "hidden";
  timerStyle: "number" | "bar" | "circle";
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

export type SaveQuizState = {
  message?: string;
  quizStatus?: "draft" | "published";
  status: "idle" | "success" | "error";
};

export type StartLiveSessionState = {
  message?: string;
  status: "idle" | "success" | "error";
};

export type DeleteSessionsState = {
  deletedCount?: number;
  message?: string;
  status: "idle" | "success" | "error";
};

const defaultBranding: BrandingPayload = {
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

const destructiveConfirmationText = "APAGAR";

function sanitizeHex(color: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function sanitizeAssetUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("/uploads/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return null;
}

function normalizeBranding(
  branding: Partial<BrandingPayload>,
): BrandingPayload {
  return {
    primaryColor: sanitizeHex(
      branding.primaryColor ?? defaultBranding.primaryColor,
      defaultBranding.primaryColor,
    ),
    secondaryColor: sanitizeHex(
      branding.secondaryColor ?? defaultBranding.secondaryColor,
      defaultBranding.secondaryColor,
    ),
    accentColor: sanitizeHex(
      branding.accentColor ?? defaultBranding.accentColor,
      defaultBranding.accentColor,
    ),
    fontFamily:
      typeof branding.fontFamily === "string" && branding.fontFamily.length > 0
        ? branding.fontFamily
        : defaultBranding.fontFamily,
    backgroundImageUrl: sanitizeAssetUrl(branding.backgroundImageUrl),
    backgroundDimming: (["nenhum", "leve", "medio", "forte"] as const).includes(
      branding.backgroundDimming as "nenhum" | "leve" | "medio" | "forte",
    )
      ? (branding.backgroundDimming as "nenhum" | "leve" | "medio" | "forte")
      : defaultBranding.backgroundDimming,
    logoUrl: sanitizeAssetUrl(branding.logoUrl),
    showQuestionOnMobile:
      typeof branding.showQuestionOnMobile === "boolean"
        ? branding.showQuestionOnMobile
        : defaultBranding.showQuestionOnMobile,
    slogan:
      typeof branding.slogan === "string"
        ? branding.slogan.trim().slice(0, 200)
        : defaultBranding.slogan,
    logoPosition: (["top-left", "top-right", "hidden"] as const).includes(
      branding.logoPosition as "top-left" | "top-right" | "hidden",
    )
      ? (branding.logoPosition as "top-left" | "top-right" | "hidden")
      : defaultBranding.logoPosition,
    timerStyle: (["number", "bar", "circle"] as const).includes(
      branding.timerStyle as "number" | "bar" | "circle",
    )
      ? (branding.timerStyle as "number" | "bar" | "circle")
      : defaultBranding.timerStyle,
    showPinOnDisplay:
      typeof branding.showPinOnDisplay === "boolean"
        ? branding.showPinOnDisplay
        : defaultBranding.showPinOnDisplay,
    showParticipantCount:
      typeof branding.showParticipantCount === "boolean"
        ? branding.showParticipantCount
        : defaultBranding.showParticipantCount,
    showLeaderboardBetweenQuestions:
      typeof branding.showLeaderboardBetweenQuestions === "boolean"
        ? branding.showLeaderboardBetweenQuestions
        : defaultBranding.showLeaderboardBetweenQuestions,
    autoAdvanceSeconds:
      typeof branding.autoAdvanceSeconds === "number" &&
      branding.autoAdvanceSeconds >= 0
        ? Math.min(Math.floor(branding.autoAdvanceSeconds), 60)
        : defaultBranding.autoAdvanceSeconds,
    hideQuizzyBranding:
      typeof branding.hideQuizzyBranding === "boolean"
        ? branding.hideQuizzyBranding
        : defaultBranding.hideQuizzyBranding,
    showScoreOnMobile:
      typeof branding.showScoreOnMobile === "boolean"
        ? branding.showScoreOnMobile
        : defaultBranding.showScoreOnMobile,
    showRankOnMobile:
      typeof branding.showRankOnMobile === "boolean"
        ? branding.showRankOnMobile
        : defaultBranding.showRankOnMobile,
    welcomeMessage:
      typeof branding.welcomeMessage === "string"
        ? branding.welcomeMessage.trim().slice(0, 300)
        : defaultBranding.welcomeMessage,
    countdownMessage:
      typeof branding.countdownMessage === "string"
        ? branding.countdownMessage.trim().slice(0, 200)
        : defaultBranding.countdownMessage,
    endMessage:
      typeof branding.endMessage === "string"
        ? branding.endMessage.trim().slice(0, 300)
        : defaultBranding.endMessage,
    postQuizUrl: sanitizeAssetUrl(branding.postQuizUrl) ?? "",
    enableAnimations:
      typeof branding.enableAnimations === "boolean"
        ? branding.enableAnimations
        : defaultBranding.enableAnimations,
    surpriseMode:
      typeof branding.surpriseMode === "boolean"
        ? branding.surpriseMode
        : defaultBranding.surpriseMode,
    anonymousMode:
      typeof branding.anonymousMode === "boolean"
        ? branding.anonymousMode
        : defaultBranding.anonymousMode,
    enableSounds:
      typeof branding.enableSounds === "boolean"
        ? branding.enableSounds
        : defaultBranding.enableSounds,
    enableVibration:
      typeof branding.enableVibration === "boolean"
        ? branding.enableVibration
        : defaultBranding.enableVibration,
  };
}

function normalizeQuestions(parsedQuestions: QuestionPayload[]) {
  return parsedQuestions
    .map((question, index) => {
      const trimmedQuestion = question.question.trim();

      if (question.type === "scale") {
        const minValue = typeof question.minValue === "number" ? question.minValue : 0;
        const maxValue = typeof question.maxValue === "number" ? question.maxValue : 10;
        const step = typeof question.step === "number" ? question.step : 1;
        const targetValue = typeof question.targetValue === "number" ? question.targetValue : Math.round((minValue + maxValue) / 2);
        return {
          id: typeof question.id === "string" ? question.id : undefined,
          orderIndex: index,
          type: question.type,
          content: {
            question: trimmedQuestion,
            options: [] as string[],
            imageUrl: sanitizeAssetUrl(question.imageUrl),
            minValue,
            maxValue,
            step,
          },
          correctAnswer: { value: targetValue },
          timeLimitSeconds: question.timeLimitSeconds,
        };
      }

      return {
        id: typeof question.id === "string" ? question.id : undefined,
        orderIndex: index,
        type: question.type,
        content: {
          question: trimmedQuestion,
          options:
            question.type === "true_false"
              ? ["Verdadeiro", "Falso"]
              : question.options.map((option) => option.trim()).filter(Boolean),
          imageUrl: sanitizeAssetUrl(question.imageUrl),
        },
        correctAnswer: {
          index: question.correctIndex,
        },
        timeLimitSeconds: question.timeLimitSeconds,
      };
    })
    .filter((question) => {
      if (!question.content.question.length) return false;
      if (question.type === "scale") return true;
      return question.content.options.length >= 2;
    });
}

function parseSessionIds(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return [
      ...new Set(
        parsed.filter((value): value is string => typeof value === "string"),
      ),
    ];
  } catch {
    return [];
  }
}

async function notifyRealtimeSessionTermination(params: {
  pin: string;
  sessionId: string;
}) {
  const response = await fetch(
    `${env.REALTIME_URL}/internal/session/terminate`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
      },
      body: JSON.stringify(params),
    },
  );

  if (!response.ok) {
    throw new Error("Nao foi possivel encerrar a sala realtime.");
  }
}

async function terminateLiveSessionsBeforeDelete(
  liveSessions: Array<{ id: string; pin: string | null; status: string }>,
) {
  for (const liveSession of liveSessions) {
    if (
      !liveSession.pin ||
      !activeSessionStatuses.includes(
        liveSession.status as (typeof activeSessionStatuses)[number],
      )
    ) {
      continue;
    }

    await notifyRealtimeSessionTermination({
      pin: liveSession.pin,
      sessionId: liveSession.id,
    });
  }
}

async function deleteSessionsCascade(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  sessionIds: string[],
) {
  if (sessionIds.length === 0) {
    return;
  }

  await tx.delete(answers).where(inArray(answers.sessionId, sessionIds));
  await tx.delete(attempts).where(inArray(attempts.sessionId, sessionIds));

  const participantRows = await tx
    .select({ id: participants.id })
    .from(participants)
    .where(inArray(participants.sessionId, sessionIds));

  const participantIds = participantRows.map((participant) => participant.id);

  if (participantIds.length > 0) {
    await tx
      .delete(participants)
      .where(inArray(participants.id, participantIds));
  }

  await tx
    .delete(sessionEvents)
    .where(inArray(sessionEvents.sessionId, sessionIds));

  await tx.delete(quizSessions).where(inArray(quizSessions.id, sessionIds));
}

export async function saveQuiz(
  _previousState: SaveQuizState,
  formData: FormData,
): Promise<SaveQuizState> {
  const session = await requireAuthSession();
  const quizId = String(formData.get("quizId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const intent = String(formData.get("intent") ?? "draft");
  const questionsPayload = String(formData.get("questionsPayload") ?? "[]");
  const brandingPayload = String(formData.get("brandingPayload") ?? "{}");

  if (!quizId) {
    return { message: "Quiz invalido.", status: "error" };
  }

  const [existingQuiz] = await db
    .select({
      id: quizzes.id,
      organizationId: quizzes.organizationId,
      createdBy: quizzes.createdBy,
      title: quizzes.title,
    })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!existingQuiz) {
    return { message: "Quiz nao encontrado.", status: "error" };
  }

  const safeTitle = title || existingQuiz.title || "Novo quiz";

  const [existingQuestionRows, referencedAnswerRows] = await Promise.all([
    db
      .select({
        id: questions.id,
      })
      .from(questions)
      .where(eq(questions.quizId, quizId)),
    db
      .select({
        questionId: answers.questionId,
      })
      .from(answers)
      .innerJoin(questions, eq(answers.questionId, questions.id))
      .where(eq(questions.quizId, quizId)),
  ]);

  let parsedQuestions: QuestionPayload[];
  let branding: BrandingPayload;

  try {
    parsedQuestions = JSON.parse(questionsPayload) as QuestionPayload[];
    branding = normalizeBranding(
      JSON.parse(brandingPayload) as Partial<BrandingPayload>,
    );
  } catch {
    return {
      message: "Os dados do editor ficaram invalidos.",
      status: "error",
    };
  }

  const normalizedQuestions = normalizeQuestions(parsedQuestions);

  if (normalizedQuestions.length === 0) {
    return {
      message: "Inclua pelo menos uma pergunta valida antes de salvar.",
      status: "error",
    };
  }

  const existingQuestionIds = new Set(
    existingQuestionRows.map((row) => row.id),
  );
  const referencedQuestionIds = new Set(
    referencedAnswerRows.map((row) => row.questionId),
  );
  const retainedExistingQuestionIds = new Set(
    normalizedQuestions
      .map((question) => question.id)
      .filter(
        (questionId): questionId is string =>
          typeof questionId === "string" && existingQuestionIds.has(questionId),
      ),
  );
  const removedReferencedQuestions = existingQuestionRows.filter(
    (row) =>
      referencedQuestionIds.has(row.id) &&
      !retainedExistingQuestionIds.has(row.id),
  );

  if (removedReferencedQuestions.length > 0) {
    return {
      message:
        "Este quiz ja tem respostas registradas. Para manter o historico, nao remova perguntas antigas; edite o texto ou crie novas perguntas no fim.",
      status: "error",
    };
  }

  const nextStatus = intent === "publish" ? "published" : "draft";

  await db.transaction(async (tx) => {
    await tx
      .update(quizzes)
      .set({
        title: safeTitle,
        description,
        branding,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId));

    // Move current rows out of the unique(orderIndex) range before reordering.
    await tx
      .update(questions)
      .set({
        orderIndex: sql`${questions.orderIndex} + ${normalizedQuestions.length + existingQuestionRows.length + 100}`,
      })
      .where(eq(questions.quizId, quizId));

    for (const question of normalizedQuestions) {
      if (question.id && existingQuestionIds.has(question.id)) {
        await tx
          .update(questions)
          .set({
            orderIndex: question.orderIndex,
            type: question.type,
            content: question.content,
            correctAnswer: question.correctAnswer,
            timeLimitSeconds: question.timeLimitSeconds,
          })
          .where(eq(questions.id, question.id));
        continue;
      }

      await tx.insert(questions).values({
        quizId,
        orderIndex: question.orderIndex,
        type: question.type,
        content: question.content,
        correctAnswer: question.correctAnswer,
        timeLimitSeconds: question.timeLimitSeconds,
      });
    }

    const removableQuestionIds = existingQuestionRows
      .filter((row) => !retainedExistingQuestionIds.has(row.id))
      .map((row) => row.id)
      .filter((questionId) => !referencedQuestionIds.has(questionId));

    if (removableQuestionIds.length > 0) {
      await tx
        .delete(questions)
        .where(inArray(questions.id, removableQuestionIds));
    }

    if (intent === "publish") {
      const [lastVersion] = await tx
        .select({ versionNumber: quizVersions.versionNumber })
        .from(quizVersions)
        .where(eq(quizVersions.quizId, quizId))
        .orderBy(desc(quizVersions.versionNumber))
        .limit(1);

      await tx.insert(quizVersions).values({
        quizId,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        title: safeTitle,
        description,
        branding,
        questionsSnapshot: normalizedQuestions,
        createdBy: existingQuiz.createdBy,
      });
    }
  });

  // Revalidate the dashboard list (title/status changes show there), but NOT the
  // editor route itself: revalidating the current page re-renders this dynamic
  // route and remounts the client editor, wiping the in-progress form state back
  // to (stale) server props — which made an edited "Tempo limite" snap back even
  // though it was saved correctly. The editor is force-dynamic, so navigating
  // back to it refetches fresh data anyway. We return quizStatus so the client
  // can update the published/draft badge without that remount.
  revalidatePath("/dashboard");

  return {
    message:
      intent === "publish"
        ? "Versao publicada com sucesso."
        : "Rascunho salvo com sucesso.",
    quizStatus: nextStatus,
    status: "success",
  };
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createLiveSession(formData: FormData) {
  const session = await requireAuthSession();
  const quizId = String(formData.get("quizId") ?? "");
  const requireParticipantEmail =
    String(formData.get("requireParticipantEmail") ?? "") === "on";

  if (!quizId) {
    throw new Error("Quiz invalido.");
  }

  const [quiz] = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      organizationId: quizzes.organizationId,
      createdBy: quizzes.createdBy,
      status: quizzes.status,
    })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!quiz) {
    throw new Error("Quiz nao encontrado.");
  }

  const [latestVersion] = await db
    .select({
      id: quizVersions.id,
      versionNumber: quizVersions.versionNumber,
    })
    .from(quizVersions)
    .where(eq(quizVersions.quizId, quizId))
    .orderBy(desc(quizVersions.versionNumber))
    .limit(1);

  if (!latestVersion) {
    throw new Error("Publique o quiz antes de iniciar uma sessao live.");
  }

  let pin = "";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generatePin();
    const [existingSession] = await db
      .select({ id: quizSessions.id })
      .from(quizSessions)
      .where(
        and(
          eq(quizSessions.pin, candidate),
          inArray(quizSessions.status, [
            "waiting",
            "countdown",
            "playing",
            "question_result",
            "interrupted",
          ]),
        ),
      )
      .limit(1);

    if (!existingSession) {
      pin = candidate;
      break;
    }
  }

  if (!pin) {
    throw new Error("Nao foi possivel gerar um PIN unico agora.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const [liveSession] = await db
    .insert(quizSessions)
    .values({
      quizId: quiz.id,
      quizVersionId: latestVersion.id,
      hostId: session.user.id,
      pin,
      mode: "live",
      status: "waiting",
      startsAt: now,
      expiresAt,
      requireParticipantEmail,
    })
    .returning({
      id: quizSessions.id,
    });

  if (!liveSession) {
    throw new Error("Nao foi possivel criar a sessao live.");
  }

  await db.insert(sessionEvents).values({
    sessionId: liveSession.id,
    eventType: "session.created",
    payload: {
      pin,
      quizId: quiz.id,
      quizVersionId: latestVersion.id,
      mode: "live",
      requireParticipantEmail,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${liveSession.id}`);
}

export async function createIndividualSession(formData: FormData) {
  const session = await requireAuthSession();
  const quizId = String(formData.get("quizId") ?? "");
  const endsAtInput = String(formData.get("endsAt") ?? "").trim();
  const maxAttemptsInput = Number(formData.get("maxAttempts") ?? 1);
  const requireParticipantEmail =
    String(formData.get("requireParticipantEmail") ?? "") === "on";

  if (!quizId) {
    throw new Error("Quiz invalido.");
  }

  const [latestVersion] = await db
    .select({
      id: quizVersions.id,
    })
    .from(quizVersions)
    .where(eq(quizVersions.quizId, quizId))
    .orderBy(desc(quizVersions.versionNumber))
    .limit(1);

  if (!latestVersion) {
    throw new Error("Publique o quiz antes de criar uma sessao individual.");
  }

  const shareToken = crypto.randomUUID().replaceAll("-", "");
  const now = new Date();
  const parsedEndsAt = endsAtInput ? new Date(endsAtInput) : null;
  const endsAt =
    parsedEndsAt && !Number.isNaN(parsedEndsAt.getTime()) && parsedEndsAt > now
      ? parsedEndsAt
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const maxAttempts =
    Number.isInteger(maxAttemptsInput) && maxAttemptsInput >= 1
      ? Math.min(maxAttemptsInput, 3)
      : 1;

  const [individualSession] = await db
    .insert(quizSessions)
    .values({
      quizId,
      quizVersionId: latestVersion.id,
      hostId: session.user.id,
      shareToken,
      mode: "individual",
      status: "waiting",
      startsAt: now,
      endsAt,
      expiresAt: endsAt,
      maxAttempts,
      requireParticipantEmail,
    })
    .returning({
      id: quizSessions.id,
    });

  if (!individualSession) {
    throw new Error("Nao foi possivel criar a sessao individual.");
  }

  await db.insert(sessionEvents).values({
    sessionId: individualSession.id,
    eventType: "session.created",
    payload: {
      shareToken,
      quizId,
      quizVersionId: latestVersion.id,
      endsAt: endsAt.toISOString(),
      maxAttempts,
      mode: "individual",
      requireParticipantEmail,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/sessions/${individualSession.id}`);
}

async function notifyRealtimeSessionStart(params: {
  questions: ReturnType<typeof buildRuntimeQuestionsForSession> extends Promise<
    infer TValue
  >
    ? TValue
    : never;
  pin: string;
  sessionId: string;
}) {
  const response = await fetch(`${env.REALTIME_URL}/internal/session/start`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel avisar o servidor realtime.");
  }
}

export async function startLiveSession(
  _previousState: StartLiveSessionState,
  formData: FormData,
): Promise<StartLiveSessionState> {
  const session = await requireAuthSession();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    return { message: "Sessao invalida.", status: "error" };
  }

  const [liveSession] = await db
    .select({
      id: quizSessions.id,
      pin: quizSessions.pin,
      status: quizSessions.status,
      quizId: quizSessions.quizId,
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .where(
      and(
        eq(quizSessions.id, sessionId),
        eq(quizSessions.mode, "live"),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!liveSession?.pin) {
    return { message: "Sessao live nao encontrada.", status: "error" };
  }

  if (liveSession.status !== "waiting") {
    return {
      message: "Essa sessao nao esta mais em estado de espera.",
      status: "error",
    };
  }

  const runtimeQuestions = await buildRuntimeQuestionsForSession(
    liveSession.id,
  );

  if (runtimeQuestions.length === 0) {
    return {
      message: "Nao encontramos perguntas publicadas para iniciar essa sessao.",
      status: "error",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(quizSessions)
      .set({
        status: "countdown",
      })
      .where(eq(quizSessions.id, liveSession.id));

    await tx.insert(sessionEvents).values({
      sessionId: liveSession.id,
      eventType: "session.countdown_started",
      payload: {
        pin: liveSession.pin,
      },
    });
  });

  try {
    await notifyRealtimeSessionStart({
      questions: runtimeQuestions,
      pin: liveSession.pin,
      sessionId: liveSession.id,
    });
  } catch (error) {
    await db.transaction(async (tx) => {
      await tx
        .update(quizSessions)
        .set({
          status: "waiting",
        })
        .where(eq(quizSessions.id, liveSession.id));

      await tx.insert(sessionEvents).values({
        sessionId: liveSession.id,
        eventType: "session.start_sync_failed",
        payload: {
          pin: liveSession.pin,
          reason: error instanceof Error ? error.message : "unknown_error",
        },
      });
    });

    logger.error(
      {
        error,
        pin: liveSession.pin,
        sessionId: liveSession.id,
      },
      "session.start_sync_failed",
    );

    return {
      message: "Nao conseguimos sincronizar o countdown realtime agora.",
      status: "error",
    };
  }

  revalidatePath(`/dashboard/sessions/${liveSession.id}`);
  revalidatePath(`/live/${liveSession.pin}`);
  revalidatePath(`/live/${liveSession.pin}/lobby`);

  return {
    message: "Countdown iniciado. Os participantes ja vao avancar.",
    status: "success",
  };
}

async function notifyRealtimeAdvanceSession(params: {
  pin: string;
  sessionId: string;
}) {
  const response = await fetch(`${env.REALTIME_URL}/internal/session/next`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel avancar a sessao no realtime.");
  }
}

async function notifyRealtimeSkipQuestion(params: {
  pin: string;
  sessionId: string;
}) {
  const response = await fetch(`${env.REALTIME_URL}/internal/session/skip`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel pular a pergunta no realtime.");
  }
}

export async function advanceLiveSession(
  _previousState: StartLiveSessionState,
  formData: FormData,
): Promise<StartLiveSessionState> {
  const session = await requireAuthSession();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    return { message: "Sessao invalida.", status: "error" };
  }

  const liveSession = await getLiveSessionById(sessionId);

  if (!liveSession?.pin) {
    return { message: "Sessao live nao encontrada.", status: "error" };
  }

  const [authorizedSession] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, liveSession.quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!authorizedSession) {
    return { message: "Voce nao tem acesso a essa sessao.", status: "error" };
  }

  if (liveSession.status === "finished") {
    return {
      message: "Essa sessao ja foi encerrada.",
      status: "error",
    };
  }

  if (liveSession.status === "interrupted") {
    return {
      message:
        "Essa sessao esta em pausa operacional. Aguarde a retomada do host.",
      status: "error",
    };
  }

  try {
    await notifyRealtimeAdvanceSession({
      pin: liveSession.pin,
      sessionId: liveSession.id,
    });
  } catch (error) {
    await db.insert(sessionEvents).values({
      sessionId: liveSession.id,
      eventType: "session.advance_sync_failed",
      payload: {
        pin: liveSession.pin,
        status: liveSession.status,
        reason: error instanceof Error ? error.message : "unknown_error",
      },
    });

    logger.error(
      {
        error,
        pin: liveSession.pin,
        sessionId: liveSession.id,
        status: liveSession.status,
      },
      "session.advance_sync_failed",
    );

    return {
      message: "Nao conseguimos avancar para a proxima etapa agora.",
      status: "error",
    };
  }

  revalidatePath(`/dashboard/sessions/${liveSession.id}`);
  revalidatePath(`/live/${liveSession.pin}`);
  revalidatePath(`/live/${liveSession.pin}/lobby`);

  return {
    message:
      liveSession.status === "playing"
        ? "Rodada encerrada e resultado liberado."
        : liveSession.status === "question_result"
          ? "Sessao avancou para a proxima etapa."
          : "Sessao atualizada com sucesso.",
    status: "success",
  };
}

export async function skipLiveQuestion(
  _previousState: StartLiveSessionState,
  formData: FormData,
): Promise<StartLiveSessionState> {
  const session = await requireAuthSession();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    return { message: "Sessao invalida.", status: "error" };
  }

  const liveSession = await getLiveSessionById(sessionId);

  if (!liveSession?.pin || liveSession.status !== "playing") {
    return {
      message: "So e possivel pular uma pergunta em andamento.",
      status: "error",
    };
  }

  const [authorizedSession] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, liveSession.quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!authorizedSession) {
    return { message: "Voce nao tem acesso a essa sessao.", status: "error" };
  }

  const [latestQuestionEvent] = await db
    .select({
      payload: sessionEvents.payload,
    })
    .from(sessionEvents)
    .where(
      and(
        eq(sessionEvents.sessionId, liveSession.id),
        eq(sessionEvents.eventType, "session.question_started"),
      ),
    )
    .orderBy(desc(sessionEvents.createdAt))
    .limit(1);
  const latestQuestionPayload = latestQuestionEvent?.payload as
    | { questionIndex?: unknown }
    | undefined;
  const questionIndex =
    typeof latestQuestionPayload?.questionIndex === "number"
      ? latestQuestionPayload.questionIndex
      : null;
  const questionsSnapshot = Array.isArray(liveSession.questionsSnapshot)
    ? liveSession.questionsSnapshot
    : [];
  const skippedQuestion =
    questionIndex !== null ? questionsSnapshot[questionIndex] : null;
  const skippedQuestionData =
    skippedQuestion && typeof skippedQuestion === "object"
      ? (skippedQuestion as {
          content?: { question?: unknown };
          id?: unknown;
        })
      : null;

  try {
    await notifyRealtimeSkipQuestion({
      pin: liveSession.pin,
      sessionId: liveSession.id,
    });
  } catch (error) {
    logger.error(
      {
        error,
        pin: liveSession.pin,
        sessionId: liveSession.id,
      },
      "session.skip_sync_failed",
    );

    return {
      message: "Nao conseguimos pular essa pergunta agora.",
      status: "error",
    };
  }

  await db.insert(sessionEvents).values({
    sessionId: liveSession.id,
    eventType: "session.question_skipped",
    payload: {
      pin: liveSession.pin,
      questionId:
        typeof skippedQuestionData?.id === "string"
          ? skippedQuestionData.id
          : null,
      questionIndex,
      prompt:
        typeof skippedQuestionData?.content?.question === "string"
          ? skippedQuestionData.content.question
          : null,
    },
  });

  revalidatePath(`/dashboard/sessions/${liveSession.id}`);
  revalidatePath(`/live/${liveSession.pin}`);
  revalidatePath(`/live/${liveSession.pin}/lobby`);

  return {
    message: "Pergunta pulada.",
    status: "success",
  };
}

export async function restartLiveSession(
  _state: StartLiveSessionState,
  formData: FormData,
): Promise<StartLiveSessionState> {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await requireAuthSession();

  const [quizSession] = await db
    .select({ quizId: quizSessions.quizId })
    .from(quizSessions)
    .where(
      and(
        eq(quizSessions.id, sessionId),
        eq(quizSessions.hostId, session.user.id),
      ),
    )
    .limit(1);

  if (!quizSession) {
    return { status: "error", message: "Sessao nao encontrada." };
  }

  const proxyFormData = new FormData();
  proxyFormData.set("quizId", quizSession.quizId);
  await createLiveSession(proxyFormData);
  return { status: "idle" };
}

const SESSIONS_PAGE_SIZE = 50;

export async function loadMoreSessions(offset: number): Promise<{
  hasMore: boolean;
  sessions: Array<{
    createdAt: Date;
    endsAt: Date | null;
    expiresAt: Date | null;
    finishedAt: Date | null;
    id: string;
    mode: string;
    participantCount: number;
    pin: string | null;
    quizTitle: string;
    shareToken: string | null;
    startsAt: Date | null;
    status: string;
  }>;
  total: number;
}> {
  const session = await requireAuthSession();

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: quizSessions.id,
        pin: quizSessions.pin,
        shareToken: quizSessions.shareToken,
        mode: quizSessions.mode,
        status: quizSessions.status,
        createdAt: quizSessions.createdAt,
        startsAt: quizSessions.startsAt,
        endsAt: quizSessions.endsAt,
        expiresAt: quizSessions.expiresAt,
        finishedAt: quizSessions.finishedAt,
        quizTitle: quizzes.title,
        participantCount: count(participants.id),
      })
      .from(quizSessions)
      .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
      .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
      .where(eq(quizzes.organizationId, session.user.organizationId))
      .groupBy(quizSessions.id, quizzes.id)
      .orderBy(desc(quizSessions.createdAt))
      .limit(SESSIONS_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(quizSessions)
      .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
      .where(eq(quizzes.organizationId, session.user.organizationId)),
  ]);

  const total = totalRows[0]?.total ?? 0;

  return {
    hasMore: offset + rows.length < total,
    sessions: rows,
    total,
  };
}

export async function getSessionParticipantsForDashboard(sessionId: string) {
  await requireAuthSession();

  return db
    .select({
      id: participants.id,
      avatar: participants.avatar,
      nickname: participants.nickname,
      joinedAt: participants.joinedAt,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
    })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));
}

export async function deleteQuiz(formData: FormData) {
  const session = await requireAuthSession();
  const quizId = String(formData.get("quizId") ?? "");

  if (!quizId) {
    throw new Error("Quiz invalido.");
  }

  const [existingQuiz] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!existingQuiz) {
    throw new Error("Quiz nao encontrado.");
  }

  const sessionRows = await db
    .select({
      id: quizSessions.id,
      mode: quizSessions.mode,
      pin: quizSessions.pin,
      status: quizSessions.status,
    })
    .from(quizSessions)
    .where(eq(quizSessions.quizId, quizId));

  await terminateLiveSessionsBeforeDelete(
    sessionRows.filter((sessionRow) => sessionRow.mode === "live"),
  );

  const sessionIds = sessionRows.map((sessionRow) => sessionRow.id);

  await db.transaction(async (tx) => {
    await deleteSessionsCascade(tx, sessionIds);
    await tx.delete(quizVersions).where(eq(quizVersions.quizId, quizId));
    await tx.delete(questions).where(eq(questions.quizId, quizId));
    await tx.delete(quizzes).where(eq(quizzes.id, quizId));
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteSessions(
  _previousState: DeleteSessionsState,
  formData: FormData,
): Promise<DeleteSessionsState> {
  const session = await requireAuthSession();
  const scope = String(formData.get("scope") ?? "selected");
  const confirmationText = String(
    formData.get("confirmationText") ?? "",
  ).trim();
  const sessionIds = parseSessionIds(
    String(formData.get("sessionIds") ?? "[]"),
  );

  if (sessionIds.length === 0) {
    return {
      message: "Selecione pelo menos uma sessão para excluir.",
      status: "error",
    };
  }

  if (
    scope === "filtered" &&
    confirmationText !== destructiveConfirmationText
  ) {
    return {
      message: `Digite ${destructiveConfirmationText} para confirmar a exclusão em massa.`,
      status: "error",
    };
  }

  const sessionRows = await db
    .select({
      id: quizSessions.id,
      mode: quizSessions.mode,
      pin: quizSessions.pin,
      quizTitle: quizzes.title,
      status: quizSessions.status,
      participantCount: count(participants.id),
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
    .where(
      and(
        eq(quizzes.organizationId, session.user.organizationId),
        inArray(quizSessions.id, sessionIds),
      ),
    )
    .groupBy(quizSessions.id, quizzes.id);

  if (sessionRows.length !== sessionIds.length) {
    return {
      message:
        "Algumas sessões não foram encontradas ou não pertencem à sua organização.",
      status: "error",
    };
  }

  try {
    await terminateLiveSessionsBeforeDelete(
      sessionRows.filter((sessionRow) => sessionRow.mode === "live"),
    );
  } catch (error) {
    logger.error(
      {
        error,
        scope,
        sessionIds,
      },
      "session.bulk_delete_terminate_failed",
    );

    return {
      message:
        "Não conseguimos encerrar uma ou mais salas ao vivo antes da exclusão. Tente novamente.",
      status: "error",
    };
  }

  await db.transaction(async (tx) => {
    await deleteSessionsCascade(tx, sessionIds);
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/operacao");
  revalidatePath("/dashboard/resultados");

  return {
    deletedCount: sessionIds.length,
    message:
      sessionIds.length === 1
        ? `1 sessão foi excluída com sucesso.`
        : `${sessionIds.length} sessões foram excluídas com sucesso.`,
    status: "success",
  };
}
