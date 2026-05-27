import Link from "next/link";
import { getAuthSession } from "@/auth/session";

const foundations = [
  ["Web", "Next.js App Router em PT-BR"],
  ["Realtime", "Socket.io standalone"],
  ["Dados", "Drizzle + PostgreSQL"],
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAuthSession();

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#18202f]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
          Quizzy MVP
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
          Quizzes corporativos em tempo real, com a cara da sua marca.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4b5565]">
          Fundação da Sprint 0 criada: app web Next.js, serviço realtime
          Socket.io e base para Drizzle, Auth.js, Redis e Railway.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="rounded-full bg-[#10233f] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1d3557]"
            href={session?.user?.id ? "/dashboard" : "/login"}
          >
            {session?.user?.id ? "Abrir dashboard" : "Entrar como criador"}
          </Link>
          {!session?.user?.id ? (
            <Link
              className="rounded-full border border-[#cad5e3] px-5 py-3 text-center text-sm font-semibold text-[#18202f] transition hover:bg-white"
              href="/register"
            >
              Criar conta
            </Link>
          ) : null}
        </div>
        <div className="mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {foundations.map(([title, description]) => (
            <div
              key={title}
              className="rounded-lg border border-[#d8dee8] bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
