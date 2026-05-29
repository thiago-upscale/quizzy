# Branding-First Landing And Design System Design

## Objective

Raise the visual quality of the Quizzy web app so the MVP reads like a credible B2B product instead of a technical foundation.

This pass must deliver:

- a real global design foundation with reusable tokens
- Geist Sans as the actual default typeface
- a branding-first landing page focused on product perception
- written design guidance contributors can reuse on future screens

## Scope

This design covers:

- `apps/web/src/app/globals.css`
- `apps/web/src/app/page.tsx`
- `docs/DESIGN.md`

This design does not cover:

- dashboard refactors
- live gameplay microinteractions
- branding editor contrast validation
- new backend behavior

## Direction

Use a `corporativo premium` direction:

- calm, premium, B2B-friendly
- strong hierarchy
- light surfaces with depth
- navy as the trust color
- teal as the active product color
- amber as the sparing accent

The landing should feel like software for corporate training and events, not a starter template and not an engineering showcase.

## Recommended Approach

Deliver one cohesive visual pass:

1. establish semantic CSS tokens in `globals.css`
2. remove the Arial override and let Geist Sans become the default app typeface
3. rebuild the landing around a strong hero and a product-real composition
4. capture the resulting system in `docs/DESIGN.md`

This is recommended because it improves both immediate perception and future implementation consistency.

## Design Foundation

### Typography

- default application font: `Geist Sans`
- mono/supporting font: `Geist Mono`

### Core tokens

Recommended semantic token set:

- `--quizzy-navy`
- `--quizzy-teal`
- `--quizzy-accent`
- `--quizzy-surface`
- `--quizzy-surface-strong`
- `--quizzy-border`
- `--quizzy-text`
- `--quizzy-muted`
- `--quizzy-success`
- `--quizzy-warning`

These should also be mapped into Tailwind v4 theme variables through `@theme inline`.

## Landing Structure

### Hero

The first viewport should show:

- label: `Quizzy`
- headline about branded corporate quizzes
- short value-focused supporting copy
- primary CTA: `Criar conta`
- secondary CTA based on auth state
- large product composition on the right or below on smaller screens

### Product composition

Use a product-real composition instead of icon cards:

- one panel represents a branded live quiz experience
- one companion panel represents operational visibility
- composition should imply create, run live, and monitor

### Trust strip

Replace generic feature cards with a tighter horizontal row of proof-oriented statements:

- identidade visual aplicada
- sessoes ao vivo com PIN
- relatorios prontos para operacao

### Product flow section

Show a simple three-step narrative:

1. configure branding
2. run the live session
3. monitor results and session health

### Final CTA

Repeat the account-creation CTA with concise copy and no extra friction.

## Documentation Deliverable

Create `docs/DESIGN.md` to document:

- approved tokens
- approved typography
- brand-supporting font options for future quiz branding
- approved avatar set
- motion rules
- anti-slop rules
- empty, loading, and error state guidance

## Validation

Success criteria:

- landing no longer shows a three-column technical stack grid
- body renders with Geist Sans instead of Arial
- build passes
- design rules are documented in one discoverable place
