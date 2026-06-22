# TODOS — Quizzy Design Debt

Items surfaced from `/plan-design-review` on 2026-05-29 and 2026-06-05. Each item has a priority (P1 = blocks beta, P2 = should land same branch/sprint, P3 = follow-up).

---

## P1 — Design System Foundation

### T1 — Remover override Arial e estabelecer CSS tokens

**Files:** `apps/web/src/app/globals.css`, `tailwind.config.ts`
**Why:** Arial como fonte principal sinaliza produto inacabado. Geist Sans já está instalado via `next/font` mas sendo substituído. CSS tokens previnem drift de cor entre as 17 telas.
**What:**

- Remover `font-family: Arial, Helvetica, sans-serif` de `globals.css:24`
- Ativar `--font-sans: var(--font-geist-sans)` como fonte principal
- Adicionar variáveis CSS em `globals.css`:
  ```css
  :root {
    --quizzy-navy: #10233f;
    --quizzy-teal: #0f766e;
    --quizzy-accent: #f59e0b;
    --quizzy-surface: #f7f8fa;
    --quizzy-text: #18202f;
    --quizzy-muted: #667085;
  }
  ```
- Configurar Tailwind para usar esses tokens via `theme.extend.colors`
  **Verify:** `pnpm build` passa, nenhuma tela com visual quebrado. Inspetor mostra Geist Sans como font-family no body.
  **Effort:** human ~30min / CC ~5min

---

## P1 — Dashboard Operational View (surfaced 2026-06-05)

### T6 — Sessions pagination: "ver todas" link when >6 sessions hidden

**Files:** `apps/web/src/app/dashboard/page.tsx`
**Why:** O painel mostra `slice(0, 6)` sessões mas o badge diz "6 abertas" quando há 13. Durante beta com sessões reais, 7 sessões ficam invisíveis — host pode perder sessões interrompidas sem saber.
**What:**

- Remover `slice(0, 6)` da variável `sessionsNeedingAttention`
- Mostrar todas as sessões que precisam de atenção (limite razoável: 20)
- Adicionar link "Ver todas as sessões →" no rodapé do painel quando total > 10
- Atualizar badge count para refletir o total real, não o slice
  **Verify:** Dashboard com 13 sessões ativas mostra todas (ou pelo menos 10 + link "ver mais")
  **Effort:** human ~15min / CC ~3min

---

## P2 — Landing Page

### T2 — Reconstruir landing page com estrutura branding-first

**Files:** `apps/web/src/app/page.tsx`
**Why:** Landing page atual tem grid 3 colunas com cards de stack técnica ("Web / Realtime / Dados") — padrão AI slop #2. Comprador de RH corporativo abandona em 5 segundos. A estrutura aprovada mostra o diferencial (branding) em vez de descrever.
**What:**

- Remover `foundations` array e grid `sm:grid-cols-3`
- Hero: headline "Quizzes com a cara da sua empresa", sub "Sessões ao vivo, branding corporativo, relatórios prontos.", CTA "Entrar no beta privado"
- Seção 2: mockup visual de quiz com identidade aplicada (comparação genérico vs. com branding)
- Seção 3: CTA com campo de email para beta
- Sem grid de 3 colunas, sem cards de ícone+título+texto
  **Depends on:** Logo/identidade visual do Quizzy (pode usar placeholder)
  **Verify:** Página carrega em < 1s (3G sim), sem grid de features, hero ocupa toda a viewport
  **Effort:** human ~4h / CC ~30min

---

## P2 — Design System Doc

### T3 — Criar docs/DESIGN.md

**Files:** `docs/DESIGN.md` (novo)
**Why:** Sem documento de design system, cada novo contribuidor toma decisões independentes. Com 17 telas, o drift visual acumula rápido.
**What:** Documentar as decisões tomadas no plan-design-review de 2026-05-29:

- Tokens CSS (cores, tipografia)
- Tipografia aprovada (Geist Sans)
- 5 fontes de branding: Montserrat, DM Sans, Raleway, Playfair Display, Space Grotesk
- 12 avatares emoji aprovados
- Regras de microinteração (streak, ranking, resposta)
- Regras anti-slop (sem grid 3 colunas, sem Arial, sem gradiente genérico)
- Specs de estado vazio, loading, erro por tela
  **Verify:** Qualquer contribuidor pode ler e implementar sem perguntas adicionais
  **Effort:** human ~2h / CC ~20min

### T8 — Sessoes finalizadas: secao "Ver resultados"

**Files:** `apps/web/src/app/dashboard/page.tsx`
**Why:** Sessoes encerradas nao aparecem no painel operacional (filtrado por status ativos). Host que finalizou uma sessao nao tem caminho obvio para o relatorio a partir do dashboard. Custo: adicionar uma secao compacta de sessoes recentes finalizadas com link "Ver resultados".
**What:**

- Buscar as ultimas 5 sessoes com status `finished` da organizacao
- Exibir abaixo do painel operacional (acima da biblioteca), como lista compacta com quiz title + data de encerramento + link "Ver resultados →"
- Link aponta para `/dashboard/sessions/${id}`
  **Verify:** Apos encerrar uma sessao live, ela aparece na secao "Sessoes finalizadas recentes" com link de resultados
  **Effort:** human ~45min / CC ~8min

---

## P2 — Dashboard Polish (surfaced 2026-06-05)

### T7 — Mobile touch target: delete button overlaps quiz card link

**Files:** `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/delete-quiz-button.tsx`
**Why:** Delete button sits at `absolute right-4 top-4` sobre o link do card. Em 375px, tap no card pode acionar o delete. Não há undo para delete de quiz.
**What:**

- Mover o botão de delete para o rodapé do card (fora do `<Link>` wrap)
- Ou: adicionar `pointer-events-none` na área sobreposta e usar z-index para separar targets
- Garantir touch target mínimo de 44px para o delete button
  **Verify:** Em viewport 375px, clicar na área central do card navega para o quiz. Somente tocar no ícone de lixeira aciona o delete.
  **Effort:** human ~30min / CC ~5min

---

## P2 — Microinteractions

### T4 — Implementar streak badge e ranking animation

**Files:** `apps/web/src/app/play/` (player feedback e ranking screens)
**Why:** Mechânica de streak existe no backend (multiplicador até 1.5x) mas é invisível no cliente. Animação de ranking é o momento social mais importante do produto.
**What:**

- Feedback screen: badge "Sequência xN!" com multiplicador quando streak ≥ 2. Pulse keyframe quando streak ≥ 5.
- Ranking screen: stagger animation (bottom to top, 50-100ms por linha). Badge de delta "+2" / "-1".
- Resposta correta: scale 1.03 por 100ms, destaca verde. Contador de pontos animado (0 → X em 400ms).
- Tudo respeita `prefers-reduced-motion`.
  **Verify:** Sessão de teste com 3+ respostas corretas seguidas mostra badge e pulse. Ranking mostra stagger.
  **Effort:** human ~3h / CC ~20min

---

## P2 — Accessibility

### T5 — Contraste inline no editor de branding

**Files:** componentes do editor de branding (Sprint 2)
**Why:** Alerta existe no PRD (US-02) mas a UI não está especificada. Sem implementação, criadores não sabem qual cor está causando o problema.
**What:**

- Calcular razão de contraste WCAG AA (4.5:1) entre todos os pares de cor relevantes
- Mostrar chip âmbar inline abaixo do picker com problema: "Contraste insuficiente: X:1"
- Incluir sugestão de HEX que atingiria 4.5:1
- Preview: overlay vermelho semitransparente sobre texto afetado
- Não bloqueia save
  **Verify:** Picker com contraste 3:1 mostra alerta. Picker com 5:1 não mostra.
  **Effort:** human ~2h / CC ~15min
