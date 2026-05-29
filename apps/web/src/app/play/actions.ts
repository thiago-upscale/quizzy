"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  answers,
  attempts,
  participants,
  questions,
  sessionEvents,
} from "@/db/schema";
import {
  buildIndividualQuestionsForSession,
  getIndividualParticipantCookieName,
  getIndividualSessionByShareToken,
  isIndividualSessionExpired,
} from "@/lib/individual";
import { getAvatarForNickname, normalizeParticipantEmail } from "@/lib/live";

export type IndividualEntryState = {
  message?: string;
  status: "idle" | "error";
};

export type IndividualQuestionState = {
  message?: string;
  status: "idle" | "error";
};

const initialState = {
  status: "idle",
} satisfies IndividualEntryState;

function buildPlayPath(shareToken: string) {
  return `/play/${shareToken}`;
}

async function getCurrentParticipantForSession(shareToken: string) {
  const session = await getIndividualSessionByShareToken(shareToken);

  if (!session) {
    return { participant: null, session: null };
  }

  const cookieStore = await cookies();
  const participantToken = cookieStore.get(
    getIndividualParticipantCookieName(shareToken),
  )?.value;

  if (!participantToken) {
    return { participant: null, session };
  }

  const [participant] = await db
    .select({
      email: participants.email,
      finishedAt: participants.finishedAt,
      id: participants.id,
      nickname: participants.nickname,
      participantToken: participants.participantToken,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
    })
    .from(participants)
    .where(
      and(
        eq(participants.sessionId, session.id),
        eq(participants.participantToken, participantToken),
      ),
    )
    .limit(1);

  return { participant: participant ?? null, session };
}

export async function joinIndividualSession(
  previousState: IndividualEntryState = initialState,
  formData: FormData,
): Promise<IndividualEntryState> {
  void previousState;
  const shareToken = String(formData.get("shareToken") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "");

  if (!shareToken || nickname.length < 2) {
    return {
      message: "Informe um apelido com pelo menos 2 caracteres.",
      status: "error",
    };
  }

  const session = await getIndividualSessionByShareToken(shareToken);

  if (!session) {
    return {
      message: "Sessao individual nao encontrada.",
      status: "error",
    };
  }

  if (isIndividualSessionExpired(session)) {
    return {
      message: "O prazo desta sessao individual ja foi encerrado.",
      status: "error",
    };
  }

  const normalizedEmail = normalizeParticipantEmail(email);

  if (session.requireParticipantEmail && !normalizedEmail) {
    return {
      message: "Esta sessao exige um email valido para iniciar.",
      status: "error",
    };
  }

  if (session.requireParticipantEmail && normalizedEmail) {
    const [existingParticipantByEmail] = await db
      .select({
        id: participants.id,
        participantToken: participants.participantToken,
      })
      .from(participants)
      .where(
        and(
          eq(participants.sessionId, session.id),
          eq(participants.emailNormalized, normalizedEmail),
        ),
      )
      .limit(1);

    if (existingParticipantByEmail) {
      const cookieStore = await cookies();
      cookieStore.set(
        getIndividualParticipantCookieName(shareToken),
        existingParticipantByEmail.participantToken,
        {
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 14,
          path: buildPlayPath(shareToken),
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
      );

      revalidatePath(buildPlayPath(shareToken));
      redirect(buildPlayPath(shareToken));
    }
  }

  const [existingNickname] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.sessionId, session.id),
        eq(participants.nickname, nickname),
      ),
    )
    .limit(1);

  if (existingNickname) {
    return {
      message: "Esse apelido ja esta em uso nesta sessao.",
      status: "error",
    };
  }

  const participantToken = crypto.randomUUID().replaceAll("-", "");
  const [participant] = await db
    .insert(participants)
    .values({
      avatar: getAvatarForNickname(nickname),
      email: normalizedEmail,
      emailNormalized: normalizedEmail,
      nickname,
      participantToken,
      sessionId: session.id,
    })
    .returning({
      id: participants.id,
    });

  if (!participant) {
    return {
      message: "Nao foi possivel iniciar sua tentativa agora.",
      status: "error",
    };
  }

  await db.insert(attempts).values({
    attemptNumber: 1,
    participantId: participant.id,
    sessionId: session.id,
    status: "in_progress",
  });

  await db.insert(sessionEvents).values({
    eventType: "participant.joined",
    payload: {
      email: normalizedEmail,
      nickname,
      participantId: participant.id,
      shareToken,
    },
    sessionId: session.id,
  });

  const cookieStore = await cookies();
  cookieStore.set(getIndividualParticipantCookieName(shareToken), participantToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: buildPlayPath(shareToken),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath(buildPlayPath(shareToken));
  redirect(buildPlayPath(shareToken));
}

export async function submitIndividualAnswer(
  previousState: IndividualQuestionState = initialState,
  formData: FormData,
): Promise<IndividualQuestionState> {
  void previousState;
  const shareToken = String(formData.get("shareToken") ?? "").trim();
  const questionOrderIndex = Number(formData.get("questionOrderIndex") ?? -1);
  const answerIndex = Number(formData.get("answerIndex") ?? -1);
  const startedAt = Number(formData.get("startedAt") ?? Date.now());

  if (!shareToken || questionOrderIndex < 0 || answerIndex < 0) {
    return {
      message: "Nao conseguimos registrar essa resposta.",
      status: "error",
    };
  }

  const { participant, session } = await getCurrentParticipantForSession(
    shareToken,
  );

  if (!session || !participant) {
    return {
      message: "Sua identificacao expirou. Entre novamente para continuar.",
      status: "error",
    };
  }

  if (isIndividualSessionExpired(session)) {
    return {
      message: "O prazo desta sessao individual ja foi encerrado.",
      status: "error",
    };
  }

  const [latestAttempt] = await db
    .select({
      attemptNumber: attempts.attemptNumber,
      id: attempts.id,
      score: attempts.score,
      status: attempts.status,
      totalTimeMs: attempts.totalTimeMs,
    })
    .from(attempts)
    .where(eq(attempts.participantId, participant.id))
    .orderBy(desc(attempts.attemptNumber))
    .limit(1);

  if (!latestAttempt || latestAttempt.status !== "in_progress") {
    return {
      message: "Nenhuma tentativa em andamento foi encontrada.",
      status: "error",
    };
  }

  const individualQuestions = await buildIndividualQuestionsForSession({
    questionsSnapshot: session.questionsSnapshot,
    quizId: session.quizId,
  });
  const question = individualQuestions[questionOrderIndex];

  if (!question?.id || answerIndex >= question.options.length) {
    return {
      message: "Pergunta invalida para esta sessao.",
      status: "error",
    };
  }

  const [existingAnswer] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(
      and(
        eq(answers.attemptId, latestAttempt.id),
        eq(answers.questionId, question.id),
      ),
    )
    .limit(1);

  if (existingAnswer) {
    redirect(buildPlayPath(shareToken));
  }

  const timeSpentMs = Math.max(
    0,
    Math.min(30 * 60 * 1000, Date.now() - startedAt),
  );
  const isCorrect = answerIndex === question.correctIndex;
  const speedFactor = Math.max(
    0.25,
    1 - timeSpentMs / Math.max(1, question.timeLimitSeconds * 1000),
  );
  const pointsEarned = isCorrect
    ? Math.max(100, Math.round(question.pointsBase * speedFactor))
    : 0;
  const nextAttemptScore = latestAttempt.score + pointsEarned;
  const nextAttemptTime = latestAttempt.totalTimeMs + timeSpentMs;

  const attemptAnswerRows = await db
    .select({
      orderIndex: questions.orderIndex,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .where(eq(answers.attemptId, latestAttempt.id))
    .orderBy(asc(questions.orderIndex));

  const willFinishAttempt =
    attemptAnswerRows.length + 1 >= individualQuestions.length;

  await db.transaction(async (tx) => {
    await tx.insert(answers).values({
      answer: { index: answerIndex },
      attemptId: latestAttempt.id,
      isCorrect,
      participantId: participant.id,
      pointsEarned,
      questionId: question.id!,
      sessionId: session.id,
      timeSpentMs,
    });

    await tx
      .update(attempts)
      .set({
        finishedAt: willFinishAttempt ? new Date() : null,
        score: nextAttemptScore,
        status: willFinishAttempt ? "finished" : "in_progress",
        totalTimeMs: nextAttemptTime,
      })
      .where(eq(attempts.id, latestAttempt.id));

    const shouldPromoteScore =
      nextAttemptScore > participant.score ||
      (nextAttemptScore === participant.score &&
        (participant.totalTimeMs === 0 || nextAttemptTime < participant.totalTimeMs));

    await tx
      .update(participants)
      .set({
        finishedAt: willFinishAttempt ? new Date() : participant.finishedAt,
        score: shouldPromoteScore ? nextAttemptScore : participant.score,
        totalTimeMs: shouldPromoteScore
          ? nextAttemptTime
          : participant.totalTimeMs,
      })
      .where(eq(participants.id, participant.id));

    if (willFinishAttempt) {
      await tx.insert(sessionEvents).values({
        eventType: "attempt.finished",
        payload: {
          attemptId: latestAttempt.id,
          attemptNumber: latestAttempt.attemptNumber,
          participantId: participant.id,
          score: nextAttemptScore,
          shareToken,
        },
        sessionId: session.id,
      });
    }
  });

  revalidatePath(buildPlayPath(shareToken));
  redirect(buildPlayPath(shareToken));
}

export async function startNextIndividualAttempt(formData: FormData) {
  const shareToken = String(formData.get("shareToken") ?? "").trim();
  const { participant, session } = await getCurrentParticipantForSession(
    shareToken,
  );

  if (!session || !participant || isIndividualSessionExpired(session)) {
    redirect(buildPlayPath(shareToken));
  }

  const participantAttempts = await db
    .select({
      attemptNumber: attempts.attemptNumber,
      id: attempts.id,
      status: attempts.status,
    })
    .from(attempts)
    .where(eq(attempts.participantId, participant.id))
    .orderBy(desc(attempts.attemptNumber));

  const latestAttempt = participantAttempts[0];
  const attemptsUsed = participantAttempts.length;

  if (
    !latestAttempt ||
    latestAttempt.status !== "finished" ||
    attemptsUsed >= session.maxAttempts
  ) {
    redirect(buildPlayPath(shareToken));
  }

  const [nextAttempt] = await db
    .insert(attempts)
    .values({
      attemptNumber: latestAttempt.attemptNumber + 1,
      participantId: participant.id,
      sessionId: session.id,
      status: "in_progress",
    })
    .returning({ id: attempts.id });

  if (nextAttempt) {
    await db.insert(sessionEvents).values({
      eventType: "attempt.started",
      payload: {
        attemptId: nextAttempt.id,
        attemptNumber: latestAttempt.attemptNumber + 1,
        participantId: participant.id,
        shareToken,
      },
      sessionId: session.id,
    });
  }

  revalidatePath(buildPlayPath(shareToken));
  redirect(buildPlayPath(shareToken));
}
