# TODOS — Quizzy Design Debt

Items surfaced from `/plan-design-review` on 2026-05-29. Each item has a priority (P1 = blocks beta, P2 = should land same branch/sprint, P3 = follow-up).

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
