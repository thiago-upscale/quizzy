import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import {
  getLiveParticipantCookieName,
  getLiveSessionByPin,
  getParticipantByToken,
  getSessionParticipants,
  resolveLiveBranding,
} from "@/lib/live";
import { LobbyClient } from "./lobby-client";

export const dynamic = "force-dynamic";

export default async function LiveLobbyPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const liveSession = await getLiveSessionByPin(pin);

  if (!liveSession) {
    redirect("/join");
  }

  const cookieStore = await cookies();
  const participantToken = cookieStore.get(
    getLiveParticipantCookieName(pin),
  )?.value;

  if (!participantToken) {
    redirect(`/live/${pin}`);
  }

  const participant = await getParticipantByToken({
    participantToken,
    sessionId: liveSession.id,
  });

  if (!participant) {
    redirect(`/live/${pin}`);
  }

  const sessionParticipants = await getSessionParticipants(liveSession.id);
  const branding = resolveLiveBranding({
    quizBranding: liveSession.quizBranding,
    versionBranding: liveSession.versionBranding,
  });

  return (
    <LobbyClient
      branding={branding}
      initialParticipants={sessionParticipants.map((currentParticipant) => ({
        avatar: currentParticipant.avatar,
        currentStreak: currentParticipant.currentStreak,
        id: currentParticipant.id,
        nickname: currentParticipant.nickname,
        presenceStatus: "offline",
        score: currentParticipant.score,
        totalTimeMs: currentParticipant.totalTimeMs,
      }))}
      initialSessionStatus={liveSession.status}
      participant={{
        avatar: participant.avatar,
        currentStreak: participant.currentStreak,
        id: participant.id,
        nickname: participant.nickname,
        participantToken: participant.participantToken,
        score: participant.score,
        totalTimeMs: participant.totalTimeMs,
      }}
      pin={pin}
      quizTitle={liveSession.versionTitle || liveSession.quizTitle}
      realtimeUrl={env.REALTIME_URL}
    />
  );
}
