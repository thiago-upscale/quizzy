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
      <div className="mx-auto flex min-h-[80vh] w-full max-w-4xl items-center justify-center">
        <section className="w-full max-w-xl rounded-[2rem] bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
            Entrar no Quiz
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            Digite o PIN da sessao live
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/75">
            Se preferir, voce tambem pode escanear o QR Code mostrado pelo host.
          </p>

          <form className="mt-8 space-y-4" method="get">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/80">
                PIN de 6 digitos
              </span>
              <input
                autoComplete="one-time-code"
                className="w-full rounded-2xl border border-white/15 bg-white/90 px-5 py-4 text-center text-3xl font-semibold tracking-[0.3em] text-[#10233f] outline-none"
                inputMode="numeric"
                maxLength={6}
                name="pin"
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />
            </label>

            <button
              className="w-full rounded-full bg-[#f59e0b] px-5 py-4 text-sm font-semibold text-[#10233f] transition hover:bg-[#fbbf24]"
              type="submit"
            >
              Continuar
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
