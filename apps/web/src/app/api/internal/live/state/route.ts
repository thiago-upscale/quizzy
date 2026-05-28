import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quizSessions, sessionEvents } from "@/db/schema";
import { env } from "@/env";

type Payload = {
  questionIndex?: number;
  pin?: string;
  sessionId?: string;
  status?: string;
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

  const pin = payload.pin?.trim();
  const sessionId = payload.sessionId?.trim();
  const status = payload.status?.trim();
  const questionIndex =
    typeof payload.questionIndex === "number" ? payload.questionIndex : null;

  if (!pin || !sessionId || !status) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const [liveSession] = await db
    .select({
      id: quizSessions.id,
      status: quizSessions.status,
    })
    .from(quizSessions)
    .where(and(eq(quizSessions.id, sessionId), eq(quizSessions.pin, pin)))
    .limit(1);

  if (!liveSession) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  if (liveSession.status === status && questionIndex === null) {
    return NextResponse.json({ ok: true });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(quizSessions)
      .set({
        status,
        ...(status === "finished" ? { finishedAt: new Date() } : {}),
      })
      .where(eq(quizSessions.id, liveSession.id));

    const eventType =
      status === "playing" && questionIndex !== null
        ? "session.question_started"
        : status === "playing"
          ? "session.started"
          : status === "finished"
            ? "session.finished"
            : "session.state_updated";

    await tx.insert(sessionEvents).values({
      sessionId: liveSession.id,
      eventType,
      payload: {
        pin,
        questionIndex,
        status,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
