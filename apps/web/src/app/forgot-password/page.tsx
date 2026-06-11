import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dcfce7,_transparent_32%),linear-gradient(135deg,_#f8fafc,_#eff6ff_60%,_#eefdf6)] px-6 py-12 text-[#10233f]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center justify-center">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0f766e]">
            Recuperação de senha
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            Gere um link interno para o beta
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#61708c]">
            Para esta fase, o link de recuperação fica disponível para uso
            interno e testes.
          </p>

          <div className="mt-8">
            <ForgotPasswordForm />
          </div>

          <p className="mt-6 text-sm text-[#61708c]">
            Lembrou da senha?{" "}
            <Link className="font-semibold text-[#0f766e]" href="/login">
              Voltar ao login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
