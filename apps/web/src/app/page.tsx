import Link from "next/link";
import { getAuthSession } from "@/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAuthSession();
  const primaryHref = session?.user?.id ? "/dashboard" : "/register";
  const primaryLabel = session?.user?.id ? "Abrir dashboard" : "Criar conta";
  const secondaryHref = session?.user?.id ? "/dashboard" : "/login";
  const secondaryLabel = session?.user?.id ? "Ver operacao" : "Entrar";

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_32%),linear-gradient(180deg,_#f7fbfd_0%,_#eef4f8_100%)] text-[#18202f]">
      <section className="mx-auto w-full max-w-7xl px-6 pb-12 pt-10 sm:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[2.7rem] border border-[#dbe4ee] bg-[#fffdf8] p-8 shadow-[0_22px_70px_rgba(16,35,63,0.08)] xl:p-10">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgba(16,35,63,0.04)]" />
          <div className="absolute right-[-4rem] top-[-3rem] h-64 w-64 rounded-full bg-[rgba(15,118,110,0.05)]" />
          <div className="absolute bottom-[-7rem] left-[35%] h-80 w-80 rounded-full bg-[rgba(245,158,11,0.06)]" />

          <div className="relative flex items-center justify-between border-b border-[#d7d3ca] pb-6 text-sm text-[#3e443d]">
            <div className="w-[96px] sm:w-[120px]" />
            <div className="flex flex-1 items-center justify-center">
              <span
                className="text-2xl uppercase tracking-[0.12em] text-[#10233f] sm:text-[1.9rem]"
                style={{ fontFamily: "var(--quizzy-logo-font)" }}
              >
                Quizzy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full px-4 py-2 transition hover:text-[#10233f]"
                href={secondaryHref}
              >
                {secondaryLabel}
              </Link>
              <Link
                className="rounded-full border border-[#c6d94f] px-4 py-2 font-semibold text-[#10233f] transition hover:bg-[#eef5c9]"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
            </div>
          </div>

          <div className="relative pt-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="flex items-center justify-center gap-6 text-[#3f46f0]">
                <span className="text-6xl leading-none">*</span>
                <span className="rounded-full bg-[#dfff4f] px-6 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#10233f]">
                  Criado para eventos e treinamentos
                </span>
                <span className="text-5xl leading-none text-[#c6d94f]">✦</span>
              </div>

              <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-semibold leading-[1.04] tracking-[-0.05em] text-[#2d322c] sm:text-6xl lg:text-7xl">
                Dê à sua operação de quiz a mesma força da sua marca.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5f665d] sm:text-xl">
                Branding aplicado, condução ao vivo e leitura do evento em uma
                experiência pensada para treinamentos, convenções e ativações
                corporativas.
              </p>
            </div>

            <div className="mt-10 grid items-start gap-4 lg:grid-cols-[0.9fr_1.1fr_0.9fr]">
              <div className="space-y-4 lg:pt-14">
                <div className="rounded-[2rem] bg-[#4338f2] p-6 text-white shadow-[0_18px_40px_rgba(67,56,242,0.22)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Branding aplicado
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-7">
                    Logo, tipografia e cores entram no fluxo inteiro do quiz.
                  </p>
                </div>
                <div className="rounded-[2rem] border border-[#d7d3ca] bg-white px-5 py-4 text-sm leading-7 text-[#5f665d]">
                  PIN ao vivo para o público. Operação clara para o host.
                </div>
              </div>

              <div className="rounded-[2.4rem] bg-[#4338f2] p-6 text-white shadow-[0_22px_50px_rgba(67,56,242,0.24)]">
                <div className="rounded-[1.8rem] bg-[#10233f] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      Pergunta em exibicao
                    </p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      PIN 368485
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold leading-9">
                    Qual valor da marca deve abrir a convenção?
                  </p>
                  <div className="mt-5 space-y-2.5">
                    {[
                      "Inovação",
                      "Proximidade com o cliente",
                      "Eficiência operacional",
                    ].map((label, index) => (
                      <div
                        key={label}
                        className={
                          index === 1
                            ? "rounded-2xl bg-[#dfff4f] px-4 py-3 text-sm font-semibold text-[#10233f]"
                            : "rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/78"
                        }
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 lg:pt-10">
                <div className="rounded-[2rem] bg-[#2d322c] p-5 text-white shadow-[0_16px_40px_rgba(45,50,44,0.18)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                    Host ao vivo
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["81", "Participantes"],
                      ["74%", "Acurácia"],
                      ["12", "Perguntas"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl bg-white/10 px-3 py-4">
                        <p className="text-lg font-semibold">{value}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/60">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[2rem] bg-white p-5 shadow-[0_12px_30px_rgba(16,35,63,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5f665d]">
                    Ranking parcial
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      ["1", "Camila"],
                      ["2", "Rafael"],
                      ["3", "Paula"],
                    ].map(([rank, name]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-2xl bg-[#f5f6f1] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#4338f2]">
                            {rank}
                          </span>
                          <span className="font-semibold text-[#2d322c]">
                            {name}
                          </span>
                        </div>
                        <span className="text-sm text-[#5f665d]">ao vivo</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 rounded-[2.5rem] border border-[#d7d3ca] bg-[#fffdf8] p-8 shadow-[0_18px_50px_rgba(16,35,63,0.06)]">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#5f665d]">
                Modos do produto
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#2d322c]">
                Crie, conduza e acompanhe sem perder o ritmo da sala.
              </h2>
            </div>
            <p className="text-base leading-8 text-[#5f665d]">
              A home precisa vender o ciclo completo do Quizzy. Não é só criar
              pergunta: é apresentar bem, rodar com clareza e manter a operação
              sob controle.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {[
              [
                "Criar com marca",
                "Monte o quiz com logo, paleta e tipografia alinhados à identidade da empresa.",
                "#4338f2",
                "#dfff4f",
              ],
              [
                "Conduzir ao vivo",
                "Abra o PIN, acompanhe respostas e sustente o ritmo da sessão sem improviso.",
                "#10233f",
                "#f59e0b",
              ],
              [
                "Acompanhar a operação",
                "Leia ranking, presença e sinais do evento enquanto tudo acontece.",
                "#ffffff",
                "#4338f2",
              ],
            ].map(([title, copy, panelColor, accent]) => (
              <article
                key={title}
                className="rounded-[2rem] border border-[#d7d3ca] bg-white p-5"
              >
                <div
                  className="rounded-[1.6rem] p-5"
                  style={{
                    backgroundColor: String(panelColor),
                    color: panelColor === "#ffffff" ? "#2d322c" : "#ffffff",
                  }}
                >
                  <div
                    className="mb-8 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{
                      backgroundColor: String(accent),
                      color: panelColor === "#ffffff" ? "#10233f" : "#10233f",
                    }}
                  >
                    Quizzy
                  </div>
                  <h3 className="text-2xl font-semibold">{title}</h3>
                  <p
                    className="mt-4 text-sm leading-7"
                    style={{
                      color:
                        panelColor === "#ffffff"
                          ? "#5f665d"
                          : "rgba(255,255,255,0.78)",
                    }}
                  >
                    {copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[2.5rem] border border-[#d7d3ca] bg-[#2d322c] px-8 py-10 text-white shadow-[0_24px_70px_rgba(16,35,63,0.14)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">
                Manifesto
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Marca forte na tela. Operação segura na sala.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
                O Quizzy foi desenhado para momentos em que experiência e
                condução importam tanto quanto o conteúdo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#dfff4f] px-6 py-3.5 text-sm font-semibold text-[#10233f] transition hover:bg-[#d2f03f]"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/16 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/8"
                href={secondaryHref}
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
