import { cookies } from "next/headers";
import Link from "next/link";
import { joinLiveSession } from "../actions";
import { brandingSurfaceStyle } from "@/lib/branding-theme";
import {
  canAccessLiveStatus,
  getLiveParticipantCookieName,
  getLiveSessionByPin,
  getParticipantByToken,
  isJoinableLiveStatus,
  resolveLiveBranding,
} from "@/lib/live";
import { ParticipantEntryForm } from "./participant-entry-form";

export const dynamic = "force-dynamic";

export default async function LiveEntryPage({
  params,
}: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await params;
  const liveSession = await getLiveSessionByPin(pin);

  if (!liveSession) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,_#10233f_0%,_#0f766e_100%)] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
            <h1 className="text-3xl font-semibold">Sessão não encontrada</h1>
            <p className="mt-3 text-sm leading-7 text-white/75">
              PIN inválido ou sala indisponível. Revise os 6 dígitos com o host
              ou volte para a entrada manual.
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

  const branding = resolveLiveBranding({
    quizBranding: liveSession.quizBranding,
    versionBranding: liveSession.versionBranding,
  });
  const cookieStore = await cookies();
  const participantToken = cookieStore.get(
    getLiveParticipantCookieName(pin),
  )?.value;
  let returningParticipant: Awaited<
    ReturnType<typeof getParticipantByToken>
  > | null = null;

  if (participantToken) {
    returningParticipant = await getParticipantByToken({
      participantToken,
      sessionId: liveSession.id,
    });
  }

  const isJoinable = isJoinableLiveStatus(liveSession.status);
  const canResume =
    Boolean(returningParticipant) && canAccessLiveStatus(liveSession.status);
  const sessionStatusLabel =
    liveSession.status === "waiting"
      ? "Aguardando início"
      : liveSession.status === "countdown"
        ? "Contagem regressiva"
        : liveSession.status === "playing"
          ? "Pergunta em andamento"
          : liveSession.status === "question_result"
            ? "Resultado da rodada"
            : liveSession.status === "interrupted"
              ? "Pausa operacional"
              : "Sessão encerrada";

  return (
    <main
      className="min-h-screen px-4 py-4 text-white sm:px-6 sm:py-8"
      style={brandingSurfaceStyle(branding)}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur sm:p-6">
          <div className="rounded-[1.6rem] bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo do quiz"
                  className="h-10 w-auto rounded-xl bg-white/10 p-2"
                  src={branding.logoUrl}
                />
              ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Quiz ao vivo
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-[1.05] tracking-[-0.03em]">
                {liveSession.versionTitle || liveSession.quizTitle}
              </h1>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  PIN {pin}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  {sessionStatusLabel}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/72">
                {branding.welcomeMessage ||
                  "Confirme como quer aparecer para o host e entre na sala."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.7rem] bg-white p-5 text-[var(--quizzy-text)] shadow-[0_18px_50px_rgba(16,35,63,0.14)]">
            {canResume ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--quizzy-teal)]">
                  Retomada segura
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight">
                  Continuar como{" "}
                  <span className="font-semibold text-[var(--quizzy-text)]">
                    {returningParticipant?.nickname}
                  </span>
                  .
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--quizzy-muted)]">
                  Seu acesso anterior foi preservado e você pode voltar direto
                  para o estado atual da sala.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="inline-flex items-center justify-center rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white"
                    href={`/live/${pin}/lobby`}
                  >
                    Retomar agora
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-[var(--quizzy-border)] px-5 py-3 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)]"
                    href="/join"
                  >
                    Voltar ao início
                  </Link>
                </div>
              </>
            ) : isJoinable ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--quizzy-teal)]">
                  Identificação
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight">
                  Entrar na sala
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--quizzy-muted)]">
                  Digite seu nome para aparecer no quiz.
                </p>
                <ParticipantEntryForm
                  joinAction={joinLiveSession}
                  pin={pin}
                  requireEmail={liveSession.requireParticipantEmail}
                />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--quizzy-warning)]">
                  Entrada indisponível
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight">
                  Sessão encerrada ou pausada
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--quizzy-muted)]">
                  Esta sala não está recebendo novos participantes agora. Se o
                  evento continua, peça um novo PIN ao host.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white"
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
