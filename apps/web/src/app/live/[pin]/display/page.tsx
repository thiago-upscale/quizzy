import Image from "next/image";
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

  // Format PIN as "XXX XXX" for readability
  const pinFormatted = `${pin.slice(0, 3)} ${pin.slice(3)}`;

  return (
    <main className="flex min-h-screen flex-col bg-[#0d1b2a] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-10 py-6">
        <span className="text-xl font-bold tracking-tight">
          Quizzy<span className="text-[#f59e0b]">!</span>
        </span>
        <a
          className="rounded-full bg-[#f59e0b] px-6 py-2 text-sm font-bold text-[#0d1b2a] transition hover:bg-[#f7b534]"
          href={`/dashboard/sessions/${liveSession.id}`}
        >
          Painel do host
        </a>
      </header>

      {/* Main content */}
      <div className="flex flex-1 gap-0">
        {/* Left — QR + PIN */}
        <aside className="flex w-72 flex-col items-center justify-center gap-8 bg-[#0a1520] px-8 py-10">
          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Entrar
            </p>
            <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <Image
                alt="QR code da sessão"
                className="h-auto w-full"
                height={260}
                src={qrCodeDataUrl}
                width={260}
              />
            </div>
          </div>

          <div className="w-full text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              PIN do jogo
            </p>
            <p className="mt-3 text-5xl font-black tracking-[0.14em] text-white">
              {pinFormatted}
            </p>
            <p className="mt-3 text-xs leading-5 text-white/30">
              Acesse <span className="text-white/50">{env.NEXTAUTH_URL.replace(/^https?:\/\//, "")}</span>
            </p>
          </div>
        </aside>

        {/* Center — quiz title */}
        <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/35">
            Tudo pronto para começar?
          </p>
          <h1 className="mt-6 text-6xl font-black leading-tight text-white">
            {quizTitle}
          </h1>
          <p className="mt-6 text-base text-white/40">
            Escaneie o QR code ou acesse pelo PIN para entrar na sala.
          </p>
        </div>

        {/* Right — participants */}
        <aside className="w-72 overflow-y-auto bg-[#0a1520] px-8 py-10">
          <DisplayClient
            initialParticipants={initialParticipants}
            pin={pin}
            realtimeUrl={env.REALTIME_URL}
          />
        </aside>
      </div>
    </main>
  );
}
