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
    <main className="min-h-screen bg-[radial-gradient(circle_at_bottom_right,_#fed7aa,_transparent_25%),linear-gradient(160deg,_#fff7ed,_#fefefe_45%,_#eff6ff)] px-6 py-12 text-[#1f2937]">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex items-center">
          <div className="rounded-[2rem] bg-[#10233f] p-8 text-white shadow-[0_35px_120px_rgba(16,35,63,0.22)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#fbbf24]">
              Primeira conta
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.04]">
              Vamos ligar o modo criador.
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#dbe4f3]">
              Criamos sua organizacao, o primeiro usuario e o ponto de partida
              do dashboard em um unico passo.
            </p>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Criar conta do criador</h2>
              <p className="mt-2 text-sm leading-6 text-[#61708c]">
                Essa conta ja entra com perfil de owner da organizacao.
              </p>
            </div>

            <RegisterForm hasGoogle={hasGoogle} />

            <p className="mt-6 text-sm text-[#61708c]">
              Ja tem conta?{" "}
              <Link className="font-semibold text-[#c2410c]" href="/login">
                Entrar
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
