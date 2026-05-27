import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import {
  quizSessions,
  quizzes,
  quizVersions,
  sessionEvents,
} from "@/db/schema";

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

  const sharePath = quizSession.shareToken
    ? `/play/${quizSession.shareToken}`
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
                Versao publicada #{quizSession.versionNumber}. Esta tela serve
                como base operacional para o host enquanto o fluxo do
                participante entra na proxima etapa.
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
                Link individual
              </p>
              <p className="mt-3 break-all text-sm font-semibold text-[#132238]">
                {sharePath ?? "Nao se aplica a sessoes live"}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                O fluxo publico do participante entra em seguida. Por enquanto,
                esta referencia ja deixa o token visivel para QA e integracao.
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
      </div>
    </main>
  );
}
