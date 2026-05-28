import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { joinLiveSession } from "../actions";
import {
  canAccessLiveStatus,
  getLiveParticipantCookieName,
  getLiveSessionByPin,
  getParticipantByToken,
  isJoinableLiveStatus,
  normalizeLiveBranding,
} from "@/lib/live";

export const dynamic = "force-dynamic";

import { ParticipantEntryForm } from "./participant-entry-form";

export default async function LiveEntryPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const liveSession = await getLiveSessionByPin(pin);

  if (!liveSession) {
    return (
      <main className="min-h-screen bg-[#10233f] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
          <section className="rounded-[2rem] bg-white/10 p-8 text-center backdrop-blur">
            <h1 className="text-3xl font-semibold">Sessao nao encontrada</h1>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Confira o PIN ou volte para a tela de entrada manual.
            </p>
            <Link
              className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#10233f]"
              href="/join"
            >
              Inserir outro PIN
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const branding = normalizeLiveBranding(
    (liveSession.versionBranding ?? liveSession.quizBranding) as Partial<{
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      fontFamily: string;
    }>,
  );
  const cookieStore = await cookies();
  const participantToken = cookieStore.get(
    getLiveParticipantCookieName(pin),
  )?.value;

  if (participantToken) {
    const participant = await getParticipantByToken({
      participantToken,
      sessionId: liveSession.id,
    });

    if (participant && canAccessLiveStatus(liveSession.status)) {
      redirect(`/live/${pin}/lobby`);
    }
  }

  const isJoinable = isJoinableLiveStatus(liveSession.status);

  return (
    <main
      className="min-h-screen px-6 py-10 text-white"
      style={{
        background: `linear-gradient(180deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
        fontFamily: branding.fontFamily,
      }}
    >
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
        <section className="grid w-full gap-6 rounded-[2rem] bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur lg:grid-cols-[1fr_0.85fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
              Quiz ao vivo
            </p>
            <h1 className="mt-4 text-4xl font-semibold">
              {liveSession.versionTitle || liveSession.quizTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
              {liveSession.versionDescription ||
                liveSession.quizDescription ||
                "Entre na sala e aguarde o host iniciar a primeira pergunta."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                PIN {pin}
              </span>
              <span
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                style={{ backgroundColor: branding.accentColor }}
              >
                {liveSession.status}
              </span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-6">
            {isJoinable ? (
              <>
                <h2 className="text-2xl font-semibold">Entrar na sala</h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  O QR Code ja trouxe voce para a sessao certa. Agora falta so
                  se identificar.
                </p>
                <ParticipantEntryForm joinAction={joinLiveSession} pin={pin} />
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold">Sessao encerrada</h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Esta sessao nao esta mais recebendo novos participantes.
                </p>
                <Link
                  className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#10233f]"
                  href="/join"
                >
                  Tentar outro PIN
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
