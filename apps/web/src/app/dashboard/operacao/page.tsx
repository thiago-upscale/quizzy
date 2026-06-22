import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
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
import { OperationSessionManager } from "./operation-session-manager";
import {
  activeSessionStatuses,
  formatDate,
  formatEventType,
  getStatusLabel,
  getSessionStatusTone,
} from "../dashboard-helpers";

export const dynamic = "force-dynamic";

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

  const INITIAL_SESSIONS_LOAD = 50;

  const [allSessionsRaw, totalSessionsRows, recentEvents, realtimeHealth] =
    await Promise.all([
      db
        .select({
          id: quizSessions.id,
          quizId: quizSessions.quizId,
          pin: quizSessions.pin,
          shareToken: quizSessions.shareToken,
          mode: quizSessions.mode,
          status: quizSessions.status,
          createdAt: quizSessions.createdAt,
          startsAt: quizSessions.startsAt,
          endsAt: quizSessions.endsAt,
          expiresAt: quizSessions.expiresAt,
          finishedAt: quizSessions.finishedAt,
          quizTitle: quizzes.title,
          participantCount: count(participants.id),
        })
        .from(quizSessions)
        .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
        .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
        .where(eq(quizzes.organizationId, session.user.organizationId))
        .groupBy(quizSessions.id, quizzes.id)
        .orderBy(desc(quizSessions.createdAt))
        .limit(INITIAL_SESSIONS_LOAD),
      db
        .select({ total: count() })
        .from(quizSessions)
        .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
        .where(eq(quizzes.organizationId, session.user.organizationId)),
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

  const totalSessions = totalSessionsRows[0]?.total ?? 0;
  const hasMoreSessions = allSessionsRaw.length < totalSessions;

  const activeSessions = allSessionsRaw.filter((sessionItem) =>
    activeSessionStatuses.includes(
      sessionItem.status as (typeof activeSessionStatuses)[number],
    ),
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

      {/* Session management + recent events */}
      <section
        aria-label="Sessões e sinais"
        className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
      >
        <SurfaceCard>
          <SectionHeading
            eyebrow="Gestão de sessões"
            helper="Filtre, selecione em massa e exclua com proteção forte quando necessário."
            title="Todas as sessões da organização"
            trailing={
              <span className="rounded-full bg-[#f8fbff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                {totalSessions} no total
              </span>
            }
          />
          <OperationSessionManager
            hasMore={hasMoreSessions}
            sessions={allSessionsRaw.map((sessionItem) => ({
              createdAt: sessionItem.createdAt.toISOString(),
              endsAt: sessionItem.endsAt?.toISOString() ?? null,
              expiresAt: sessionItem.expiresAt?.toISOString() ?? null,
              finishedAt: sessionItem.finishedAt?.toISOString() ?? null,
              id: sessionItem.id,
              mode: sessionItem.mode as "individual" | "live",
              participantCount: sessionItem.participantCount,
              pin: sessionItem.pin,
              quizTitle: sessionItem.quizTitle,
              shareToken: sessionItem.shareToken,
              startsAt: sessionItem.startsAt?.toISOString() ?? null,
              status: sessionItem.status,
            }))}
            total={totalSessions}
          />
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
