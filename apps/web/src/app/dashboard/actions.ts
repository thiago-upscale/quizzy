"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import {
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
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correctIndex: number;
  imageUrl?: string | null;
  timeLimitSeconds: number;
};

type BrandingPayload = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  logoUrl: string | null;
};

export type SaveQuizState = {
  message?: string;
  status: "idle" | "success" | "error";
};

export type StartLiveSessionState = {
  message?: string;
  status: "idle" | "success" | "error";
};

const defaultBranding: BrandingPayload = {
  primaryColor: "#0f766e",
  secondaryColor: "#10233f",
  accentColor: "#f59e0b",
  fontFamily: "Manrope",
  backgroundImageUrl: null,
  logoUrl: null,
};

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
    logoUrl: sanitizeAssetUrl(branding.logoUrl),
  };
}

function normalizeQuestions(parsedQuestions: QuestionPayload[]) {
  return parsedQuestions
    .map((question, index) => ({
      orderIndex: index,
      type: question.type,
      content: {
        question: question.question.trim(),
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
    }))
    .filter(
      (question) =>
        question.content.question.length > 0 &&
        question.content.options.length >= 2,
    );
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

  if (!quizId || !title) {
    return { message: "Quiz invalido.", status: "error" };
  }

  const [existingQuiz] = await db
    .select({
      id: quizzes.id,
      organizationId: quizzes.organizationId,
      createdBy: quizzes.createdBy,
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

  const nextStatus = intent === "publish" ? "published" : "draft";

  await db.transaction(async (tx) => {
    await tx
      .update(quizzes)
      .set({
        title,
        description,
        branding,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId));

    await tx.delete(questions).where(eq(questions.quizId, quizId));

    await tx.insert(questions).values(
      normalizedQuestions.map((question) => ({
        quizId,
        orderIndex: question.orderIndex,
        type: question.type,
        content: question.content,
        correctAnswer: question.correctAnswer,
        timeLimitSeconds: question.timeLimitSeconds,
      })),
    );

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
        title,
        description,
        branding,
        questionsSnapshot: normalizedQuestions,
        createdBy: existingQuiz.createdBy,
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/quizzes/${quizId}`);

  return {
    message:
      intent === "publish"
        ? "Versao publicada com sucesso."
        : "Rascunho salvo com sucesso.",
    status: "success",
  };
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createLiveSession(formData: FormData) {
  const session = await requireAuthSession();
  const quizId = String(formData.get("quizId") ?? "");

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
