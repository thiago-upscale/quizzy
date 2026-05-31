import { cookies } from "next/headers";
import Link from "next/link";
import { joinLiveSession } from "../actions";
import {
  canAccessLiveStatus,
  getLiveParticipantCookieName,
  getLiveSessionByPin,
  getParticipantByToken,
  isJoinableLiveStatus,
  normalizeLiveBranding,
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
            <h1 className="text-3xl font-semibold">Sessao nao encontrada</h1>
            <p className="mt-3 text-sm leading-7 text-white/75">
              PIN invalido ou sala indisponivel. Revise os 6 digitos com o host
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
      ? "Aguardando inicio"
      : liveSession.status === "countdown"
        ? "Contagem regressiva"
        : liveSession.status === "playing"
          ? "Pergunta em andamento"
          : liveSession.status === "question_result"
            ? "Resultado da rodada"
            : liveSession.status === "interrupted"
              ? "Pausa operacional"
              : "Sessao encerrada";

  return (
    <main
      className="min-h-screen px-6 py-10 text-white"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `linear-gradient(180deg, rgba(16,35,63,0.84) 0%, rgba(15,118,110,0.84) 100%), url(${branding.backgroundImageUrl})`
          : `linear-gradient(180deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        fontFamily: branding.fontFamily,
      }}
    >
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
        <section className="grid w-full gap-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur lg:grid-cols-[1fr_0.92fr]">
          <div className="flex flex-col justify-between">
            <div>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo do quiz"
                  className="h-14 w-auto rounded-xl bg-white/10 p-2"
                  src={branding.logoUrl}
                />
              ) : null}
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                Quiz ao vivo
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">
                {liveSession.versionTitle || liveSession.quizTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
                {liveSession.versionDescription ||
                  liveSession.quizDescription ||
                  "Entre na sala, confirme sua identificacao e aguarde o host iniciar a primeira pergunta."}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  PIN
                </p>
                <p className="mt-2 text-lg font-semibold">{pin}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Estado
                </p>
                <p className="mt-2 text-sm font-semibold">{sessionStatusLabel}</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Fluxo
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {canResume ? "Retomada" : "Identificacao"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.85rem] bg-white p-6 text-[var(--quizzy-text)] shadow-[0_18px_50px_rgba(16,35,63,0.14)]">
            {canResume ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
                  Retomada segura
                </p>
                <h2 className="mt-4 text-3xl font-semibold">
                  Voce voltou para a sessao.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
                  Seu progresso foi preservado para{" "}
                  <span className="font-semibold text-[var(--quizzy-text)]">
                    {returningParticipant?.nickname}
                  </span>
                  . Voce pode retomar do estado atual sem perder sua pontuacao.
                </p>
                <div className="mt-6 rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Estado atual da sala
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--quizzy-text)]">
                    {sessionStatusLabel}
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
                    Voltar ao inicio
                  </Link>
                </div>
              </>
            ) : isJoinable ? (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
                  Identificacao
                </p>
                <h2 className="mt-4 text-3xl font-semibold">
                  Entrar na sala
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
                  O QR Code ou o PIN ja trouxe voce para a sessao certa. Agora
                  falta so confirmar como quer aparecer para o host.
                </p>
                <ParticipantEntryForm joinAction={joinLiveSession} pin={pin} />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-warning)]">
                  Entrada indisponivel
                </p>
                <h2 className="mt-4 text-3xl font-semibold">
                  Sessao encerrada ou pausada
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
                  Esta sala nao esta recebendo novos participantes agora. Se o
                  evento continua, peca um novo PIN ao host.
                </p>
                <div className="mt-6 rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Estado atual
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--quizzy-text)]">
                    {sessionStatusLabel}
                  </p>
                </div>
                <Link
                  className="mt-6 inline-flex rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white"
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
