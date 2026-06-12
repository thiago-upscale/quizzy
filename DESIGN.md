# Quizzy — Design System

Last updated: 2026-06-05 (generated from plan-design-review)

---

## Product Positioning

Quizzy is an **APP UI** product — not a marketing site. Every screen is task-focused, data-dense, and utility-first. Design decisions optimize for operational clarity over visual delight.

The one exception: quiz branding screens (the display/lobby) which are HYBRID — APP chrome with full-bleed brand expression in the quiz area.

---

## Color Tokens

Defined in `apps/web/src/app/globals.css`:

```css
--quizzy-navy:        #10233f   /* Primary brand — headers, strong CTA backgrounds */
--quizzy-teal:        #0f766e   /* Action color — buttons, links, published state */
--quizzy-accent:      #f59e0b   /* Warning / attention — interrupted sessions */
--quizzy-surface:     #f7f8fa   /* Page background */
--quizzy-surface-strong: #ffffff /* Card/panel background */
--quizzy-border:      #d8e2ee   /* Default border */
--quizzy-text:        #18202f   /* Primary text */
--quizzy-muted:       #667085   /* Secondary text, labels, timestamps */
--quizzy-success:     #0f766e   /* = teal; live/published/healthy state */
--quizzy-warning:     #b54708   /* Degraded/error state */
```

**When to use which:**
- Teal: primary action (Novo quiz, Iniciar sessão, Abrir quiz)
- Navy: secondary/structural (wordmark, headings, session card back)
- Accent: urgency/warning (interrupted sessions, degraded realtime)
- Muted: metadata that doesn't need to compete (dates, eyebrows, helper text)

---

## Typography

**Body font:** Geist Sans (loaded via `next/font/local`). Do not override with Arial, system-ui, or any Google Font for body text.

**Logo/wordmark font:** BBH Hegarty — loaded as `--quizzy-logo-font`. Used only for the Quizzy wordmark in the dashboard header and the participant join screen. Nowhere else.

**Branding quiz fonts (5 choices for quiz creators):** Montserrat, DM Sans, Raleway, Playfair Display, Space Grotesk — imported via Google Fonts. These are quiz-level customization, not product chrome.

**Type scale (in use):**

| Role | Size | Weight | Class |
|------|------|--------|-------|
| Page heading (h1) | 36–40px | 600 | `text-4xl font-semibold` |
| Section heading (h2) | 24px | 600 | `text-2xl font-semibold` |
| Card title | 20px | 600 | `text-xl font-semibold` |
| Body / helper | 14px / 1.75 line-height | 400 | `text-sm leading-7` |
| Eyebrow label | 12px | 600 | `text-xs uppercase tracking-[0.18em]` |
| Badge / status | **minimum 12px** | 600 | `text-xs` (never below this) |
| Metric value | 30px | 600 | `text-3xl font-semibold` |

---

## Spacing & Radius

**Border radius system:**
- Page header card: `rounded-[2rem]`
- Surface cards (SurfaceCard): `rounded-[1.75rem]`
- Content cards (quiz/session): `rounded-[1.5rem]` or `rounded-[1.4rem]`
- Small items (badges, pills, inputs): `rounded-full`

**Shadow system:**
- Subtle (cards at rest): `shadow-[0_8px_30px_rgba(16,35,63,0.04)]`
- Elevated (SurfaceCard): `shadow-[0_18px_70px_rgba(15,23,42,0.06)]`
- Hover lift: `hover:shadow-[0_16px_40px_rgba(16,35,63,0.08)]` + `-translate-y-0.5`

**Layout max-width:** `max-w-6xl` centered, `px-6 py-8` page padding.

---

## Component Rules

### Buttons
- **Primary CTA:** `bg-[var(--quizzy-teal)] text-white rounded-full px-5 py-2 text-sm font-semibold`
- **Secondary / outlined:** `border border-[var(--quizzy-border)] rounded-full px-5 py-2 text-sm font-semibold`
- Touch target minimum: 44px height on mobile (use `py-3` for mobile-primary actions)

### Status Badges
- Always `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]`
- **Never below 12px text.** The `text-[11px]` pattern is forbidden.
- Colors via color-mix: `bg-[color:color-mix(in_srgb,var(--token)_10%,white)]`
- Labels must be in Portuguese (see mapping below)

**Status label mapping (Portuguese):**
```
playing          → AO VIVO
question_result  → RESULTADO
countdown        → CONTAGEM
interrupted      → INTERROMPIDA
waiting          → AGUARDANDO
finished         → ENCERRADA
published        → PUBLICADO
draft            → RASCUNHO
```

### Cards (quiz/session)
- Background: `bg-[var(--quizzy-surface-strong)]`
- Border: `border border-[var(--quizzy-border)]`
- Hover: `-translate-y-0.5 hover:shadow-elevated`
- Delete/destructive actions: positioned OUTSIDE the `<Link>` wrapper, never overlapping the card tap target

### EmptyStateCard
- Always has: title (warm, action-oriented), description (context), primary action button
- Never: "No items found." or raw zero states

### MetricCard
- Accent variants: amber (warning), teal (positive), navy (neutral)
- Helper text optional but recommended for context

---

## Dashboard Information Architecture

**Shell (2026-06-11):** sidebar fixa no desktop (`dashboard/layout.tsx`), topbar com nav horizontal no mobile. Navegação persistente em todas as rotas `/dashboard/*`.

**Sidebar nav (ordem fixa):**
1. Quizzes → `/dashboard` (administração — página inicial)
2. Operação ao vivo → `/dashboard/operacao` (métricas, sessões abertas, sinais, saúde)
3. Resultados → `/dashboard/resultados` (sessões finalizadas + relatórios)
4. Conta → `/dashboard/account`

Rodapé da sidebar: nome + email do usuário + botão Sair. Não há botões de conta/sair no header das páginas.

**Page header pattern:** eyebrow (teal, uppercase) + h1 + helper + no máximo UM CTA primário à direita (ex.: "Novo quiz"). Nunca dois grupos de botões competindo.

**Rationale (decisão do usuário, 2026-06-11):** a administração de quizzes é o trabalho principal do dashboard; operação ao vivo tem página própria e um banner de alerta puxa o host para lá quando alguma sessão pede atenção.

**Wordmark:** o logo é idêntico ao da home — `uppercase tracking-[0.14em]`, peso normal, `--quizzy-logo-font`, cor navy. Nunca `font-bold tracking-tight`.

---

## Accessibility Baseline

- Body text minimum: 16px (use `text-sm` = 14px only for metadata/labels that are secondary)
- Badge text minimum: 12px (`text-xs`)
- Touch targets minimum: 44px (use `min-h-[44px]` for interactive elements)
- All card links need `aria-label` describing the action and content: `aria-label="Sessão A Grande Virada — ao vivo, 1 participante"`
- Color is never the only differentiator — status badges use color + label + context
- Respect `prefers-reduced-motion` for all keyframe animations

---

## Anti-Patterns (Forbidden)

1. `font-family: Arial` anywhere — Geist Sans is the body font
2. `text-[11px]` — minimum badge size is `text-xs` (12px)
3. 3-column feature grids with icon + title + description
4. Generic hero copy ("Bem-vindo ao Quizzy", "Sua solução completa")
5. Decorative blobs, floating circles, wavy SVG dividers
6. Colored left borders on cards (`border-l-4`)
7. Gradient backgrounds for structural UI (only for quiz branding displays)
8. `system-ui` or `-apple-system` as primary display font
9. Status labels in English/raw DB values shown to end users
10. Absolute-positioned destructive actions overlapping link tap targets

---

## Motion

**Keyframes defined in globals.css:**
- `quizzy-rise`: fade-in from translateY(18px) — use for page/card entrance
- `quizzy-pulse-soft`: scale + glow pulse — use for live status indicators

Always wrap in `@media (prefers-reduced-motion: no-preference)`.

---

## NOT in Scope (design decisions explicitly deferred)

- Mobile-first quiz creation flow (Individual mode sprint)
- Dark mode (deferred indefinitely — not in PRD v2)
- Keyboard shortcut system
- Drag-and-drop quiz ordering
- PDF/print styles for reports
