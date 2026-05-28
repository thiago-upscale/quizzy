"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants, sessionEvents } from "@/db/schema";
import {
  getAvatarForNickname,
  getLiveParticipantCookieName,
  getLiveSessionByPin,
  isJoinableLiveStatus,
  normalizeParticipantEmail,
} from "@/lib/live";

export type JoinLiveState = {
  message?: string;
  status: "idle" | "error";
};

export async function joinLiveSession(
  _previousState: JoinLiveState,
  formData: FormData,
): Promise<JoinLiveState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "");

  if (!pin || nickname.length < 2) {
    return {
      message:
        "Informe um PIN valido e um nickname com pelo menos 2 caracteres.",
      status: "error",
    };
  }

  const liveSession = await getLiveSessionByPin(pin);

  if (!liveSession || !isJoinableLiveStatus(liveSession.status)) {
    return {
      message: "Essa sessao nao esta disponivel para entrada agora.",
      status: "error",
    };
  }

  const existingNickname = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.sessionId, liveSession.id),
        eq(participants.nickname, nickname),
      ),
    )
    .limit(1);

  if (existingNickname.length > 0) {
    return {
      message: "Esse nickname ja esta em uso nesta sessao.",
      status: "error",
    };
  }

  const normalizedEmail = normalizeParticipantEmail(email);
  const participantToken = crypto.randomUUID().replaceAll("-", "");

  const [participant] = await db
    .insert(participants)
    .values({
      sessionId: liveSession.id,
      nickname,
      email: normalizedEmail,
      emailNormalized: normalizedEmail,
      avatar: getAvatarForNickname(nickname),
      participantToken,
    })
    .returning({
      id: participants.id,
    });

  if (!participant) {
    return {
      message: "Nao foi possivel entrar na sessao agora.",
      status: "error",
    };
  }

  await db.insert(sessionEvents).values({
    sessionId: liveSession.id,
    eventType: "participant.joined",
    payload: {
      participantId: participant.id,
      nickname,
      email: normalizedEmail,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(getLiveParticipantCookieName(pin), participantToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/live/${pin}`,
    maxAge: 60 * 60 * 4,
  });

  revalidatePath(`/live/${pin}`);
  revalidatePath(`/live/${pin}/lobby`);
  redirect(`/live/${pin}/lobby`);
}
