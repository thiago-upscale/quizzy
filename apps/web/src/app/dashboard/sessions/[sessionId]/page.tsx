import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { env } from "@/env";
import {
  participants,
  quizSessions,
  quizzes,
  quizVersions,
  sessionEvents,
} from "@/db/schema";
import { getSessionReport } from "@/lib/session-report";
import { advanceLiveSession, startLiveSession } from "../../actions";
import { HostSessionPanel } from "./host-session-panel";
import { ReportSection } from "./report-section";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null) {
  if (!value) {
    return "Nao definido";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await requireAuthSession();
  const { sessionId } = await params;

  const [quizSession] = await db
    .select({
      id: quizSessions.id,
      mode: quizSessions.mode,
      status: quizSessions.status,
      pin: quizSessions.pin,
      shareToken: quizSessions.shareToken,
      startsAt: quizSessions.startsAt,
      endsAt: quizSessions.endsAt,
      expiresAt: quizSessions.expiresAt,
      maxAttempts: quizSessions.maxAttempts,
      requireParticipantEmail: quizSessions.requireParticipantEmail,
      createdAt: quizSessions.createdAt,
      quizId: quizzes.id,
      quizTitle: quizzes.title,
      quizStatus: quizzes.status,
      versionNumber: quizVersions.versionNumber,
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .innerJoin(quizVersions, eq(quizSessions.quizVersionId, quizVersions.id))
    .where(
      and(
        eq(quizSessions.id, sessionId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!quizSession) {
    notFound();
  }

  const recentEvents = await db
    .select({
      id: sessionEvents.id,
      eventType: sessionEvents.eventType,
      createdAt: sessionEvents.createdAt,
      payload: sessionEvents.payload,
    })
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId))
    .orderBy(desc(sessionEvents.createdAt))
    .limit(5);

  const joinedParticipants = await db
    .select({
      id: participants.id,
      avatar: participants.avatar,
      nickname: participants.nickname,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
    })
    .from(participants)
    .where(eq(participants.sessionId, sessionId));

  const sessionReport =
    quizSession.status === "finished" || quizSession.mode === "individual"
      ? await getSessionReport({
          organizationId: session.user.organizationId,
          sessionId,
        })
      : null;

  const publicUrl = quizSession.pin
    ? `${env.NEXTAUTH_URL}/live/${quizSession.pin}`
    : null;
  const qrCodeDataUrl = publicUrl
    ? await QRCode.toDataURL(publicUrl, {
        margin: 1,
        width: 320,
      })
    : null;
  const sharePath = quizSession.shareToken
    ? `${env.NEXTAUTH_URL}/play/${quizSession.shareToken}`
    : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8 text-[#132238]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link
            className="text-sm font-semibold text-[#0f766e]"
            href={`/dashboard/quizzes/${quizSession.quizId}`}
          >
            Voltar ao quiz
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
                Sessao {quizSession.mode}
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                {quizSession.quizTitle}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                Versao publicada #{quizSession.versionNumber}. Esta tela
                concentra a operacao do host, do countdown ao ranking final da
                sessao live.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                {quizSession.status}
              </span>
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
                quiz {quizSession.quizStatus}
              </span>
            </div>
          </div>
        </header>

        {quizSession.mode === "live" &&
        quizSession.pin &&
        publicUrl &&
        qrCodeDataUrl ? (
          <HostSessionPanel
            advanceAction={advanceLiveSession}
            initialParticipants={joinedParticipants.map((participant) => ({
              ...participant,
              presenceStatus: "offline" as const,
            }))}
            pin={quizSession.pin}
            publicUrl={publicUrl}
            qrCodeDataUrl={qrCodeDataUrl}
            realtimeUrl={env.REALTIME_URL}
            sessionId={quizSession.id}
            sessionStatus={quizSession.status}
            startAction={startLiveSession}
          />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Acesso principal
              </p>
              <p className="mt-3 text-4xl font-semibold text-[#132238]">
                {quizSession.pin ?? "Individual"}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                {quizSession.pin
                  ? "Use este PIN no lobby live do participante."
                  : "Sessao individual criada sem PIN."}
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                {quizSession.mode === "live"
                  ? "Link publico"
                  : "Link individual"}
              </p>
              <p className="mt-3 break-all text-sm font-semibold text-[#132238]">
                {quizSession.mode === "live"
                  ? (publicUrl ?? "Nao disponivel")
                  : (sharePath ?? "Nao se aplica a sessoes live")}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                {quizSession.mode === "live"
                  ? "Esse e o link aberto pelo QR Code. O participante cai direto na sessao e informa so os dados de identificacao."
                  : "Este e o link publico da tarefa assincrona, com retomada da tentativa pelo mesmo navegador."}
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Inicio
              </p>
              <p className="mt-3 text-lg font-semibold text-[#132238]">
                {formatDate(quizSession.startsAt)}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                Criada em {formatDate(quizSession.createdAt)}.
              </p>
            </article>

            <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Encerramento
              </p>
              <p className="mt-3 text-lg font-semibold text-[#132238]">
                {formatDate(quizSession.expiresAt ?? quizSession.endsAt)}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                Maximo de tentativas: {quizSession.maxAttempts}.
              </p>
              {quizSession.mode === "individual" ? (
                <p className="mt-2 text-sm leading-7 text-[#61708c]">
                  Email{" "}
                  {quizSession.requireParticipantEmail
                    ? "obrigatorio"
                    : "opcional"}{" "}
                  para participar.
                </p>
              ) : null}
            </article>
          </div>

          <aside className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Eventos recentes
            </p>
            <div className="mt-5 space-y-4">
              {recentEvents.length === 0 ? (
                <p className="text-sm leading-7 text-[#61708c]">
                  Ainda nao temos eventos registrados nesta sessao.
                </p>
              ) : (
                recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-[#132238]">
                        {event.eventType}
                      </p>
                      <span className="text-xs font-medium text-[#61708c]">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[#44516a]">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>

        <ReportSection
          mode={quizSession.mode}
          report={sessionReport}
          sessionId={quizSession.id}
          sessionStatus={quizSession.status}
        />
      </div>
    </main>
  );
}
