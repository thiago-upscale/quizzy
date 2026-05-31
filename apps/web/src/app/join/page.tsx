import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { env } from "@/env";

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

  const joinUrl = `${env.NEXTAUTH_URL}/join`;
  const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
    color: { dark: "#ffffff", light: "#00000000" },
    margin: 1,
    width: 200,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1b2a] px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight text-white">
              Quizzy
            </span>
            <span className="ml-1 text-2xl text-[#f59e0b]">!</span>
          </Link>
        </div>

        <div className="grid gap-0 overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/10 lg:grid-cols-[1fr_1.4fr]">
          {/* QR code panel */}
          <div className="flex flex-col items-center justify-center gap-6 bg-[#0a1520] px-8 py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Entrar
            </p>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <Image
                alt="QR code de entrada"
                className="h-auto w-40 opacity-90"
                height={160}
                src={qrCodeDataUrl}
                width={160}
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                PIN do jogo
              </p>
              <p className="mt-2 text-3xl font-bold tracking-[0.18em] text-white">
                — — — — — —
              </p>
              <p className="mt-3 text-xs leading-5 text-white/35">
                Peça o PIN para o apresentador<br />ou escaneie o QR code da sessão.
              </p>
            </div>
          </div>

          {/* PIN input panel */}
          <div className="bg-white/[0.05] px-8 py-10 backdrop-blur-sm">
            <h1 className="text-xl font-semibold text-white">
              Digite o PIN do jogo
            </h1>
            <p className="mt-2 text-sm text-white/45">
              6 dígitos mostrados pelo apresentador.
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

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-xs leading-6 text-white/30">
                Sem conta necessária. Só o PIN. Se o QR code não funcionar, peça o PIN de 6 dígitos diretamente para o apresentador.
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
