import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getAuthSession } from "@/auth/session";
import { env } from "@/env";
import { brandingSurfaceStyle } from "@/lib/branding-theme";
import {
  getLiveSessionByPin,
  getSessionParticipants,
  resolveLiveBranding,
} from "@/lib/live";
import { DisplayClient } from "./display-client";

export const dynamic = "force-dynamic";

export default async function LiveDisplayPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const [liveSession, authSession] = await Promise.all([
    getLiveSessionByPin(pin),
    getAuthSession(),
  ]);

  if (!liveSession) {
    redirect("/join");
  }

  const sessionUrl = `${env.NEXTAUTH_URL}/live/${pin}`;
  const qrCodeDataUrl = await QRCode.toDataURL(sessionUrl, {
    color: { dark: "#0f172a", light: "#ffffff" },
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
  const branding = resolveLiveBranding({
    quizBranding: liveSession.quizBranding,
    versionBranding: liveSession.versionBranding,
  });
  const canControlSession =
    authSession?.user?.organizationId === liveSession.quizOrganizationId;

  return (
    <main
      className="flex min-h-screen flex-col text-white"
      style={brandingSurfaceStyle(branding)}
    >
      <DisplayClient
        baseUrl={env.NEXTAUTH_URL}
        branding={branding}
        canControlSession={canControlSession}
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
