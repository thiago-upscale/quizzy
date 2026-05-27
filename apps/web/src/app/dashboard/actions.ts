"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { questions, quizzes, quizVersions } from "@/db/schema";

export async function createQuiz() {
  const session = await requireAuthSession();

  const [quiz] = await db
    .insert(quizzes)
    .values({
      organizationId: session.user.organizationId,
      createdBy: session.user.id,
      title: "Novo quiz",
      description: "",
      branding: {
        primaryColor: "#0f766e",
        secondaryColor: "#10233f",
        accentColor: "#f59e0b",
      },
    })
    .returning({ id: quizzes.id });

  if (!quiz) {
    throw new Error("Nao foi possivel criar o quiz.");
  }

  await db.insert(questions).values({
    quizId: quiz.id,
    orderIndex: 0,
    type: "multiple_choice",
    content: {
      question: "Sua primeira pergunta",
      options: ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
      imageUrl: null,
    },
    correctAnswer: { index: 0 },
    timeLimitSeconds: 20,
  });

  redirect(`/dashboard/quizzes/${quiz.id}`);
}

type QuestionPayload = {
  id?: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correctIndex: number;
  timeLimitSeconds: number;
};

export async function saveQuiz(formData: FormData) {
  const session = await requireAuthSession();
  const quizId = String(formData.get("quizId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const intent = String(formData.get("intent") ?? "draft");
  const questionsPayload = String(formData.get("questionsPayload") ?? "[]");

  if (!quizId || !title) {
    throw new Error("Quiz invalido.");
  }

  const [existingQuiz] = await db
    .select({
      id: quizzes.id,
      organizationId: quizzes.organizationId,
      createdBy: quizzes.createdBy,
    })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!existingQuiz) {
    throw new Error("Quiz nao encontrado.");
  }

  const parsedQuestions = JSON.parse(questionsPayload) as QuestionPayload[];
  const normalizedQuestions = parsedQuestions
    .map((question, index) => ({
      orderIndex: index,
      type: question.type,
      content: {
        question: question.question.trim(),
        options:
          question.type === "true_false"
            ? ["Verdadeiro", "Falso"]
            : question.options.map((option) => option.trim()).filter(Boolean),
        imageUrl: null,
      },
      correctAnswer: {
        index: question.correctIndex,
      },
      timeLimitSeconds: question.timeLimitSeconds,
    }))
    .filter(
      (question) =>
        question.content.question.length > 0 &&
        question.content.options.length >= 2,
    );

  if (normalizedQuestions.length === 0) {
    throw new Error("Inclua pelo menos uma pergunta valida.");
  }

  const nextStatus = intent === "publish" ? "published" : "draft";

  await db.transaction(async (tx) => {
    await tx
      .update(quizzes)
      .set({
        title,
        description,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId));

    await tx.delete(questions).where(eq(questions.quizId, quizId));

    await tx.insert(questions).values(
      normalizedQuestions.map((question) => ({
        quizId,
        orderIndex: question.orderIndex,
        type: question.type,
        content: question.content,
        correctAnswer: question.correctAnswer,
        timeLimitSeconds: question.timeLimitSeconds,
      })),
    );

    if (intent === "publish") {
      const [lastVersion] = await tx
        .select({ versionNumber: quizVersions.versionNumber })
        .from(quizVersions)
        .where(eq(quizVersions.quizId, quizId))
        .orderBy(desc(quizVersions.versionNumber))
        .limit(1);

      await tx.insert(quizVersions).values({
        quizId,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        title,
        description,
        branding: {},
        questionsSnapshot: normalizedQuestions,
        createdBy: existingQuiz.createdBy,
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/quizzes/${quizId}`);
}
