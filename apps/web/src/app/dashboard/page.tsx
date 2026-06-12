import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { participants, quizSessions, quizzes } from "@/db/schema";
import { EmptyStateCard } from "@/components/phase-one-ui";
import { createLiveSession, createQuiz, deleteQuiz } from "./actions";
import { DeleteQuizButton } from "./delete-quiz-button";
import {
  activeSessionStatuses,
  getStatusLabel,
} from "./dashboard-helpers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuthSession();

  const [quizList, activeSessionsRaw] = await Promise.all([
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
        status: quizSessions.status,
        mode: quizSessions.mode,
        participantCount: count(participants.id),
      })
      .from(quizSessions)
      .innerJoin(quizzes, eq(quizSessions.quizId, quizzes.id))
      .leftJoin(participants, eq(participants.sessionId, quizSessions.id))
      .where(eq(quizzes.organizationId, session.user.organizationId))
      .groupBy(quizSessions.id),
  ]);

  const sessionsNeedingAttention = activeSessionsRaw.filter(
    (sessionItem) =>
      activeSessionStatuses.includes(
        sessionItem.status as (typeof activeSessionStatuses)[number],
      ) && sessionItem.status !== "waiting",
  );
  const interruptedCount = sessionsNeedingAttention.filter(
    (s) => s.status === "interrupted",
  ).length;

  const publishedQuizzes = quizList.filter(
    (quiz) => quiz.status === "published",
  );
  const draftQuizzes = quizList.filter((quiz) => quiz.status !== "published");

  return (
    <div className="flex flex-col gap-6">
      {/* Page header — one primary action */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
            Administração
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">
            Seus quizzes
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--quizzy-muted)]">
            <span className="rounded-full bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-success)]">
              {publishedQuizzes.length} publicados
            </span>
            <span className="rounded-full bg-[var(--quizzy-surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
              {draftQuizzes.length} rascunhos
            </span>
          </p>
        </div>
        <form action={createQuiz}>
          <button
            className="rounded-full bg-[var(--quizzy-teal)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-90"
            type="submit"
          >
            Novo quiz
          </button>
        </form>
      </header>

      {/* Operational pull — only when something needs the host */}
      {sessionsNeedingAttention.length > 0 ? (
        <Link
          className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-[color:color-mix(in_srgb,var(--quizzy-accent)_45%,white)] bg-[color:color-mix(in_srgb,var(--quizzy-accent)_8%,white)] px-5 py-4 transition hover:border-[var(--quizzy-accent)]"
          href="/dashboard/operacao"
        >
          <p className="text-sm font-medium text-[var(--quizzy-text)]">
            <span className="font-semibold">
              {sessionsNeedingAttention.length}{" "}
              {sessionsNeedingAttention.length === 1
                ? "sessão precisa"
                : "sessões precisam"}{" "}
              de acompanhamento
            </span>
            {interruptedCount > 0
              ? ` — ${interruptedCount} ${interruptedCount === 1 ? "interrompida" : "interrompidas"}`
              : ""}
          </p>
          <span className="shrink-0 text-sm font-semibold text-[var(--quizzy-warning)]">
            Abrir operação →
          </span>
        </Link>
      ) : null}

      {/* Quiz library */}
      <section aria-label="Biblioteca de quizzes" className="grid gap-4">
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
          quizList.map((quiz) => (
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
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        quiz.status === "published"
                          ? "bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] text-[var(--quizzy-success)]"
                          : "bg-[var(--quizzy-surface)] text-[var(--quizzy-muted)]"
                      }`}
                    >
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
  );
}
