import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getAuthSession } from "@/auth/session";
import { env } from "@/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const hasGoogle = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7,_transparent_34%),linear-gradient(135deg,_#fff8ef,_#edf7f4_60%,_#eef4ff)] px-6 py-12 text-[#10233f]">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-white/60 bg-white/55 p-8 shadow-[0_30px_120px_rgba(16,35,63,0.12)] backdrop-blur">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
              Quizzy
            </p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[1.02] sm:text-6xl">
              O painel do criador comeca aqui.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#52607a]">
              Entre para criar quizzes, publicar versoes e preparar a
              experiencia live que vamos levar para producao.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Editor", "Rascunhos e versoes publicadas."],
              ["Branding", "Estrutura pronta para personalizacao."],
              ["Realtime", "Sessao live conectada ao backend dedicado."],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-[#dce5f2] bg-white/80 p-4"
              >
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#61708c]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Entrar na area do criador</h2>
              <p className="mt-2 text-sm leading-6 text-[#61708c]">
                Use email e senha para acessar seu dashboard.
              </p>
            </div>

            <LoginForm />

            {hasGoogle ? (
              <Link
                className="mt-4 block rounded-xl border border-[#c9d5e7] px-4 py-3 text-center text-sm font-semibold text-[#10233f] transition hover:bg-[#f8fafc]"
                href="/api/auth/signin/google?callbackUrl=%2Fdashboard"
              >
                Entrar com Google
              </Link>
            ) : null}

            <p className="mt-6 text-sm text-[#61708c]">
              Ainda nao tem conta?{" "}
              <Link className="font-semibold text-[#0f766e]" href="/register">
                Criar conta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
