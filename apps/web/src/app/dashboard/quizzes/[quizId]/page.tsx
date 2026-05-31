import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { questions, quizzes, quizSessions } from "@/db/schema";
import {
  createIndividualSession,
  createLiveSession,
  deleteQuiz,
  saveQuiz,
} from "../../actions";
import { QuizEditor } from "./quiz-editor";
import { DeleteQuizButton } from "../../delete-quiz-button";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const session = await requireAuthSession();
  const { quizId } = await params;

  const [quiz] = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      branding: quizzes.branding,
      status: quizzes.status,
    })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!quiz) {
    notFound();
  }

  const quizQuestions = await db
    .select({
      id: questions.id,
      type: questions.type,
      content: questions.content,
      correctAnswer: questions.correctAnswer,
      timeLimitSeconds: questions.timeLimitSeconds,
    })
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.orderIndex));

  const initialQuestions = quizQuestions.map((question) => {
    const content = question.content as {
      imageUrl?: string | null;
      question?: string;
      options?: string[];
    };
    const correctAnswer = question.correctAnswer as { index?: number };

    return {
      id: question.id,
      type: question.type === "true_false" ? "true_false" : "multiple_choice",
      question: content.question ?? "",
      imageUrl: content.imageUrl ?? null,
      options:
        question.type === "true_false"
          ? ["Verdadeiro", "Falso"]
          : (content.options ?? ["Opcao A", "Opcao B", "Opcao C", "Opcao D"]),
      correctIndex: correctAnswer.index ?? 0,
      timeLimitSeconds: question.timeLimitSeconds,
    } as const;
  });

  const liveSessions = await db
    .select({
      pin: quizSessions.pin,
    })
    .from(quizSessions)
    .where(
      and(
        eq(quizSessions.quizId, quizId),
        eq(quizSessions.mode, "live"),
        inArray(quizSessions.status, [
          "waiting",
          "countdown",
          "playing",
          "question_result",
          "interrupted",
        ]),
      ),
    )
    .orderBy(desc(quizSessions.createdAt));

  const [latestIndividualSession] = await db
    .select({
      shareToken: quizSessions.shareToken,
    })
    .from(quizSessions)
    .where(
      and(eq(quizSessions.quizId, quizId), eq(quizSessions.mode, "individual")),
    )
    .orderBy(desc(quizSessions.createdAt))
    .limit(1);

  const branding = quiz.branding as Partial<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    backgroundImageUrl: string | null;
    logoUrl: string | null;
  }>;
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc,_#eef5ff)] px-6 py-8 text-[#132238]">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              className="text-sm font-semibold text-[#0f766e]"
              href="/dashboard"
            >
              Voltar ao dashboard
            </Link>
            <h1 className="mt-3 text-4xl font-semibold">{quiz.title}</h1>
            <p className="mt-2 text-sm text-[#61708c]">
              Status atual: {quiz.status}
            </p>
          </div>
          <div className="group">
            <DeleteQuizButton
              alwaysVisible
              deleteAction={deleteQuiz}
              quizId={quiz.id}
              quizTitle={quiz.title}
            />
          </div>
        </div>

        <QuizEditor
          branding={{
            primaryColor: branding.primaryColor ?? "#0f766e",
            secondaryColor: branding.secondaryColor ?? "#10233f",
            accentColor: branding.accentColor ?? "#f59e0b",
            fontFamily: branding.fontFamily ?? "DM Sans",
            backgroundImageUrl: branding.backgroundImageUrl ?? null,
            logoUrl: branding.logoUrl ?? null,
          }}
          description={quiz.description ?? ""}
          initialQuestions={initialQuestions}
          liveSessionAction={createLiveSession}
          quizId={quiz.id}
          saveAction={saveQuiz}
          sessionSummary={{
            activeLiveCount: liveSessions.length,
            latestLivePin: liveSessions[0]?.pin ?? null,
            latestShareToken: latestIndividualSession?.shareToken ?? null,
          }}
          individualSessionDefaults={{
            maxAttempts: 1,
            requireParticipantEmail: false,
          }}
          startIndividualSessionAction={createIndividualSession}
          status={quiz.status}
          title={quiz.title}
        />
      </div>
    </main>
  );
}
