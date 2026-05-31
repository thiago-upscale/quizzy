import Link from "next/link";
import { getAuthSession } from "@/auth/session";

export const dynamic = "force-dynamic";

const narrativeSteps = [
  {
    copy: "Aplique logo, tipografia e paleta para que o quiz ja nasca com linguagem corporativa.",
    eyebrow: "01",
    title: "Configurar a marca",
  },
  {
    copy: "Abra o PIN ao vivo, acompanhe presenca e sustente o ritmo da sala sem improviso.",
    eyebrow: "02",
    title: "Conduzir a sessao",
  },
  {
    copy: "Leia ranking, saude operacional e sinais do evento enquanto tudo ainda esta acontecendo.",
    eyebrow: "03",
    title: "Monitorar o resultado",
  },
] as const;

export default async function Home() {
  const session = await getAuthSession();
  const primaryHref = session?.user?.id ? "/dashboard" : "/register";
  const primaryLabel = session?.user?.id
    ? "Abrir dashboard"
    : "Entrar no beta";
  const secondaryHref = session?.user?.id ? "/dashboard" : "/login";
  const secondaryLabel = session?.user?.id ? "Ver operacao" : "Ja tenho conta";

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.1),_transparent_28%),linear-gradient(180deg,_#fbfcfd_0%,_#eef4f8_100%)] text-[var(--quizzy-text)]">
      <section className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[2.8rem] border border-[var(--quizzy-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(247,248,250,0.92))] px-7 py-8 shadow-[0_28px_90px_rgba(16,35,63,0.08)] sm:px-8 xl:px-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.16),transparent_68%)]" />
          <div className="absolute -right-12 top-16 h-56 w-56 rounded-full bg-[rgba(245,158,11,0.08)] blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[rgba(16,35,63,0.08)] blur-3xl" />

          <header className="relative flex flex-col gap-5 border-b border-[rgba(216,226,238,0.92)] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className="text-[1.9rem] uppercase tracking-[0.14em] text-[var(--quizzy-navy)]"
                style={{ fontFamily: "var(--quizzy-logo-font)" }}
              >
                Quizzy
              </span>
              <span className="rounded-full bg-[rgba(15,118,110,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-teal)]">
                B2B beta
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--quizzy-muted)] transition hover:text-[var(--quizzy-navy)]"
                href={secondaryHref}
              >
                {secondaryLabel}
              </Link>
              <Link
                className="rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#193252]"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
            </div>
          </header>

          <div className="relative grid gap-8 pt-10 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
            <div>
              <p className="inline-flex rounded-full bg-[rgba(15,118,110,0.08)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
                Quizzes com a cara da sua empresa
              </p>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#1d2a3e] sm:text-6xl xl:text-7xl">
                Marca forte na tela. Operacao segura na sala.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--quizzy-muted)] sm:text-xl">
                Branding corporativo aplicado, sessao ao vivo com PIN e leitura
                operacional pronta para treinamentos, convencoes e ativacoes.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-[var(--quizzy-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[#f7b338]"
                  href={primaryHref}
                >
                  {primaryLabel}
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-[var(--quizzy-border)] bg-white/80 px-6 py-3.5 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-white"
                  href="/join"
                >
                  Entrar com PIN
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-white/78 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Marca aplicada
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--quizzy-text)]">
                    Logo, fonte e cores entram no fluxo inteiro do quiz.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-white/78 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Sessao ao vivo
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--quizzy-text)]">
                    PIN, lobby, ranking e condução com ritmo de evento real.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-white/78 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Leitura pronta
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--quizzy-text)]">
                    Relatorios e sinais operacionais sem precisar improvisar.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <article className="rounded-[2.3rem] bg-[linear-gradient(165deg,#10233f_0%,#153252_54%,#0f766e_100%)] p-6 text-white shadow-[0_26px_80px_rgba(16,35,63,0.22)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      Sessao com branding aplicado
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight">
                      Convenção comercial 2026
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    PIN 368485
                  </span>
                </div>

                <div className="mt-5 rounded-[1.8rem] bg-white/8 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      Pergunta em exibicao
                    </p>
                    <span className="rounded-full bg-[var(--quizzy-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--quizzy-navy)]">
                      20s
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold leading-9">
                    Qual valor precisa abrir o encontro da liderança?
                  </p>
                  <div className="mt-5 grid gap-3">
                    {([
                      ["Inovacao", false],
                      ["Proximidade com o cliente", true],
                      ["Eficiência operacional", false],
                    ] as const).map(([label, active]) => (
                      <div
                        key={label}
                        className={
                          active
                            ? "rounded-2xl bg-[var(--quizzy-accent)] px-4 py-3 text-sm font-semibold text-[var(--quizzy-navy)]"
                            : "rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/78"
                        }
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <article className="rounded-[2rem] border border-[var(--quizzy-border)] bg-white p-5 shadow-[0_14px_34px_rgba(16,35,63,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Operacao em tempo real
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["81", "Participantes"],
                      ["74%", "Precisao"],
                      ["12", "Perguntas"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] px-3 py-4"
                      >
                        <p className="text-lg font-semibold text-[var(--quizzy-text)]">
                          {value}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--quizzy-muted)]">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[2rem] border border-[var(--quizzy-border)] bg-[#fdfcf8] p-5 shadow-[0_14px_34px_rgba(16,35,63,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Ranking parcial
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      ["1", "Camila", "+430"],
                      ["2", "Rafael", "+380"],
                      ["3", "Paula", "+320"],
                    ].map(([rank, name, delta]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[var(--quizzy-teal)]">
                            {rank}
                          </span>
                          <span className="font-semibold text-[var(--quizzy-text)]">
                            {name}
                          </span>
                        </div>
                        <span className="rounded-full bg-[rgba(15,118,110,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--quizzy-teal)]">
                          {delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-10 rounded-[2.5rem] border border-[var(--quizzy-border)] bg-white/88 p-8 shadow-[0_18px_50px_rgba(16,35,63,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-muted)]">
                Prova visual
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--quizzy-text)]">
                O diferencial nao e “ter quiz”. E ter um quiz que parece seu.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--quizzy-muted)]">
              A tela nao precisa explicar branding em excesso quando a propria
              experiencia ja faz esse trabalho.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_60%,white)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                Quiz generico
              </p>
              <div className="mt-5 rounded-[1.7rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(216,226,238,0.88)]">
                <p className="text-sm font-semibold text-[#4f5c6d]">
                  Logo ausente, tipografia neutra, nenhuma pista da empresa.
                </p>
                <div className="mt-5 grid gap-3">
                  {["Pergunta 1", "Pergunta 2", "Pergunta 3"].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-[#edf1f4] px-4 py-3 text-sm text-[#607083]"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] bg-[linear-gradient(160deg,#10233f_0%,#0f766e_100%)] p-5 text-white shadow-[0_18px_50px_rgba(16,35,63,0.18)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                Quiz com identidade aplicada
              </p>
              <div className="mt-5 rounded-[1.7rem] bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                    Sua marca aqui
                  </span>
                  <span className="rounded-full bg-[var(--quizzy-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--quizzy-navy)]">
                    Ao vivo
                  </span>
                </div>
                <p className="mt-5 text-xl font-semibold leading-8">
                  Mesmo conteudo, outra percepcao: a sessao parece parte do seu
                  evento, nao uma ferramenta emprestada.
                </p>
                <div className="mt-5 grid gap-3">
                  {[
                    "Paleta da empresa aplicada",
                    "Tipografia aprovada para a acao",
                    "Sinais operacionais claros para host e publico",
                  ].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-white/12 px-4 py-3 text-sm text-white/82"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-10 rounded-[2.5rem] border border-[var(--quizzy-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,248,250,0.95))] p-8 shadow-[0_18px_50px_rgba(16,35,63,0.05)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-muted)]">
              Fluxo do produto
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--quizzy-text)]">
              Crie, conduza e acompanhe sem perder o ritmo da sala.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {narrativeSteps.map((step) => (
              <article
                key={step.eyebrow}
                className="rounded-[2rem] border border-[var(--quizzy-border)] bg-white p-5 shadow-[0_12px_28px_rgba(16,35,63,0.05)]"
              >
                <div className="inline-flex rounded-full bg-[rgba(15,118,110,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-teal)]">
                  {step.eyebrow}
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-[var(--quizzy-text)]">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[var(--quizzy-muted)]">
                  {step.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2.5rem] bg-[linear-gradient(155deg,#10233f_0%,#163455_62%,#0f766e_100%)] px-8 py-10 text-white shadow-[0_24px_70px_rgba(16,35,63,0.18)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
                CTA final
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                Entre no beta e valide a experiencia antes do proximo evento.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/75">
                O produto foi desenhado para quem precisa de marca forte na
                interface e confianca operacional na execucao.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[var(--quizzy-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[#f7b338]"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/18 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/join"
              >
                Testar entrada com PIN
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
