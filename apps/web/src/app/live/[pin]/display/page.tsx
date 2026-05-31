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
    <main className="flex min-h-screen flex-col bg-[#0d1b2a] text-white">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between px-10 py-4">
        <span className="text-xl font-bold tracking-tight">
          Quizzy<span className="text-[#f59e0b]">!</span>
        </span>
        <a
          className="rounded-full bg-[#f59e0b] px-5 py-2 text-sm font-bold text-[#0d1b2a] transition hover:bg-[#f7b534]"
          href={`/dashboard/sessions/${liveSession.id}`}
        >
          Painel do host
        </a>
      </header>

      <DisplayClient
        baseUrl={env.NEXTAUTH_URL}
        initialParticipants={initialParticipants}
        pin={pin}
        pinFormatted={pinFormatted}
        qrCodeDataUrl={qrCodeDataUrl}
        quizTitle={quizTitle}
        realtimeUrl={env.REALTIME_URL}
      />
    </main>
  );
}
