# Phase 01 UI/UX Design — Editor, Reports, Account

**Date:** 2026-05-30  
**Status:** Draft for review  
**Related references:** [PRD-Quizzy-v2.md](/Users/thiago/Documents/Quizzy/PRD-Quizzy-v2.md:1), [docs/DESIGN.md](/Users/thiago/Documents/Quizzy/docs/DESIGN.md:1)

## 1. Purpose

This spec defines Phase 01 of the Quizzy UI/UX refinement work. The goal is to jointly apply the product experience guidance from the PRD and the visual/system guidance from `DESIGN.md` to three creator-facing surfaces:

- quiz editor
- session reports
- account area

This phase intentionally excludes the landing page, dashboard overview, and live/player flows. Those belong to Phase 02.

## 2. Phase Goal

Phase 01 should make the creator experience feel:

- more premium and corporate
- more consistent across screens
- clearer in hierarchy and next actions
- closer to the intended Quizzy product identity

Success in this phase is not defined only by visual polish. It is defined by:

- stronger adherence to Quizzy tokens, typography, and state guidance
- fewer raw one-off styling decisions
- clearer empty, loading, success, and error states
- better executive readability in reports
- stronger creation confidence in the editor

## 3. Scope

### In scope

- shared UI patterns needed by editor, reports, and account
- visual and UX refinements for account
- visual and UX refinements for reports
- visual and UX refinements for quiz editor
- improved hierarchy, copy, alerts, empty states, and loading states
- better alignment with PRD and `DESIGN.md`

### Out of scope

- landing page
- dashboard overview page
- join, lobby, player, and host live flows
- data model refactors unrelated to these screens
- new analytics or backend capabilities not already supported by the product

## 4. Product Principles Applied

This phase applies the following PRD and design-system decisions:

- one dominant message per section
- semantic tokens over repeated raw hex values
- clear product hierarchy over generic admin layout
- empty states must explain what to do next and include one clear action
- loading states should prefer skeletons when the layout is already known
- error states should be plain PT-BR and offer a next action when possible
- branding should feel like a real product differentiator, not an optional settings panel

## 5. Recommended Approach

Recommended implementation approach: **surface polish with a thin shared UI layer**.

This means:

- do not start with a large abstract design-system refactor
- create only the reusable surface patterns needed now
- validate the language first in smaller screens
- then apply the same language to denser screens

This gives strong visible improvement without delaying the work behind infrastructure-heavy abstraction.

## 6. Delivery Order

### Step 1. Shared visual base

Introduce a small shared layer for:

- surface/card treatments
- status badges
- alerts
- empty states
- skeleton states
- consistent form section spacing and titles

This layer should be light and local to Phase 01 needs. It should reduce repeated styling decisions without forcing a large component-system rewrite.

### Step 2. Account

Use the account page as the first proving ground for the updated language because:

- it is smaller and safer to change
- it has distinct content blocks
- it helps validate typography, surfaces, and feedback states quickly

### Step 3. Reports

Apply the shared language to session reports, focusing on:

- executive-first reading
- hierarchy before detail
- visible export actions
- better loading and empty states

### Step 4. Editor

Apply the refined system to the editor last because it is the most complex surface. By this point, surfaces, alerts, states, and form patterns should already be validated in smaller contexts.

## 7. Shared UI Base

### 7.1. Typography and surfaces

- Keep `Geist Sans` and `Geist Mono` as shell typography.
- Favor semantic token usage from `globals.css`.
- Reduce direct hex usage in these screens unless truly necessary for dynamic preview.
- Use calmer surface hierarchy with:
  - primary white/strong surface for main content
  - soft tinted surface for secondary data blocks
  - restrained borders and shadows

### 7.2. Shared patterns

Create consistent patterns for:

- `section header`: eyebrow, title, helper copy
- `metric card`: small summary stat with label and optional supporting note
- `status badge`: draft, published, success, warning, degraded, configured/not configured
- `alert`: success, warning, error, informational
- `empty state`: headline, explanation, one primary action
- `skeleton block`: card-sized placeholders for known layouts

### 7.3. State behavior

- Use inline alerts for local form errors and confirmations.
- Avoid generic isolated messages with weak hierarchy.
- Keep layouts stable during loading.
- Avoid raw table empties without guidance.

## 8. Account Design

### 8.1. UX goal

The account page should feel like an identity and access center, not a forgotten admin page.

### 8.2. Content hierarchy

Three blocks remain, but with sharper meaning:

- `Perfil`: primary block, creator identity and company
- `Seguranca`: trust block, password and recovery
- `Google`: integration/status block, whether social login is ready

### 8.3. UI changes

- strengthen page hero hierarchy and reduce visual noise
- give profile the strongest prominence
- make security states feel safer and more explicit
- treat Google as status communication, not just static copy
- unify spacing, borders, buttons, and feedback styling

### 8.4. State expectations

- success messages should feel affirmative and stable
- validation errors should be direct and actionable
- disabled/unavailable Google state should read as “prepared but awaiting configuration”

## 9. Reports Design

### 9.1. UX goal

Reports should be readable in two passes:

1. fast executive understanding
2. detailed verification and export

### 9.2. Information order

Reports should open with a top summary layer before raw tables. The summary should prioritize:

- final ranking signal
- average accuracy signal
- average response time signal
- hardest-question signal

Only after that should detailed tables dominate the page.

### 9.3. UI changes

- add summary cards above tabular content
- clarify exports as operational actions
- visually separate overview from detailed breakdown
- improve table wrappers and section transitions

### 9.4. Empty and loading states

- loading should use skeleton cards and skeleton table areas
- leaderboard empty should explain that no participant data was recorded
- attempts empty should explain that no attempt was completed yet
- avoid report areas that look broken or unfinished while data is absent

### 9.5. Data constraint

Do not fabricate analytics not supported by current backend data. If “hardest question” is not currently materialized, compute it only if reliable from existing report inputs; otherwise ship the summary structure and keep the metric out until support is confirmed.

## 10. Editor Design

### 10.1. UX goal

The editor should feel like a premium creation tool, not a CRUD screen with a preview attached.

### 10.2. Core experience structure

The editor should more clearly express three layers:

- `Operar`: publication and session setup
- `Construir conteudo`: questions, timing, answers, media
- `Aplicar marca`: branding controls and preview confidence

### 10.3. UI changes

- sharpen separation between session operations and content editing
- strengthen preview credibility so it feels closer to the real product surface
- improve branding control clarity and accessibility feedback
- make upload, save, and publish states more legible
- reduce perceived density of forms by grouping and spacing better

### 10.4. Branding-specific expectations

- preview should visibly communicate Quizzy’s branding-first value
- contrast warnings should feel premium and useful, not just technical
- asset upload states should be clearer for success, error, and empty
- font selection should align with approved product direction in the relevant source docs

### 10.5. Empty-state expectations

Where the editor lacks content, the UI should tell the creator what to add next. It should avoid raw blank sections or dead-looking form space.

## 11. Risks

### Risk 1. Editor complexity

The editor has the highest density and the highest chance of accidental regressions. Mitigation:

- keep data behavior unchanged where possible
- focus changes on layout, grouping, feedback, and preview presentation

### Risk 2. Over-refactoring

Trying to build a broad design system mid-stream could slow delivery. Mitigation:

- create only the reusable patterns needed for these three surfaces

### Risk 3. Report over-promising

The desired report hierarchy is ahead of some existing analytics depth. Mitigation:

- elevate supported insights first
- do not imply metrics the backend cannot support reliably

## 12. Acceptance Criteria

Phase 01 is complete when:

- account, reports, and editor visibly share a stronger Quizzy visual language
- these screens rely more on shared tokens/patterns and less on repeated raw styles
- account has clearer status and trust communication
- reports start with a strong summary layer before detail tables
- reports have improved loading and empty states
- editor has clearer separation between operation, content, and branding
- branding feedback in the editor is easier to understand and trust
- the overall result feels closer to the PRD + `DESIGN.md` direction than to a starter-template UI

## 13. Non-goals for This Phase

This phase does not attempt to:

- complete all analytics ambitions from the PRD
- solve Phase 02 surfaces in advance
- refactor the entire app into a full component library
- change live session business logic

## 14. Next Step After Approval

After user approval of this spec:

1. implement the shared visual base
2. polish account
3. polish reports
4. polish editor
5. verify UI consistency and state behavior across the three surfaces
