import { cookies } from "next/headers";
import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { answers, attempts, participants, questions } from "@/db/schema";
import {
  buildIndividualQuestionsForSession,
  getIndividualParticipantCookieName,
  getIndividualSessionByShareToken,
  isIndividualSessionExpired,
} from "@/lib/individual";
import { normalizeLiveBranding } from "@/lib/live";
import {
  joinIndividualSession,
  startNextIndividualAttempt,
  submitIndividualAnswer,
} from "../actions";
import { IndividualParticipantEntryForm } from "./participant-entry-form";
import { IndividualQuestionForm } from "./question-form";

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

export default async function IndividualPlayPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const session = await getIndividualSessionByShareToken(shareToken);

  if (!session) {
    return (
      <main className="min-h-screen bg-[#10233f] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
          <section className="rounded-[2rem] bg-white/10 p-8 text-center backdrop-blur">
            <h1 className="text-3xl font-semibold">Sessao nao encontrada</h1>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Confira o link ou fale com quem compartilhou a tarefa.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const branding = normalizeLiveBranding(
    (session.versionBranding ?? session.quizBranding) as Partial<{
      accentColor: string;
      backgroundImageUrl: string | null;
      fontFamily: string;
      logoUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
    }>,
  );
  const expired = isIndividualSessionExpired(session);
  const cookieStore = await cookies();
  const participantToken = cookieStore.get(
    getIndividualParticipantCookieName(shareToken),
  )?.value;

  if (!participantToken) {
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
          <section className="grid w-full gap-6 rounded-[2rem] bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur lg:grid-cols-[1fr_0.85fr]">
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
                Tarefa individual
              </p>
              <h1 className="mt-4 text-4xl font-semibold">
                {session.versionTitle || session.quizTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
                {session.versionDescription ||
                  session.quizDescription ||
                  "Responda no seu ritmo e acompanhe seu resultado ao final."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  Versao {session.versionNumber}
                </span>
                <span
                  className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  Ate {formatDate(session.endsAt ?? session.expiresAt)}
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-6">
              {expired ? (
                <>
                  <h2 className="text-2xl font-semibold">Prazo encerrado</h2>
                  <p className="mt-3 text-sm leading-7 text-white/75">
                    Esta sessao individual nao aceita novas entradas.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold">Comecar agora</h2>
                  <p className="mt-3 text-sm leading-7 text-white/75">
                    Seu apelido fica visivel no relatorio. O email continua
                    opcional nesta versao do fluxo.
                  </p>
                  <IndividualParticipantEntryForm
                    joinAction={joinIndividualSession}
                    requireEmail={session.requireParticipantEmail}
                    shareToken={shareToken}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const [participant] = await db
    .select({
      email: participants.email,
      finishedAt: participants.finishedAt,
      id: participants.id,
      nickname: participants.nickname,
      score: participants.score,
      totalTimeMs: participants.totalTimeMs,
    })
    .from(participants)
    .where(
      and(
        eq(participants.sessionId, session.id),
        eq(participants.participantToken, participantToken),
      ),
    )
    .limit(1);

  if (!participant) {
    return (
      <main className="min-h-screen bg-[#10233f] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
          <section className="rounded-[2rem] bg-white/10 p-8 text-center backdrop-blur">
            <h1 className="text-3xl font-semibold">Continuacao indisponivel</h1>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Sua tentativa nao foi encontrada. Entre novamente pelo mesmo link.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const participantAttempts = await db
    .select({
      attemptNumber: attempts.attemptNumber,
      finishedAt: attempts.finishedAt,
      id: attempts.id,
      score: attempts.score,
      status: attempts.status,
      totalTimeMs: attempts.totalTimeMs,
    })
    .from(attempts)
    .where(eq(attempts.participantId, participant.id))
    .orderBy(desc(attempts.attemptNumber));
  const latestAttempt = participantAttempts[0] ?? null;
  const individualQuestions = await buildIndividualQuestionsForSession({
    questionsSnapshot: session.questionsSnapshot,
    quizId: session.quizId,
  });
  const attemptAnswers = latestAttempt
    ? await db
        .select({
          answer: answers.answer,
          isCorrect: answers.isCorrect,
          orderIndex: questions.orderIndex,
          pointsEarned: answers.pointsEarned,
          timeSpentMs: answers.timeSpentMs,
        })
        .from(answers)
        .innerJoin(questions, eq(answers.questionId, questions.id))
        .where(eq(answers.attemptId, latestAttempt.id))
        .orderBy(asc(questions.orderIndex))
    : [];

  const answerByOrderIndex = new Map(
    attemptAnswers.map((answer) => [
      answer.orderIndex,
      {
        answerIndex:
          typeof (answer.answer as { index?: number } | null)?.index === "number"
            ? (answer.answer as { index: number }).index
            : null,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        timeSpentMs: answer.timeSpentMs,
      },
    ]),
  );
  const nextQuestion =
    latestAttempt?.status === "in_progress"
      ? individualQuestions.find(
          (question) => !answerByOrderIndex.has(question.orderIndex),
        ) ?? null
      : null;
  const answeredCount = attemptAnswers.length;
  const correctCount = attemptAnswers.filter((answer) => answer.isCorrect).length;
  const canStartAnotherAttempt =
    !expired &&
    latestAttempt?.status === "finished" &&
    participantAttempts.length < session.maxAttempts;

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
      <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo do quiz"
                  className="h-12 w-auto rounded-xl bg-white/10 p-2"
                  src={branding.logoUrl}
                />
              ) : null}
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                Modo individual
              </p>
              <h1 className="mt-4 text-4xl font-semibold">
                {session.versionTitle || session.quizTitle}
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/75">
                Ola, {participant.nickname}. Sua tentativa fica salva a cada
                resposta, entao voce pode retomar deste mesmo ponto.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                Tentativa {latestAttempt?.attemptNumber ?? 1}/{session.maxAttempts}
              </span>
              <span
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                style={{ backgroundColor: branding.accentColor }}
              >
                {expired ? "Prazo encerrado" : "Em andamento"}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[1.75rem] bg-white/10 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Seu progresso
            </p>
            <p className="mt-3 text-5xl font-semibold">
              {answeredCount}/{individualQuestions.length}
            </p>
            <p className="mt-1 text-sm font-medium text-white/75">
              perguntas respondidas nesta tentativa
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Melhor score
                </p>
                <p className="mt-2 text-2xl font-semibold">{participant.score}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Email
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {participant.email ?? "Nao informado"}
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm leading-7 text-white/75">
              Prazo final: {formatDate(session.endsAt ?? session.expiresAt)}.
            </p>
          </article>

          <article className="rounded-[1.75rem] bg-white/10 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur">
            {nextQuestion && !expired ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Pergunta {nextQuestion.orderIndex + 1} de {individualQuestions.length}
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  {nextQuestion.prompt}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Responda no seu ritmo. O tempo desta tela entra no calculo
                  desta tentativa.
                </p>
                {nextQuestion.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Imagem da pergunta"
                    className="mt-6 max-h-72 w-full rounded-2xl object-cover"
                    src={nextQuestion.imageUrl}
                  />
                ) : null}
                <div className="mt-6">
                  <IndividualQuestionForm
                    answerAction={submitIndividualAnswer}
                    options={nextQuestion.options}
                    questionOrderIndex={nextQuestion.orderIndex}
                    shareToken={shareToken}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Resultado individual
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  {expired && latestAttempt?.status !== "finished"
                    ? "Prazo encerrado"
                    : "Tentativa concluida"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {latestAttempt?.status === "finished"
                  ? "Seu desempenho desta tentativa ja foi consolidado."
                  : "Voce respondeu o que foi possivel antes do encerramento do prazo."}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Score
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {latestAttempt?.score ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Acertos
                    </p>
                    <p className="mt-2 text-3xl font-semibold">{correctCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Tempo total
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {Math.round((latestAttempt?.totalTimeMs ?? 0) / 1000)}s
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {individualQuestions.map((question) => {
                    const answer = answerByOrderIndex.get(question.orderIndex);

                    return (
                      <div
                        key={`attempt-${latestAttempt?.id}-${question.orderIndex}`}
                        className="rounded-2xl bg-white/10 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold">
                            Q{question.orderIndex + 1}. {question.prompt}
                          </p>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                            {answer
                              ? answer.isCorrect
                                ? "Correta"
                                : "Incorreta"
                              : "Sem resposta"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {canStartAnotherAttempt ? (
                    <form action={startNextIndividualAttempt}>
                      <input name="shareToken" type="hidden" value={shareToken} />
                      <button
                        className="rounded-full bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-[#fbbf24]"
                        type="submit"
                      >
                        Iniciar nova tentativa
                      </button>
                    </form>
                  ) : null}
                  <Link
                    className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                    href="/"
                  >
                    Encerrar
                  </Link>
                </div>
              </>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
