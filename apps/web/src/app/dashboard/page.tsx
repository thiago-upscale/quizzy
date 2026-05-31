import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import {
  participants,
  quizSessions,
  quizzes,
  sessionEvents,
} from "@/db/schema";
import { env } from "@/env";
import {
  EmptyStateCard,
  MetricCard,
  SectionHeading,
  StatusAlert,
  SurfaceCard,
} from "@/components/phase-one-ui";
import { createQuiz, deleteQuiz } from "./actions";
import { SignOutButton } from "./sign-out-button";
import { DeleteQuizButton } from "./delete-quiz-button";

export const dynamic = "force-dynamic";

const activeSessionStatuses = [
  "waiting",
  "countdown",
  "playing",
  "question_result",
  "interrupted",
] as const;

function formatDate(value: Date | null) {
  if (!value) {
    return "Nao definido";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatEventType(eventType: string) {
  return eventType
    .split(".")
    .map((chunk) =>
      chunk.length > 0 ? chunk[0]!.toUpperCase() + chunk.slice(1) : chunk,
    )
    .join(" ");
}

function getSessionStatusTone(status: string) {
  if (status === "interrupted") {
    return "bg-[#fef2f2] text-[#b91c1c]";
  }

  if (status === "playing" || status === "question_result") {
    return "bg-[#ecfdf3] text-[#0f766e]";
  }

  if (status === "countdown") {
    return "bg-[#eff6ff] text-[#1d4ed8]";
  }

  return "bg-[#f8fafc] text-[#475569]";
}

type SessionEventSummary = {
  createdAt: Date;
  eventType: string;
  sessionId: string;
};

type RealtimeHealth =
  | {
      checkedAt: Date;
      label: string;
      status: "healthy";
    }
  | {
      checkedAt: Date;
      label: string;
      status: "degraded";
    };

async function getRealtimeHealth(): Promise<RealtimeHealth> {
  const checkedAt = new Date();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${env.REALTIME_URL}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        checkedAt,
        label: `HTTP ${response.status}`,
        status: "degraded",
      };
    }

    return {
      checkedAt,
      label: "Respondendo normalmente",
      status: "healthy",
    };
  } catch (error) {
    return {
      checkedAt,
      label: error instanceof Error ? error.message : "sem resposta",
      status: "degraded",
    };
  }
}

export default async function DashboardPage() {
  const session = await requireAuthSession();

  const [quizList, activeSessionsRaw, recentEvents, realtimeHealth] =
    await Promise.all([
      db
        .select({
          id: quizzes.id,
          title: quizzes.title,
          description: quizzes.description,
          status: quizzes.status,
          updatedAt: quizzes.updatedAt,
        })
        .from(quizzes)
        .where(eq(quizzes.organizationId, session.user.organizationId))
        .orderBy(desc(quizzes.updatedAt)),
      db
        .select({
          id: quizSessions.id,
          quizId: quizSessions.quizId,
          pin: quizSessions.pin,
          shareToken: quizSessions.shareToken,
          mode: quizSessions.mode,
          status: quizSessions.status,
          startsAt: quizSessions.startsAt,
          endsAt: quizSessions.endsAt,
          expiresAt: quizSessions.expiresAt,
          createdAt: quizSessions.createdAt,
          finishedAt: quizSessions.finishedAt,
          quizTitle: quizzes.title,
          participantCount: count(participants.id),
        })
        .from(quizSessions)
        .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
        .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
        .where(eq(quizzes.organizationId, session.user.organizationId))
        .groupBy(quizSessions.id, quizzes.id)
        .orderBy(desc(quizSessions.createdAt)),
      db
        .select({
          id: sessionEvents.id,
          sessionId: sessionEvents.sessionId,
          eventType: sessionEvents.eventType,
          createdAt: sessionEvents.createdAt,
          payload: sessionEvents.payload,
          sessionMode: quizSessions.mode,
          sessionStatus: quizSessions.status,
          quizTitle: quizzes.title,
        })
        .from(sessionEvents)
        .innerJoin(quizSessions, eq(sessionEvents.sessionId, quizSessions.id))
        .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
        .where(eq(quizzes.organizationId, session.user.organizationId))
        .orderBy(desc(sessionEvents.createdAt))
        .limit(12),
      getRealtimeHealth(),
    ]);

  const activeSessions = activeSessionsRaw.filter((sessionItem) =>
    activeSessionStatuses.includes(
      sessionItem.status as (typeof activeSessionStatuses)[number],
    ),
  );
  const activeSessionIds = activeSessions.map((sessionItem) => sessionItem.id);

  const latestEventBySession = new Map<string, SessionEventSummary>();

  for (const event of recentEvents) {
    if (!latestEventBySession.has(event.sessionId)) {
      latestEventBySession.set(event.sessionId, event);
    }
  }

  if (activeSessionIds.length > 0) {
    const activeSessionEvents = await db
      .select({
        id: sessionEvents.id,
        sessionId: sessionEvents.sessionId,
        eventType: sessionEvents.eventType,
        createdAt: sessionEvents.createdAt,
        payload: sessionEvents.payload,
      })
      .from(sessionEvents)
      .where(inArray(sessionEvents.sessionId, activeSessionIds))
      .orderBy(desc(sessionEvents.createdAt));

    for (const event of activeSessionEvents) {
      if (!latestEventBySession.has(event.sessionId)) {
        latestEventBySession.set(event.sessionId, event);
      }
    }
  }

  const publishedQuizzes = quizList.filter(
    (quiz) => quiz.status === "published",
  );
  const activeLiveSessions = activeSessions.filter(
    (sessionItem) => sessionItem.mode === "live",
  );
  const interruptedSessions = activeSessions.filter(
    (sessionItem) => sessionItem.status === "interrupted",
  );
  const openIndividualSessions = activeSessions.filter(
    (sessionItem) => sessionItem.mode === "individual",
  );
  const activeParticipants = activeLiveSessions.reduce(
    (total, sessionItem) => total + sessionItem.participantCount,
    0,
  );
  const sessionsNeedingAttention = activeSessions
    .filter(
      (sessionItem) =>
        sessionItem.status === "interrupted" ||
        sessionItem.status === "playing" ||
        sessionItem.status === "question_result" ||
        sessionItem.status === "countdown",
    )
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8 text-[#132238]">
      <div className="mx-auto w-full max-w-6xl">
        <header className="rounded-[2rem] border border-white/70 bg-white/72 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
                Dashboard
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold">
                Operacao do Quizzy, dos quizzes ao que esta rodando agora.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61708c]">
                Logado como {session.user.name} em {session.user.email}. Use
                esta visao para abrir novas sessoes, acompanhar sinais do
                realtime e detectar o que pede atencao agora.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="rounded-full border border-[var(--quizzy-border)] px-5 py-3 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-white"
                href="/dashboard/account"
              >
                Conta
              </Link>
              <form action={createQuiz}>
                <button
                  className="rounded-full bg-[var(--quizzy-teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                  type="submit"
                >
                  Novo quiz
                </button>
              </form>
              <SignOutButton />
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            helper={`${quizList.length} quizzes no total na organizacao.`}
            label="Quizzes publicados"
            value={publishedQuizzes.length}
          />
          <MetricCard
            accent="teal"
            helper={`${activeParticipants} participantes registrados nas sessoes abertas.`}
            label="Sessoes live ativas"
            value={activeLiveSessions.length}
          />
          <MetricCard
            helper="Links ainda ativos para tentativas assincronas."
            label="Sessoes individuais abertas"
            value={openIndividualSessions.length}
          />
          <MetricCard
            accent={interruptedSessions.length > 0 ? "amber" : "navy"}
            helper="Sessoes interrompidas aguardando retomada do host."
            label="Atencao operacional"
            value={interruptedSessions.length}
          />
        </section>

        <SurfaceCard className="mt-4">
          <SectionHeading
            eyebrow="Observabilidade minima"
            helper="A leitura do realtime precisa ficar obvia para o host antes de virar problema de operacao."
            title="Saude do realtime para o beta"
            trailing={
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    realtimeHealth.status === "healthy"
                      ? "bg-[#ecfdf3] text-[#0f766e]"
                      : "bg-[#fef2f2] text-[#b91c1c]"
                  }`}
                >
                  {realtimeHealth.status === "healthy"
                    ? "realtime online"
                    : "realtime degradado"}
                </span>
                <span className="text-sm text-[#61708c]">
                  Checado em {formatDate(realtimeHealth.checkedAt)}
                </span>
              </div>
            }
          />
          <div className="mt-5">
            <StatusAlert tone={realtimeHealth.status === "healthy" ? "success" : "warning"}>
              {realtimeHealth.label}. Falhas de sincronizacao de inicio e avanco
              da sessao tambem ficam registradas no historico operacional.
            </StatusAlert>
          </div>
        </SurfaceCard>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Sessoes que pedem atencao"
              helper="Priorize o que esta em andamento, interrompido ou precisando de decisao do host."
              title="Operacao viva agora"
              trailing={
                <span className="rounded-full bg-[#f8fbff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  {sessionsNeedingAttention.length} exibidas
                </span>
              }
            />

            <div className="mt-6 space-y-4">
              {sessionsNeedingAttention.length === 0 ? (
                <EmptyStateCard
                  description="Nenhuma sessao ativa exigindo acompanhamento imediato. Quando algo pedir acao do host, este bloco passa a priorizar a leitura."
                  title="Sem alerta operacional agora"
                />
              ) : (
                sessionsNeedingAttention.map((sessionItem) => {
                  const latestEvent = latestEventBySession.get(sessionItem.id);

                  return (
                    <Link
                      key={sessionItem.id}
                      className="block rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] p-5 transition hover:border-[#c8d4e4] hover:bg-white"
                      href={`/dashboard/sessions/${sessionItem.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-[#132238]">
                            {sessionItem.quizTitle}
                          </p>
                          <p className="mt-1 text-sm text-[#61708c]">
                            {sessionItem.mode === "live"
                              ? `PIN ${sessionItem.pin ?? "sem PIN"}`
                              : "Sessao individual"}{" "}
                            • {sessionItem.participantCount} participantes
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
                            {sessionItem.mode}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getSessionStatusTone(
                              sessionItem.status,
                            )}`}
                          >
                            {sessionItem.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-[#61708c] sm:grid-cols-3">
                        <div>
                          <p className="font-semibold text-[#132238]">Criada</p>
                          <p className="mt-1">
                            {formatDate(sessionItem.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#132238]">Expira</p>
                          <p className="mt-1">
                            {formatDate(
                              sessionItem.expiresAt ?? sessionItem.endsAt,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#132238]">
                            Ultimo evento
                          </p>
                          <p className="mt-1">
                            {latestEvent
                              ? `${formatEventType(latestEvent.eventType)} • ${formatDate(latestEvent.createdAt)}`
                              : "Sem eventos ainda"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Atividade recente"
              helper="Use o historico recente para verificar sinais de entrada, avanco e incidentes antes de abrir a sessao."
              title="Ultimos sinais da plataforma"
            />

            <div className="mt-6 space-y-4">
              {recentEvents.length === 0 ? (
                <EmptyStateCard
                  description="Assim que a organizacao acumular sessoes, esta area passa a mostrar os ultimos eventos relevantes da plataforma."
                  title="Ainda nao temos eventos recentes nesta organizacao"
                />
              ) : (
                recentEvents.map((event) => (
                  <Link
                    key={event.id}
                    className="block rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] p-4 transition hover:border-[#c8d4e4] hover:bg-white"
                    href={`/dashboard/sessions/${event.sessionId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#132238]">
                          {formatEventType(event.eventType)}
                        </p>
                        <p className="mt-1 text-sm text-[#61708c]">
                          {event.quizTitle}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getSessionStatusTone(
                          event.sessionStatus,
                        )}`}
                      >
                        {event.sessionStatus}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-[#61708c]">
                      {event.sessionMode} • {formatDate(event.createdAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </SurfaceCard>
        </section>

        <section className="mt-8">
          <SectionHeading
            eyebrow="Biblioteca de quizzes"
            helper="Biblioteca pronta para abrir um rascunho, publicar de novo ou iniciar uma nova sessao a partir de um quiz existente."
            title="Rascunhos e publicacoes"
            trailing={
              <p className="text-sm text-[#61708c]">
                {quizList.length} itens atualizados recentemente.
              </p>
            }
          />
        </section>

        <section className="mt-4 grid gap-4">
          {quizList.length === 0 ? (
            <EmptyStateCard
              action={
                <form action={createQuiz}>
                  <button
                    className="rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557]"
                    type="submit"
                  >
                    Criar primeiro quiz
                  </button>
                </form>
              }
              description="Com a cara da sua empresa: adicione logo, cores e fontes para publicar o primeiro quiz e depois abrir uma sessao live ou individual."
              title="Crie seu primeiro quiz"
            />
          ) : (
            quizList.map((quiz) => (
              <div
                key={quiz.id}
                className="group relative grid gap-4 rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_90px_rgba(15,23,42,0.1)] sm:grid-cols-[1fr_auto]"
              >
                <Link
                  className="contents"
                  href={`/dashboard/quizzes/${quiz.id}`}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold">{quiz.title}</h2>
                      <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                        {quiz.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#61708c]">
                      {quiz.description || "Sem descricao ainda."}
                    </p>
                  </div>
                  <div className="text-sm text-[#7b879a]">
                    Atualizado em{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(quiz.updatedAt)}
                  </div>
                </Link>
                <div className="absolute right-4 top-4">
                  <DeleteQuizButton
                    deleteAction={deleteQuiz}
                    quizId={quiz.id}
                    quizTitle={quiz.title}
                  />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
