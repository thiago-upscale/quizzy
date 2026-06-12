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
import {
  activeSessionStatuses,
  formatDate,
  formatEventType,
  getSessionStatusTone,
  getStatusLabel,
} from "../dashboard-helpers";

export const dynamic = "force-dynamic";

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
      label:
        "Respondendo normalmente. Falhas de sincronização de início e avanço da sessão também ficam registradas no histórico operacional.",
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

export default async function OperacaoPage() {
  const session = await requireAuthSession();

  const [activeSessionsRaw, recentEvents, realtimeHealth] = await Promise.all([
    db
      .select({
        id: quizSessions.id,
        quizId: quizSessions.quizId,
        pin: quizSessions.pin,
        shareToken: quizSessions.shareToken,
        mode: quizSessions.mode,
        status: quizSessions.status,
        createdAt: quizSessions.createdAt,
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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
          Operação ao vivo
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">
          O que está acontecendo agora
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--quizzy-muted)]">
          Sessões em andamento, sinais recentes e saúde do tempo real — tudo o
          que pede ação do host está aqui.
        </p>
      </header>

      {/* Operational metrics */}
      <section
        aria-label="Métricas operacionais"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
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
      <section
        aria-label="Sessões e sinais"
        className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
      >
        <SurfaceCard>
          <SectionHeading
            eyebrow="Acompanhamento"
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
                description="Quando uma sessão estiver em andamento, interrompida ou aguardando decisão do host, ela aparece aqui."
                title="Nenhuma sessão pedindo atenção agora"
              />
            ) : (
              sessionsNeedingAttention.map((sessionItem) => {
                const latestEvent = latestEventBySession.get(sessionItem.id);
                const sessionLabel =
                  sessionItem.mode === "live"
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
      <SurfaceCard>
        <SectionHeading
          eyebrow="Monitoramento resumido"
          helper="Status do serviço de tempo real que sustenta as sessões live."
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
          <StatusAlert
            tone={realtimeHealth.status === "healthy" ? "success" : "warning"}
          >
            {realtimeHealth.label}
          </StatusAlert>
        </div>
      </SurfaceCard>
    </div>
  );
}
