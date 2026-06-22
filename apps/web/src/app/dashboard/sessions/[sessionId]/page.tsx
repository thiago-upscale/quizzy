import { createHmac } from "node:crypto";
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
import {
  advanceLiveSession,
  restartLiveSession,
  startLiveSession,
} from "../../actions";
import {
  formatDate,
  formatEventType,
  getSessionStatusTone,
  getStatusLabel,
} from "../../dashboard-helpers";
import { HostSessionPanel } from "./host-session-panel";
import { ReportSection } from "./report-section";

export const dynamic = "force-dynamic";

function makeHostToken(sessionId: string, secret: string): string {
  const hourWindow = Math.floor(Date.now() / 3_600_000);
  return createHmac("sha256", secret)
    .update(`host:${sessionId}:${hourWindow}`)
    .digest("hex");
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

  const isLive = quizSession.mode === "live";
  const publicUrl = quizSession.pin
    ? `${env.NEXTAUTH_URL}/live/${quizSession.pin}/display`
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Page header — one title, one status, light meta */}
      <header>
        <Link
          className="text-sm font-semibold text-[var(--quizzy-teal)]"
          href={`/dashboard/quizzes/${quizSession.quizId}`}
        >
          ← Voltar ao quiz
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">
            {quizSession.quizTitle}
          </h1>
          {/* In live mode the panel shows the real-time status; avoid a second, stale badge */}
          {!isLive ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getSessionStatusTone(quizSession.status)}`}
            >
              {getStatusLabel(quizSession.status)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-[var(--quizzy-muted)]">
          {isLive ? "Sessão ao vivo" : "Sessão individual"} • Versão publicada #
          {quizSession.versionNumber} • Criada em{" "}
          {formatDate(quizSession.createdAt)}
        </p>
      </header>

      {isLive && quizSession.pin && publicUrl && qrCodeDataUrl ? (
        <HostSessionPanel
          advanceAction={advanceLiveSession}
          hostToken={makeHostToken(quizSession.id, env.REALTIME_INTERNAL_TOKEN)}
          initialParticipants={joinedParticipants.map((participant) => ({
            ...participant,
            presenceStatus: "offline" as const,
          }))}
          pin={quizSession.pin}
          publicUrl={publicUrl}
          qrCodeDataUrl={qrCodeDataUrl}
          realtimeUrl={env.REALTIME_URL}
          restartAction={restartLiveSession}
          sessionId={quizSession.id}
          sessionStatus={quizSession.status}
          startAction={startLiveSession}
        />
      ) : null}

      {/* Access and rules — only for individual sessions (live shows PIN/link in the host panel) */}
      {!isLive ? (
        <article className="rounded-[1.75rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
            Acesso e regras
          </p>
          <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="font-semibold text-[var(--quizzy-text)]">
                Link da tarefa
              </dt>
              <dd className="mt-1 break-all text-[var(--quizzy-muted)]">
                {sharePath ?? "Não disponível"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--quizzy-text)]">
                Início
              </dt>
              <dd className="mt-1 text-[var(--quizzy-muted)]">
                {formatDate(quizSession.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--quizzy-text)]">
                Encerramento
              </dt>
              <dd className="mt-1 text-[var(--quizzy-muted)]">
                {formatDate(quizSession.expiresAt ?? quizSession.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--quizzy-text)]">
                Tentativas por participante
              </dt>
              <dd className="mt-1 text-[var(--quizzy-muted)]">
                {quizSession.maxAttempts}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--quizzy-text)]">Email</dt>
              <dd className="mt-1 text-[var(--quizzy-muted)]">
                {quizSession.requireParticipantEmail
                  ? "Obrigatório para participar"
                  : "Opcional"}
              </dd>
            </div>
          </dl>
        </article>
      ) : null}

      <ReportSection
        mode={quizSession.mode}
        report={sessionReport}
        sessionId={quizSession.id}
        sessionStatus={quizSession.status}
      />

      {/* Session history — formatted, no raw payloads */}
      {recentEvents.length > 0 ? (
        <article className="rounded-[1.75rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
            Histórico da sessão
          </p>
          <ul className="mt-4 divide-y divide-[var(--quizzy-border)]">
            {recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <p className="text-sm font-medium text-[var(--quizzy-text)]">
                  {formatEventType(event.eventType)}
                </p>
                <span className="shrink-0 text-sm text-[var(--quizzy-muted)]">
                  {formatDate(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}
