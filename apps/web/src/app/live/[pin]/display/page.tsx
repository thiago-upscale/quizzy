import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { env } from "@/env";
import {
  getLiveSessionByPin,
  getSessionParticipants,
  normalizeLiveBranding,
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
  const branding = normalizeLiveBranding(
    (liveSession.versionBranding ?? liveSession.quizBranding) as Parameters<typeof normalizeLiveBranding>[0],
  );

  const mainStyle = branding.backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(16,35,63,0.82) 0%, rgba(0,0,0,0.65) 100%), url(${branding.backgroundImageUrl})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : { backgroundColor: branding.secondaryColor };

  return (
    <main className="flex min-h-screen flex-col text-white" style={mainStyle}>
      <DisplayClient
        baseUrl={env.NEXTAUTH_URL}
        branding={branding}
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
