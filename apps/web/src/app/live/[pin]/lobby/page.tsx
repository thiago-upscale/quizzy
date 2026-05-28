import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import {
  getLiveParticipantCookieName,
  getLiveSessionByPin,
  getParticipantByToken,
  getSessionParticipants,
  normalizeLiveBranding,
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
  const branding = normalizeLiveBranding(
    (liveSession.versionBranding ?? liveSession.quizBranding) as Partial<{
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      fontFamily: string;
    }>,
  );

  return (
    <LobbyClient
      branding={branding}
      initialParticipants={sessionParticipants.map((currentParticipant) => ({
        avatar: currentParticipant.avatar,
        id: currentParticipant.id,
        nickname: currentParticipant.nickname,
        score: currentParticipant.score,
        totalTimeMs: currentParticipant.totalTimeMs,
      }))}
      initialSessionStatus={liveSession.status}
      participant={{
        avatar: participant.avatar,
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
