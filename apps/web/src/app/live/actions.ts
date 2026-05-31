"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";
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
import { logger } from "@/lib/logger";
import {
  clearFailedPinEntries,
  getPinEntryLimitConfig,
  isPinEntryRateLimited,
  registerFailedPinEntry,
} from "@/lib/pin-entry-rate-limit";

export type JoinLiveState = {
  message?: string;
  status: "idle" | "error";
};

function buildClientIdentifier(rawAddress: string | null) {
  return createHash("sha256")
    .update(rawAddress?.trim() || "unknown")
    .digest("hex")
    .slice(0, 16);
}

async function getClientIdentifier() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const firstForwarded =
    forwardedFor?.split(",").map((value) => value.trim())[0] ?? null;

  return buildClientIdentifier(firstForwarded || realIp);
}

export async function joinLiveSession(
  _previousState: JoinLiveState,
  formData: FormData,
): Promise<JoinLiveState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const clientIdentifier = await getClientIdentifier();

  if (!pin || nickname.length < 2) {
    return {
      message:
        "Informe um PIN valido e um nickname com pelo menos 2 caracteres.",
      status: "error",
    };
  }

  if (isPinEntryRateLimited(clientIdentifier)) {
    const { maxFailedAttempts, windowMs } = getPinEntryLimitConfig();

    logger.warn(
      {
        clientIdentifier,
        maxFailedAttempts,
        pin,
        reason: "pin_rate_limited",
        windowMs,
      },
      "pin.entry_rate_limited",
    );

    return {
      message: "Muitas tentativas. Tente novamente em instantes.",
      status: "error",
    };
  }

  const liveSession = await getLiveSessionByPin(pin);

  if (!liveSession) {
    const failedAttempts = registerFailedPinEntry(clientIdentifier);

    logger.warn(
      {
        clientIdentifier,
        failedAttempts,
        pin,
        reason: "session_not_found",
      },
      "pin.entry_failed",
    );

    return {
      message: "PIN invalido. Verifique os 6 digitos com o host.",
      status: "error",
    };
  }

  if (!isJoinableLiveStatus(liveSession.status)) {
    const failedAttempts = registerFailedPinEntry(clientIdentifier);

    logger.warn(
      {
        clientIdentifier,
        failedAttempts,
        pin,
        reason: "session_closed_for_entry",
        status: liveSession.status,
      },
      "pin.entry_failed",
    );

    return {
      message:
        liveSession.status === "finished"
          ? "Essa sessao encerrou. Se o quiz continua, peca um novo PIN ao host."
          : liveSession.status === "interrupted"
            ? "A sala esta em pausa operacional. Aguarde o host retomar a sessao."
            : "Essa sessao nao esta aceitando novas entradas agora.",
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
      message:
        "Esse nickname ja esta em uso nesta sessao. Tente uma variacao para entrar sem conflito.",
      status: "error",
    };
  }

  const normalizedEmail = normalizeParticipantEmail(email);
  const participantToken = crypto.randomUUID().replaceAll("-", "");
  clearFailedPinEntries(clientIdentifier);

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
      message: "Nao foi possivel conectar. Tente novamente.",
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
