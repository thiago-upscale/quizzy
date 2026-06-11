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
    <main className="flex min-h-screen items-center justify-center bg-[#0d1b2a] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight text-white">
              Quizzy
            </span>
            <span className="ml-1 text-2xl text-[#f59e0b]">!</span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
          <div className="bg-white/[0.05] px-8 py-10 backdrop-blur-sm">
            <h1 className="text-xl font-semibold text-white">
              Digite o PIN do jogo
            </h1>
            <p className="mt-2 text-sm text-white/45">
              6 dígitos mostrados pelo apresentador.
            </p>

            <form className="mt-8" method="get">
              <label className="sr-only" htmlFor="pin-input">
                PIN de 6 dígitos
              </label>
              <input
                autoComplete="one-time-code"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-5 text-center text-5xl font-bold tracking-[0.22em] text-white placeholder-white/20 outline-none transition focus:border-[#f59e0b] focus:bg-white/15 focus:ring-2 focus:ring-[#f59e0b]/50"
                id="pin-input"
                inputMode="numeric"
                maxLength={6}
                name="pin"
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />

              <button
                className="mt-5 w-full rounded-xl bg-[#f59e0b] py-4 text-base font-bold text-[#0d1b2a] transition hover:bg-[#f7b534] active:scale-[0.98]"
                type="submit"
              >
                Entrar
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-xs leading-6 text-white/30">
                Sem conta necessária. Só o PIN de 6 dígitos mostrado pelo apresentador.
              </p>
              <Link
                className="mt-3 inline-block text-xs font-semibold text-white/40 transition hover:text-white/60"
                href="/"
              >
                ← Voltar para o site
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
