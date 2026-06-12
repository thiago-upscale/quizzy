import Link from "next/link";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { participants, quizSessions, quizzes } from "@/db/schema";
import { EmptyStateCard } from "@/components/phase-one-ui";
import { formatDate } from "../dashboard-helpers";

export const dynamic = "force-dynamic";

export default async function ResultadosPage() {
  const session = await requireAuthSession();

  const finishedSessions = await db
    .select({
      id: quizSessions.id,
      mode: quizSessions.mode,
      pin: quizSessions.pin,
      finishedAt: quizSessions.finishedAt,
      quizTitle: quizzes.title,
      participantCount: count(participants.id),
    })
    .from(quizSessions)
    .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
    .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
    .where(
      and(
        eq(quizzes.organizationId, session.user.organizationId),
        isNotNull(quizSessions.finishedAt),
      ),
    )
    .groupBy(quizSessions.id, quizzes.id)
    .orderBy(desc(quizSessions.finishedAt))
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
          Resultados
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">
          Sessões finalizadas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--quizzy-muted)]">
          As últimas sessões encerradas, com acesso ao relatório de
          participação e acertos de cada uma.
        </p>
      </header>

      <section aria-label="Sessões finalizadas" className="grid gap-3">
        {finishedSessions.length === 0 ? (
          <EmptyStateCard
            action={
              <Link
                className="inline-block rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-90"
                href="/dashboard"
              >
                Ir para os quizzes
              </Link>
            }
            description="Quando uma sessão live ou individual for encerrada, o relatório completo dela aparece aqui."
            title="Nenhuma sessão finalizada ainda"
          />
        ) : (
          finishedSessions.map((s) => (
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
                  {s.mode === "live" ? `Live • PIN ${s.pin ?? "—"}` : "Individual"}{" "}
                  • {s.participantCount} participantes
                  {s.finishedAt ? ` • ${formatDate(s.finishedAt)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--quizzy-teal)]">
                Ver resultados →
              </span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
