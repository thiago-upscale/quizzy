import { NextResponse } from "next/server";
import { env } from "@/env";
import { buildLiveRecoverySnapshot } from "@/lib/live";

function isAuthorized(request: Request) {
  return (
    request.headers.get("x-quizzy-internal-token") ===
    env.REALTIME_INTERNAL_TOKEN
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin")?.trim();
  const sessionId = searchParams.get("sessionId")?.trim();

  if (!pin && !sessionId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const snapshot = await buildLiveRecoverySnapshot({
    pin: pin ?? undefined,
    sessionId: sessionId ?? undefined,
  });

  if (!snapshot) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
