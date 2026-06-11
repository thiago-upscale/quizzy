import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/auth/session";
import { env } from "@/env";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getAuthSession();
  const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_bottom_right,_#fed7aa,_transparent_25%),linear-gradient(160deg,_#fff7ed,_#fefefe_45%,_#eff6ff)] px-6 py-12 text-[var(--quizzy-text)]">
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
            Vamos ligar o modo criador.
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
            Criamos sua organização, o primeiro usuário e o ponto de partida do
            dashboard em um único passo.
          </p>
        </div>

        <div className="rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <p className="mb-6 rounded-xl bg-[rgba(15,118,110,0.07)] px-4 py-3 text-sm font-medium text-[var(--quizzy-teal)]">
            Esta conta entra com perfil de owner da organização.
          </p>

          <RegisterForm hasGoogle={hasGoogle} />

          <p className="mt-6 text-center text-sm text-[var(--quizzy-muted)]">
            Já tem conta?{" "}
            <Link
              className="font-semibold text-[var(--quizzy-teal)]"
              href="/login"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
