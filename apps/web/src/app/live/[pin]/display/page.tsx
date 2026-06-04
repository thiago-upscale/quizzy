import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { env } from "@/env";
import {
  getLiveSessionByPin,
  getSessionParticipants,
} from "@/lib/live";
import { DisplayClient } from "./display-client";

export const dynamic = "force-dynamic";

export default async function LiveDisplayPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const liveSession = await getLiveSessionByPin(pin);

  if (!liveSession) {
    redirect("/join");
  }

  const sessionUrl = `${env.NEXTAUTH_URL}/live/${pin}`;
  const qrCodeDataUrl = await QRCode.toDataURL(sessionUrl, {
    color: { dark: "#ffffff", light: "#00000000" },
    margin: 1,
    width: 260,
  });

  const sessionParticipants = await getSessionParticipants(liveSession.id);
  const initialParticipants = sessionParticipants.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    presenceStatus: "offline" as const,
  }));

  const quizTitle = liveSession.versionTitle || liveSession.quizTitle;
  const pinFormatted = `${pin.slice(0, 3)} ${pin.slice(3)}`;

  return (
    <main className="flex min-h-screen flex-col bg-[#1a1f3c] text-white">
      <DisplayClient
        baseUrl={env.NEXTAUTH_URL}
        initialParticipants={initialParticipants}
        pin={pin}
        pinFormatted={pinFormatted}
        qrCodeDataUrl={qrCodeDataUrl}
        quizTitle={quizTitle}
        realtimeUrl={env.REALTIME_URL}
        sessionId={liveSession.id}
      />
    </main>
  );
}
