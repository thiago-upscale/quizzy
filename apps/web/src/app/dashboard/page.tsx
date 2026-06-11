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
import { createLiveSession, createQuiz, deleteQuiz } from "./actions";
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

const statusLabels: Record<string, string> = {
  playing: "AO VIVO",
  question_result: "RESULTADO",
  countdown: "CONTAGEM",
  interrupted: "INTERROMPIDA",
  waiting: "AGUARDANDO",
  finished: "ENCERRADA",
  published: "PUBLICADO",
  draft: "RASCUNHO",
};

function formatDate(value: Date | null) {
  if (!value) {
    return "Não definido";
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
    return "bg-[color:color-mix(in_srgb,var(--quizzy-warning)_10%,white)] text-[var(--quizzy-warning)]";
  }

  if (status === "playing" || status === "question_result") {
    return "bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] text-[var(--quizzy-success)]";
  }

  if (status === "countdown") {
    return "bg-[color:color-mix(in_srgb,var(--quizzy-navy)_10%,white)] text-[var(--quizzy-navy)]";
  }

  return "bg-[var(--quizzy-surface)] text-[var(--quizzy-muted)]";
}

function getStatusLabel(status: string) {
  return statusLabels[status] ?? status.toUpperCase();
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
      label: "Respondendo normalmente. Falhas de sincronização de início e avanço da sessão também ficam registradas no histórico operacional.",
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

  const [quizList, activeSessionsRaw, recentEvents, realtimeHealth, recentFinishedSessions] =
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
      db
        .select({
          id: quizSessions.id,
          mode: quizSessions.mode,
          pin: quizSessions.pin,
          shareToken: quizSessions.shareToken,
          finishedAt: quizSessions.finishedAt,
          quizTitle: quizzes.title,
          participantCount: count(participants.id),
        })
        .from(quizSessions)
        .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
        .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
        .where(
          eq(quizzes.organizationId, session.user.organizationId),
        )
        .groupBy(quizSessions.id, quizzes.id)
        .orderBy(desc(quizSessions.finishedAt))
        .limit(5),
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

  const finishedSessionsRecent = recentFinishedSessions.filter(
    (s) => s.finishedAt !== null,
  );

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
  // Show all sessions needing attention (up to 20) — no silent slice
  const sessionsNeedingAttention = activeSessions
    .filter(
      (sessionItem) =>
        sessionItem.status === "interrupted" ||
        sessionItem.status === "playing" ||
        sessionItem.status === "question_result" ||
        sessionItem.status === "countdown",
    )
    .slice(0, 20);
  const recentQuizItems = quizList.slice(0, 8);
  const draftQuizzes = quizList.filter((quiz) => quiz.status !== "published");

  return (
    <main className="min-h-screen bg-[var(--quizzy-surface)] px-6 py-8 text-[var(--quizzy-text)]">
      <div className="mx-auto w-full max-w-6xl">

        {/* Header */}
        <header className="rounded-[2rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-8 shadow-[0_8px_30px_rgba(16,35,63,0.04)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className="text-3xl font-bold tracking-tight text-[var(--quizzy-navy)]"
                style={{ fontFamily: "var(--quizzy-logo-font, sans-serif)" }}
              >
                Quizzy
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
                Workspace de quizzes
              </p>
              <h1 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.02em]">
                Sua biblioteca e operação em um só lugar.
              </h1>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="rounded-full border border-[var(--quizzy-border)] px-5 py-2 text-sm font-semibold text-[var(--quizzy-text)] transition hover:bg-[var(--quizzy-surface)]"
                  href="/dashboard/account"
                >
                  Conta
                </Link>
                <form action={createQuiz}>
                  <button
                    className="rounded-full bg-[var(--quizzy-teal)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-90"
                    type="submit"
                  >
                    Novo quiz
                  </button>
                </form>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--quizzy-muted)]">
                <span>
                  {session.user.name || "Conta"} • {session.user.email}
                </span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Operational metrics — first thing hosts see */}
        <section aria-label="Métricas operacionais" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            helper="Sessões live em andamento ou aguardando host."
            label="Ao vivo agora"
            value={activeLiveSessions.length}
          />
          <MetricCard
            accent="teal"
            helper="Pessoas conectadas nas sessões live abertas."
            label="Participantes ativos"
            value={activeParticipants}
          />
          <MetricCard
            helper="Links assíncronos ainda disponíveis."
            label="Individuais abertas"
            value={openIndividualSessions.length}
          />
          <MetricCard
            accent={interruptedSessions.length > 0 ? "amber" : "navy"}
            helper="Sessões pausadas aguardando retomada."
            label="Interrompidas"
            value={interruptedSessions.length}
          />
        </section>

        {/* Live sessions + recent events */}
        <section aria-label="Operação ao vivo" className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard>
            <SectionHeading
              eyebrow="Operação ao vivo"
              helper="Abra apenas as sessões que realmente pedem ação do host."
              title="Sessões que precisam de acompanhamento"
              trailing={
                <span className="rounded-full bg-[#f8fbff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  {sessionsNeedingAttention.length} abertas
                </span>
              }
            />

            <div className="mt-6 space-y-3">
              {sessionsNeedingAttention.length === 0 ? (
                <EmptyStateCard
                  description="Quando uma sessão estiver em andamento, interrompida ou aguardando decisao do host, ela aparece aqui."
                  title="Nenhuma sessão pedindo atenção agora"
                />
              ) : (
                sessionsNeedingAttention.map((sessionItem) => {
                  const latestEvent = latestEventBySession.get(sessionItem.id);
                  const sessionLabel = sessionItem.mode === "live"
                    ? `Sessão ${sessionItem.quizTitle} — PIN ${sessionItem.pin ?? "sem PIN"}`
                    : `Sessão individual ${sessionItem.quizTitle}`;

                  return (
                    <Link
                      key={sessionItem.id}
                      aria-label={`${sessionLabel}, ${getStatusLabel(sessionItem.status).toLowerCase()}, ${sessionItem.participantCount} participantes`}
                      className="block rounded-[1.4rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-4 transition hover:border-[color:color-mix(in_srgb,var(--quizzy-border)_80%,black)] hover:bg-[color:color-mix(in_srgb,var(--quizzy-surface)_40%,white)]"
                      href={`/dashboard/sessions/${sessionItem.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[var(--quizzy-text)]">
                            {sessionItem.quizTitle}
                          </p>
                          <p className="mt-1 text-sm text-[var(--quizzy-muted)]">
                            {sessionItem.mode === "live"
                              ? `PIN ${sessionItem.pin ?? "sem PIN"}`
                              : "Sessão individual"}{" "}
                            • {sessionItem.participantCount} participantes
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getSessionStatusTone(
                              sessionItem.status,
                            )}`}
                          >
                            {getStatusLabel(sessionItem.status)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-[var(--quizzy-muted)]">
                        {latestEvent
                          ? `${formatEventType(latestEvent.eventType)} • ${formatDate(latestEvent.createdAt)}`
                          : "Sem eventos ainda"}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              eyebrow="Histórico recente"
              helper="Feed curto para contexto rápido antes de abrir uma sessão."
              title="Últimos sinais"
            />

            <div className="mt-6 space-y-3">
              {recentEvents.length === 0 ? (
                <EmptyStateCard
                  description="Quando a organização acumular sessões, os sinais recentes aparecem aqui."
                  title="Sem atividade recente"
                />
              ) : (
                recentEvents.slice(0, 6).map((event) => (
                  <Link
                    key={event.id}
                    aria-label={`Evento ${formatEventType(event.eventType)} da sessão ${event.quizTitle}`}
                    className="block rounded-[1.4rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-4 transition hover:border-[color:color-mix(in_srgb,var(--quizzy-border)_80%,black)] hover:bg-[color:color-mix(in_srgb,var(--quizzy-surface)_40%,white)]"
                    href={`/dashboard/sessions/${event.sessionId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--quizzy-text)]">
                          {formatEventType(event.eventType)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--quizzy-muted)]">
                          {event.quizTitle}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getSessionStatusTone(
                          event.sessionStatus,
                        )}`}
                      >
                        {getStatusLabel(event.sessionStatus)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-[var(--quizzy-muted)]">
                      {event.sessionMode} • {formatDate(event.createdAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </SurfaceCard>
        </section>

        {/* Platform health */}
        <SurfaceCard className="mt-4">
          <SectionHeading
            eyebrow="Monitoramento resumido"
            helper="A operação continua visível, mas sem roubar o foco da biblioteca."
            title="Saúde da plataforma"
            trailing={
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    realtimeHealth.status === "healthy"
                      ? "bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] text-[var(--quizzy-success)]"
                      : "bg-[color:color-mix(in_srgb,var(--quizzy-warning)_10%,white)] text-[var(--quizzy-warning)]"
                  }`}
                >
                  {realtimeHealth.status === "healthy"
                    ? "realtime online"
                    : "realtime degradado"}
                </span>
                <span className="text-sm text-[var(--quizzy-muted)]">
                  Checado em {formatDate(realtimeHealth.checkedAt)}
                </span>
              </div>
            }
          />
          <div className="mt-5">
            <StatusAlert tone={realtimeHealth.status === "healthy" ? "success" : "warning"}>
              {realtimeHealth.label}
            </StatusAlert>
          </div>
        </SurfaceCard>

        {/* Recently finished sessions */}
        {finishedSessionsRecent.length > 0 ? (
          <SurfaceCard className="mt-4">
            <SectionHeading
              eyebrow="Sessões finalizadas recentes"
              helper="As últimas sessões encerradas — acesse o relatório completo de cada uma."
              title="Resultados recentes"
            />
            <div className="mt-6 space-y-3">
              {finishedSessionsRecent.map((s) => (
                <Link
                  key={s.id}
                  aria-label={`Ver resultados de ${s.quizTitle}`}
                  className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] px-5 py-4 transition hover:border-[color:color-mix(in_srgb,var(--quizzy-border)_80%,black)] hover:bg-[color:color-mix(in_srgb,var(--quizzy-surface)_40%,white)]"
                  href={`/dashboard/sessions/${s.id}`}
                >
                  <div>
                    <p className="font-semibold text-[var(--quizzy-text)]">
                      {s.quizTitle}
                    </p>
                    <p className="mt-1 text-sm text-[var(--quizzy-muted)]">
                      {s.mode === "live"
                        ? `Live • PIN ${s.pin ?? "—"}`
                        : "Individual"}{" "}
                      • {s.participantCount} participantes
                      {s.finishedAt
                        ? ` • ${formatDate(s.finishedAt)}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--quizzy-teal)]">
                    Ver resultados →
                  </span>
                </Link>
              ))}
            </div>
          </SurfaceCard>
        ) : null}

        {/* Quiz library — below the operational fold */}
        <section aria-label="Biblioteca de quizzes" className="mt-8">
          <SectionHeading
            eyebrow="Biblioteca de quizzes"
            helper="Acesse rascunhos, publicações recentes e comece uma nova sessão a partir do quiz certo."
            title="Gerencie seus quizzes"
            trailing={
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--quizzy-muted)]">
                <span
                  className="rounded-full bg-[var(--quizzy-surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]"
                >
                  {draftQuizzes.length} rascunhos
                </span>
                <span className="rounded-full bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-success)]">
                  {publishedQuizzes.length} publicados
                </span>
                <span>{quizList.length} itens atualizados recentemente.</span>
              </div>
            }
          />
        </section>

        <section className="mt-4 grid gap-4">
          {quizList.length === 0 ? (
            <EmptyStateCard
              action={
                <form action={createQuiz}>
                  <button
                    className="rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-90"
                    type="submit"
                  >
                    Criar primeiro quiz
                  </button>
                </form>
              }
              description="Com a cara da sua empresa: adicione logo, cores e fontes para publicar o primeiro quiz e depois abrir uma sessão live ou individual."
              title="Crie seu primeiro quiz"
            />
          ) : (
            recentQuizItems.map((quiz) => (
              <div
                key={quiz.id}
                className="group relative grid gap-4 rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-5 shadow-[0_8px_30px_rgba(16,35,63,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,35,63,0.08)] sm:grid-cols-[1fr_auto]"
              >
                <Link
                  aria-label={`Abrir quiz ${quiz.title}`}
                  className="contents"
                  href={`/dashboard/quizzes/${quiz.id}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-[var(--quizzy-text)]">
                        {quiz.title}
                      </h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        quiz.status === "published"
                          ? "bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] text-[var(--quizzy-success)]"
                          : "bg-[var(--quizzy-surface)] text-[var(--quizzy-muted)]"
                      }`}>
                        {getStatusLabel(quiz.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--quizzy-muted)]">
                      {quiz.description || "Sem descrição ainda."}
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-4 sm:block">
                    <div className="text-sm text-[var(--quizzy-muted)]">
                      Atualizado em{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(quiz.updatedAt)}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--quizzy-teal)] sm:mt-6">
                      Abrir quiz →
                    </p>
                  </div>
                </Link>

                {/* Actions outside Link to prevent tap target overlap */}
                <div className="col-span-full flex flex-wrap items-center gap-3 border-t border-[var(--quizzy-border)] pt-4 sm:col-span-1">
                  {quiz.status === "published" && (
                    <form action={createLiveSession}>
                      <input name="quizId" type="hidden" value={quiz.id} />
                      <button
                        className="rounded-full bg-[var(--quizzy-teal)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-90"
                        type="submit"
                      >
                        Iniciar sessão live
                      </button>
                    </form>
                  )}
                  <div className="ml-auto">
                    <DeleteQuizButton
                      deleteAction={deleteQuiz}
                      quizId={quiz.id}
                      quizTitle={quiz.title}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
