import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { answers, participants, sessionEvents } from "@/db/schema";
import { env } from "@/env";

type Payload = {
  answerIndex?: number;
  isCorrect?: boolean;
  participantToken?: string;
  pin?: string;
  pointsEarned?: number;
  questionId?: string;
  questionOrderIndex?: number;
  sessionId?: string;
  timeSpentMs?: number;
};

function isAuthorized(request: Request) {
  return (
    request.headers.get("x-quizzy-internal-token") ===
    env.REALTIME_INTERNAL_TOKEN
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const participantToken = payload.participantToken?.trim();
  const sessionId = payload.sessionId?.trim();
  const questionId = payload.questionId?.trim();
  const pin = payload.pin?.trim();
  const answerIndex = payload.answerIndex;
  const questionOrderIndex = payload.questionOrderIndex;
  const timeSpentMs = payload.timeSpentMs;
  const isCorrect = Boolean(payload.isCorrect);
  const pointsEarned =
    typeof payload.pointsEarned === "number" ? payload.pointsEarned : 0;

  if (
    !participantToken ||
    !sessionId ||
    typeof answerIndex !== "number" ||
    typeof questionOrderIndex !== "number" ||
    typeof timeSpentMs !== "number"
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const [participant] = await db
    .select({
      id: participants.id,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
    })
    .from(participants)
    .where(
      and(
        eq(participants.participantToken, participantToken),
        eq(participants.sessionId, sessionId),
      ),
    )
    .limit(1);

  if (!participant) {
    return NextResponse.json(
      { error: "participant_not_found" },
      { status: 404 },
    );
  }

  await db.transaction(async (tx) => {
    if (questionId && !questionId.startsWith("virtual-")) {
      const [existingAnswer] = await tx
        .select({ id: answers.id })
        .from(answers)
        .where(
          and(
            eq(answers.sessionId, sessionId),
            eq(answers.participantId, participant.id),
            eq(answers.questionId, questionId),
          ),
        )
        .limit(1);

      if (!existingAnswer) {
        await tx.insert(answers).values({
          participantId: participant.id,
          questionId,
          sessionId,
          answer: { index: answerIndex },
          timeSpentMs,
          isCorrect,
          pointsEarned,
        });
      }
    }

    await tx
      .update(participants)
      .set({
        score: participant.score + pointsEarned,
        totalTimeMs: participant.totalTimeMs + timeSpentMs,
      })
      .where(eq(participants.id, participant.id));

    await tx.insert(sessionEvents).values({
      sessionId,
      eventType: "participant.answered",
      payload: {
        answerIndex,
        isCorrect,
        participantId: participant.id,
        pin,
        pointsEarned,
        questionId,
        questionOrderIndex,
        timeSpentMs,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
