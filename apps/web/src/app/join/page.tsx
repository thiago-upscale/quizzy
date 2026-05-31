import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string }>;
}) {
  const params = await searchParams;
  const rawPin = params.pin?.trim();

  if (rawPin && /^\d{6}$/.test(rawPin)) {
    redirect(`/live/${rawPin}`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#10233f_0%,_#0f766e_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
        <section className="grid w-full gap-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                Entrada por PIN
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Entre rapido na sala certa.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/76 sm:text-base">
                Digite os 6 digitos mostrados pelo host ou use o QR Code do
                evento. A marca continua aplicada, mas a prioridade aqui e
                entrar sem friccao.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Passo 1
                </p>
                <p className="mt-2 text-sm font-semibold">Receba o PIN</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Passo 2
                </p>
                <p className="mt-2 text-sm font-semibold">Confirme seu nome</p>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Passo 3
                </p>
                <p className="mt-2 text-sm font-semibold">Aguarde o host</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] bg-white p-6 text-[var(--quizzy-text)] shadow-[0_18px_50px_rgba(16,35,63,0.14)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
              Digite o PIN
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Sessao live
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
              Se o PIN estiver certo, voce segue direto para a identificacao da
              sala. Se nao estiver, basta revisar os 6 digitos com o host.
            </p>

            <form className="mt-8 space-y-4" method="get">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--quizzy-muted)]">
                  PIN de 6 digitos
                </span>
                <input
                  autoComplete="one-time-code"
                  className="w-full rounded-[1.6rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_65%,white)] px-5 py-5 text-center text-4xl font-semibold tracking-[0.34em] text-[var(--quizzy-navy)] outline-none transition focus:border-[var(--quizzy-teal)]"
                  inputMode="numeric"
                  maxLength={6}
                  name="pin"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  required
                />
              </label>

              <button
                className="w-full rounded-full bg-[var(--quizzy-accent)] px-5 py-4 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[#f7b338]"
                type="submit"
              >
                Continuar para a sala
              </button>
            </form>

            <div className="mt-6 rounded-[1.4rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                Precisa de ajuda?
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--quizzy-muted)]">
                Se preferir, use o QR Code exibido pelo host. Se o evento ja
                encerrou, peca um novo PIN para a sala atual.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="text-sm font-semibold text-[var(--quizzy-teal)]"
                href="/"
              >
                Voltar para o site
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
