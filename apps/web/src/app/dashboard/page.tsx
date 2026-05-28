import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { quizzes } from "@/db/schema";
import { createQuiz } from "./actions";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuthSession();

  const quizList = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      status: quizzes.status,
      updatedAt: quizzes.updatedAt,
    })
    .from(quizzes)
    .where(eq(quizzes.organizationId, session.user.organizationId))
    .orderBy(desc(quizzes.updatedAt));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8 text-[#132238]">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
              Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              Seus quizzes, em rascunho e prontos para publicar.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#61708c]">
              Logado como {session.user.name} em {session.user.email}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded-full border border-[#cad5e3] px-5 py-3 text-sm font-semibold text-[#18202f] transition hover:bg-white"
              href="/dashboard/account"
            >
              Conta
            </Link>
            <form action={createQuiz}>
              <button
                className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59]"
                type="submit"
              >
                Novo quiz
              </button>
            </form>
            <SignOutButton />
          </div>
        </header>

        <section className="mt-8 grid gap-4">
          {quizList.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#c8d4e4] bg-white/80 p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-semibold">
                Nenhum quiz criado ainda
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#61708c]">
                Comecamos com um rascunho automaticamente quando voce cria o
                primeiro quiz.
              </p>
              <form action={createQuiz} className="mt-6">
                <button
                  className="rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557]"
                  type="submit"
                >
                  Criar primeiro quiz
                </button>
              </form>
            </div>
          ) : (
            quizList.map((quiz) => (
              <Link
                key={quiz.id}
                className="grid gap-4 rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_90px_rgba(15,23,42,0.1)] sm:grid-cols-[1fr_auto]"
                href={`/dashboard/quizzes/${quiz.id}`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{quiz.title}</h2>
                    <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                      {quiz.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#61708c]">
                    {quiz.description || "Sem descricao ainda."}
                  </p>
                </div>
                <div className="text-sm text-[#7b879a]">
                  Atualizado em{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(quiz.updatedAt)}
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
