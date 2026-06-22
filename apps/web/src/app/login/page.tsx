import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getAuthSession } from "@/auth/session";
import { env } from "@/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#fef3c7,_transparent_34%),linear-gradient(135deg,_#fff8ef,_#edf7f4_60%,_#eef4ff)] px-6 py-12 text-[var(--quizzy-text)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            className="text-2xl font-bold uppercase tracking-[0.14em] text-[var(--quizzy-navy)]"
            href="/"
            style={{ fontFamily: "var(--quizzy-logo-font)" }}
          >
            Quizzy
          </Link>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            O painel do criador começa aqui.
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
            Entre para criar quizzes, publicar versões e preparar a experiência
            ao vivo.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
          {params.registered === "1" ? (
            <p className="mb-6 rounded-xl bg-[#ecfdf3] px-4 py-3 text-sm text-[#0f766e]">
              Conta criada com sucesso. Agora você já pode entrar.
            </p>
          ) : null}

          {params.reset === "1" ? (
            <p className="mb-6 rounded-xl bg-[var(--quizzy-info-bg)] px-4 py-3 text-sm text-[var(--quizzy-info)]">
              Senha redefinida. Entre com a nova credencial.
            </p>
          ) : null}

          <LoginForm />

          {hasGoogle ? (
            <Link
              className="mt-4 block rounded-xl border border-[var(--quizzy-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--quizzy-text)] transition hover:bg-[var(--quizzy-surface)]"
              href="/api/auth/signin/google?callbackUrl=%2Fdashboard"
            >
              Entrar com Google
            </Link>
          ) : null}

          <p className="mt-6 text-center text-sm text-[var(--quizzy-muted)]">
            Ainda não tem conta?{" "}
            <Link
              className="font-semibold text-[var(--quizzy-teal)]"
              href="/register"
            >
              Criar conta
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-[var(--quizzy-muted)]">
            <Link
              className="font-semibold text-[var(--quizzy-muted)] underline underline-offset-2"
              href="/forgot-password"
            >
              Esqueci minha senha
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
