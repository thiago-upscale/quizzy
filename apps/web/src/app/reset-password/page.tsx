import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0e7ff,_transparent_30%),linear-gradient(135deg,_#f8fafc,_#eef4ff_60%,_#eefdf6)] px-6 py-12 text-[#10233f]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl items-center justify-center">
        <section className="w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-info)]">
            Nova senha
          </p>
          <h1 className="mt-4 text-4xl font-semibold">Redefina seu acesso</h1>
          <p className="mt-3 text-sm leading-7 text-[#61708c]">
            Use o link interno de recuperação para definir uma nova senha com
            seguranca.
          </p>

          <div className="mt-8">
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <div className="rounded-xl bg-[var(--quizzy-error-bg)] px-4 py-3 text-sm text-[var(--quizzy-error)]">
                Esse link de recuperação está incompleto.
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-[#61708c]">
            Quer gerar outro link?{" "}
            <Link
              className="font-semibold text-[var(--quizzy-info)]"
              href="/forgot-password"
            >
              Voltar para recuperação
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
