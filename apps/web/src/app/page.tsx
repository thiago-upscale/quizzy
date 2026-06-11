import Link from "next/link";
import { getAuthSession } from "@/auth/session";

export const dynamic = "force-dynamic";

const productSteps = [
  {
    copy: "Suba o logo, escolha a paleta e a tipografia. O quiz já nasce com a linguagem da sua empresa — em todas as telas, do lobby ao pódio.",
    eyebrow: "01",
    title: "Configure a marca",
  },
  {
    copy: "Abra o PIN no telão. A plateia entra pelo celular, sem instalar nada. Você conduz o ritmo da sala com presença, contagem e ranking ao vivo.",
    eyebrow: "02",
    title: "Conduza com PIN",
  },
  {
    copy: "No segundo em que a sessão termina, o relatório está pronto: participação por pessoa, acertos por pergunta e exportação em CSV.",
    eyebrow: "03",
    title: "Leia o resultado",
  },
] as const;

const personas = [
  {
    eyebrow: "RH e Treinamento",
    title: "Meça retenção de conteúdo de verdade.",
    copy: "Cada sessão sai com acertos por pergunta e participação por pessoa — evidência concreta para o seu LMS e para a liderança. Treinamento deixa de ser presença em lista e vira dado.",
    points: [
      "Relatório individual e por pergunta",
      "Exportação em CSV para o seu sistema",
      "Modo individual com prazo para trilhas assíncronas",
    ],
  },
  {
    eyebrow: "Eventos e convenções",
    title: "A energia da sala vira o ponto alto da convenção.",
    copy: "PIN no telão, plateia no celular, ranking ao vivo com pódio e confete no final. Tudo com a identidade do evento — não com a nossa.",
    points: [
      "Telão com QR code e PIN gigante",
      "Pódio animado para premiar na hora",
      "Reconexão automática se a rede do centro de convenções oscilar",
    ],
  },
  {
    eyebrow: "Marketing interno",
    title: "Transforme comunicados em participação ativa.",
    copy: "Lançamento de produto, campanha de valores, onboarding. Em vez de torcer para o e-mail ser lido, você descobre quem realmente absorveu a mensagem.",
    points: [
      "Quiz com a cara da campanha, não da ferramenta",
      "Funciona ao vivo no evento ou por link individual",
      "Resultado por pessoa para fechar o ciclo da comunicação",
    ],
  },
] as const;

const proofPoints = [
  {
    title: "Sem app, sem fricção",
    copy: "Participantes entram pelo navegador do celular com um PIN de 6 dígitos. Nada para instalar, nada para configurar.",
  },
  {
    title: "Feito para rede de evento",
    copy: "Se o Wi-Fi oscilar, a sessão reconecta sozinha e preserva pontuação, sequência e posição no ranking.",
  },
  {
    title: "Relatório imediato",
    copy: "Participação, acertos e tempo de resposta disponíveis no momento em que a sessão termina — com exportação em CSV.",
  },
  {
    title: "Sua marca em cada tela",
    copy: "Logo, cores, fonte e imagem de fundo aplicados do lobby ao pódio. O quiz parece parte do seu evento.",
  },
] as const;

const faqItems = [
  {
    question: "Os participantes precisam instalar alguma coisa?",
    answer:
      "Não. Eles abrem o navegador do celular, digitam o PIN de 6 dígitos mostrado no telão (ou escaneiam o QR code) e já estão dentro. Sem conta, sem download.",
  },
  {
    question: "Funciona com Wi-Fi instável de centro de convenções?",
    answer:
      "Sim. A conexão reconecta automaticamente e o participante volta exatamente para onde estava, com pontos e ranking preservados. O host acompanha a saúde da sala em tempo real.",
  },
  {
    question: "Preciso estar ao vivo ou dá para mandar por link?",
    answer:
      "Os dois. Além da sessão ao vivo com PIN, existe o modo individual: você compartilha um link com prazo e cada pessoa responde no próprio ritmo. O relatório consolida tudo.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "Cada organização tem seus dados isolados. Sessões são acessadas por PIN temporário ou link com token, e você decide se exige e-mail dos participantes.",
  },
  {
    question: "Quanto custa?",
    answer:
      "Grátis durante o beta, com acesso completo. Quem entrar agora terá condição de fundador no lançamento — e setup acompanhado pelo nosso time.",
  },
] as const;

export default async function Home() {
  const session = await getAuthSession();
  const isAuthenticated = Boolean(session?.user?.id);
  const primaryHref = isAuthenticated ? "/dashboard" : "/register";
  const primaryLabel = isAuthenticated
    ? "Abrir dashboard"
    : "Criar meu primeiro quiz — grátis no beta";
  const headerPrimaryLabel = isAuthenticated ? "Abrir dashboard" : "Entrar no beta";
  const secondaryHref = isAuthenticated ? "/dashboard" : "/login";
  const secondaryLabel = isAuthenticated ? "Ver operação" : "Já tenho conta";

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.1),_transparent_28%),linear-gradient(180deg,_#fbfcfd_0%,_#eef4f8_100%)] text-[var(--quizzy-text)]">
      <div className="mx-auto w-full max-w-7xl px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden rounded-[2.8rem] border border-[var(--quizzy-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(247,248,250,0.92))] px-7 py-8 shadow-[0_28px_90px_rgba(16,35,63,0.08)] sm:px-8 xl:px-10">
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
              <span className="rounded-full bg-[rgba(15,118,110,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-teal)]">
                Beta para empresas
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
                {headerPrimaryLabel}
              </Link>
            </div>
          </header>

          <div className="relative grid gap-10 pt-10 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
            <div>
              <p className="inline-flex rounded-full bg-[rgba(15,118,110,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-teal)]">
                Quiz ao vivo para empresas
              </p>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.04em] text-[#1d2a3e] sm:text-6xl">
                O quiz ao vivo com a cara da sua empresa — não com a cara de
                uma ferramenta.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--quizzy-muted)] sm:text-xl">
                Aplique sua marca, abra um PIN e conduza a sala em tempo real.
                No fim, o relatório de participação e acertos já está pronto —
                para treinamentos, convenções e ativações internas.
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
              <p className="mt-4 text-sm text-[var(--quizzy-muted)]">
                Sem cartão. Sem instalação para os participantes — só o PIN no
                celular.
              </p>
            </div>

            {/* Mock de sessão ao vivo — prova visual no hero */}
            <div className="grid gap-4">
              <article className="rounded-[2.3rem] bg-[linear-gradient(165deg,#10233f_0%,#153252_54%,#0f766e_100%)] p-6 text-white shadow-[0_26px_80px_rgba(16,35,63,0.22)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                      Sessão com branding aplicado
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight">
                      Convenção comercial 2026
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                    PIN 368 485
                  </span>
                </div>

                <div className="mt-5 rounded-[1.8rem] bg-white/8 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                      Pergunta em exibição
                    </p>
                    <span className="rounded-full bg-[var(--quizzy-accent)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--quizzy-navy)]">
                      20s
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold leading-9">
                    Qual valor precisa abrir o encontro da liderança?
                  </p>
                  <div className="mt-5 grid gap-3">
                    {([
                      ["Inovação", false],
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                    Operação em tempo real
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["81", "Participantes"],
                      ["74%", "Precisão"],
                      ["12", "Perguntas"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] px-3 py-4"
                      >
                        <p className="text-lg font-semibold text-[var(--quizzy-text)]">
                          {value}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--quizzy-muted)]">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[2rem] border border-[var(--quizzy-border)] bg-[#fdfcf8] p-5 shadow-[0_14px_34px_rgba(16,35,63,0.06)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
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
                        <span className="rounded-full bg-[rgba(15,118,110,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--quizzy-teal)]">
                          {delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
              <p className="px-2 text-center text-sm text-[var(--quizzy-muted)]">
                Isto não é um print decorativo. É como sua sessão aparece no
                telão — com sua paleta, sua fonte e seu logo.
              </p>
            </div>
          </div>
        </section>

        {/* ============ PROBLEMA / AGITAÇÃO ============ */}
        <section className="mx-auto mt-14 max-w-3xl px-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-muted)]">
            O momento que ninguém esquece — para o bem ou para o mal
          </p>
          <h2 className="mt-5 text-3xl font-semibold leading-snug text-[var(--quizzy-text)] sm:text-4xl">
            Você prepara o evento por semanas. Aí chega a hora da dinâmica…
          </h2>
          <p className="mt-6 text-lg leading-9 text-[var(--quizzy-muted)]">
            …e aparece uma tela roxa com o logo de outra empresa, perguntas
            apertadas no projetor e nenhum dado no fim. A plateia percebe. A
            diretoria também.
          </p>
          <p className="mt-6 text-xl font-semibold leading-9 text-[var(--quizzy-navy)]">
            O problema não é fazer quiz. É fazer um quiz que pareça parte do
            seu evento.
          </p>
        </section>

        {/* ============ COMO FUNCIONA — timeline vertical ============ */}
        <section className="mt-14 rounded-[2.5rem] border border-[var(--quizzy-border)] bg-white/88 p-8 shadow-[0_18px_50px_rgba(16,35,63,0.05)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-muted)]">
            Como funciona
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--quizzy-text)]">
            Crie, conduza e acompanhe sem perder o ritmo da sala.
          </h2>

          <ol className="relative mt-10 space-y-10 border-l-2 border-[rgba(15,118,110,0.18)] pl-8 sm:pl-10">
            {productSteps.map((step) => (
              <li key={step.eyebrow} className="relative">
                <span className="absolute -left-[2.95rem] top-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--quizzy-teal)] text-sm font-bold text-white sm:-left-[3.45rem]">
                  {step.eyebrow}
                </span>
                <h3 className="text-2xl font-semibold text-[var(--quizzy-text)]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--quizzy-muted)]">
                  {step.copy}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ============ PARA QUEM É — blocos alternados ============ */}
        <section className="mt-14">
          <div className="px-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-muted)]">
              Para quem é
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--quizzy-text)]">
              Um produto, três salas diferentes.
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {personas.map((persona, index) => (
              <article
                key={persona.eyebrow}
                className={`grid gap-8 rounded-[2.5rem] border border-[var(--quizzy-border)] bg-white/90 p-8 shadow-[0_18px_50px_rgba(16,35,63,0.05)] lg:grid-cols-[1fr_0.85fr] lg:items-center ${
                  index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <p className="inline-flex rounded-full bg-[rgba(15,118,110,0.08)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-teal)]">
                    {persona.eyebrow}
                  </p>
                  <h3 className="mt-5 text-3xl font-semibold leading-tight text-[var(--quizzy-text)]">
                    {persona.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-8 text-[var(--quizzy-muted)]">
                    {persona.copy}
                  </p>
                </div>
                <ul className="space-y-3">
                  {persona.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 rounded-2xl bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] px-5 py-4 text-sm font-medium leading-6 text-[var(--quizzy-text)]"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--quizzy-teal)] text-[10px] font-bold text-white">
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ============ PROVA HONESTA ============ */}
        <section className="mt-14 rounded-[2.5rem] bg-[linear-gradient(160deg,#10233f_0%,#153252_60%,#0f766e_100%)] p-8 text-white shadow-[0_24px_70px_rgba(16,35,63,0.18)] sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
            Por que confiar
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
            Estamos em beta. Em vez de logos emprestados, fatos do produto.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/75">
            Você ganha acesso completo grátis e setup acompanhado pelo nosso
            time. Em troca, só pedimos que use de verdade — seu feedback molda
            o produto.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {proofPoints.map((point) => (
              <article
                key={point.title}
                className="rounded-[1.8rem] bg-white/8 p-6 backdrop-blur-sm"
              >
                <h3 className="text-lg font-semibold">{point.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {point.copy}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--quizzy-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[#f7b338]"
              href={primaryHref}
            >
              {isAuthenticated ? "Abrir dashboard" : "Garantir acesso de fundador"}
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/18 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/join"
            >
              Entrar com PIN de uma sessão
            </Link>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="mx-auto mt-14 max-w-3xl">
          <div className="px-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--quizzy-muted)]">
              Perguntas frequentes
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[var(--quizzy-text)]">
              O que todo mundo pergunta antes do primeiro evento.
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-[1.8rem] border border-[var(--quizzy-border)] bg-white/90 px-6 py-5 shadow-[0_8px_30px_rgba(16,35,63,0.04)] transition open:shadow-[0_16px_40px_rgba(16,35,63,0.08)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--quizzy-text)] [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(15,118,110,0.08)] text-sm font-bold text-[var(--quizzy-teal)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-[var(--quizzy-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="mt-14 rounded-[2.5rem] bg-[linear-gradient(155deg,#10233f_0%,#163455_62%,#0f766e_100%)] px-8 py-12 text-white shadow-[0_24px_70px_rgba(16,35,63,0.18)] sm:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Seu próximo evento pode ser o primeiro com a sua marca na tela.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/75">
                Crie a conta, suba o logo e rode um teste com seu time ainda
                hoje. Grátis durante o beta, sem cartão.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[var(--quizzy-accent)] px-6 py-3.5 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[#f7b338]"
                href={primaryHref}
              >
                {isAuthenticated ? "Abrir dashboard" : "Criar conta grátis"}
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/18 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/join"
              >
                Entrar com PIN
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-12 flex flex-col items-center gap-2 pb-4 text-center text-sm text-[var(--quizzy-muted)]">
          <span
            className="text-xl uppercase tracking-[0.14em] text-[var(--quizzy-navy)]"
            style={{ fontFamily: "var(--quizzy-logo-font)" }}
          >
            Quizzy
          </span>
          <p>Quiz ao vivo com a marca da sua empresa — em beta para empresas.</p>
        </footer>
      </div>
    </main>
  );
}
