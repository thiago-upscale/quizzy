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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0d1b2a] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight text-white">
              Quizzy
            </span>
            <span className="ml-1 text-2xl text-[#f59e0b]">!</span>
          </Link>
        </div>

        <div className="rounded-2xl bg-white/[0.06] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm">
          <h1 className="text-center text-xl font-semibold text-white">
            Digite o PIN do jogo
          </h1>
          <p className="mt-2 text-center text-sm text-white/50">
            Peça o PIN para o apresentador ou escaneie o QR code.
          </p>

          <form className="mt-8" method="get">
            <input
              autoComplete="one-time-code"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-5 text-center text-5xl font-bold tracking-[0.22em] text-white placeholder-white/20 outline-none transition focus:border-[#f59e0b] focus:bg-white/15"
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
        </div>

        <p className="mt-8 text-center text-xs text-white/30">
          Sem conta necessária. Só o PIN.
        </p>
      </div>
    </main>
  );
}
