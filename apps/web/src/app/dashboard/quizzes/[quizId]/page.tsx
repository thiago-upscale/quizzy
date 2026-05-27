import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { questions, quizzes } from "@/db/schema";
import { saveQuiz } from "../../actions";
import { QuizEditor } from "./quiz-editor";

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
      question?: string;
      options?: string[];
    };
    const correctAnswer = question.correctAnswer as { index?: number };

    return {
      id: question.id,
      type:
        question.type === "true_false" ? "true_false" : "multiple_choice",
      question: content.question ?? "",
      options:
        question.type === "true_false"
          ? ["Verdadeiro", "Falso"]
          : content.options ?? ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
      correctIndex: correctAnswer.index ?? 0,
      timeLimitSeconds: question.timeLimitSeconds,
    } as const;
  });

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
        </div>

        <QuizEditor
          description={quiz.description ?? ""}
          initialQuestions={initialQuestions}
          quizId={quiz.id}
          saveAction={saveQuiz}
          title={quiz.title}
        />
      </div>
    </main>
  );
}
