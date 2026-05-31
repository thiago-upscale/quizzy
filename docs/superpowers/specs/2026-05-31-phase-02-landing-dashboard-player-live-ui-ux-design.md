# Phase 02 UI/UX Design — Landing, Dashboard, Player And Live Entry

**Date:** 2026-05-31  
**Status:** Draft for review  
**Related references:** [PRD-Quizzy-v2.md](/Users/thiago/Documents/Quizzy/PRD-Quizzy-v2.md:1), [docs/DESIGN.md](/Users/thiago/Documents/Quizzy/docs/DESIGN.md:1), [2026-05-29-branding-first-landing-and-design-system-design.md](/Users/thiago/Documents/Quizzy/docs/superpowers/specs/2026-05-29-branding-first-landing-and-design-system-design.md:1), [2026-05-30-phase-01-editor-reports-account-ui-ux-design.md](/Users/thiago/Documents/Quizzy/docs/superpowers/specs/2026-05-30-phase-01-editor-reports-account-ui-ux-design.md:1)

## 1. Purpose

This spec defines Phase 02 of the Quizzy UI/UX refinement work. The goal is to apply the PRD and `DESIGN.md` guidance to the public and operational surfaces that shape first impression, participant entry, and live usage:

- landing page
- dashboard overview
- PIN entry and live entry
- lobby and player/live flow

This phase follows Phase 01 and should reuse its shared visual language where appropriate.

## 2. Phase Goal

Phase 02 must balance two priorities that often compete:

- conversion and brand perception
- operational clarity and speed of use

The target outcome is:

- landing sells the branding-first thesis convincingly
- dashboard reads like a lightweight operations center
- entry and participant flows feel fast and trustworthy on mobile
- live/player screens preserve branding without reducing clarity in critical moments

## 3. Scope

### In scope

- landing page structure and visual narrative
- dashboard overview hierarchy and empty states
- `/join`
- `/live/[pin]`
- participant identification form
- lobby and player/live presentation states
- loading, empty, reconnecting, and ended-session states for these surfaces

### Out of scope

- quiz editor
- reports
- account area
- realtime business logic changes
- score rules or game mechanics refactors
- major host desktop redesign beyond consistency improvements

## 4. Recommended Approach

Recommended approach: **brand-first landing with disciplined operational UI**.

This means:

- landing carries the strongest emotional and visual storytelling
- dashboard emphasizes clarity, prioritization, and next actions
- join and live entry optimize for immediate comprehension on mobile
- lobby/player keep branding present, but subordinate it to state, question, timer, and feedback

This is recommended because it matches the PRD: strong perception on entry, strong operational confidence during use.

## 5. Delivery Order

### Step 1. Landing

Define the strongest product narrative first:

- what Quizzy is
- why branding matters
- how create, run live, and monitor fit together

Landing should establish the visual and narrative tone for the rest of the phase.

### Step 2. Public entry

Refine `/join` and `/live/[pin]` next, because they are the participant’s first operational contact point and must be fast to understand on mobile.

### Step 3. Lobby and player/live

Apply the same language to lobby and player states:

- waiting
- countdown
- active question
- result
- reconnecting
- interrupted
- finished

### Step 4. Dashboard

Finish with the dashboard overview so it benefits from the visual and state conventions already validated in public and participant-facing flows.

## 6. Product Principles Applied

This phase applies the following product and design rules:

- one dominant message per section
- product composition over generic marketing cards
- strong hierarchy in operational moments
- mobile-first clarity for participant flows
- semantic tokens over repeated raw colors
- meaningful motion only where it reinforces feedback
- reconnecting/offline/ended states must be obvious and recoverable

## 7. Landing Design

### 7.1. UX goal

The landing must prove the Quizzy thesis visually:

`quizzes with the identity of your company, operated with confidence in live corporate settings`

It should not feel like:

- a technical showcase
- a generic SaaS grid
- a placeholder homepage

### 7.2. Structure

Landing should follow a branding-first sequence:

1. hero with strong branded quiz composition
2. visual proof of branded product experience
3. concise create → run → monitor narrative
4. proof or trust layer
5. final CTA

### 7.3. Hero expectations

The hero must show:

- branded live quiz atmosphere
- strong headline around corporate branded quizzes
- short PT-BR value copy
- single dominant primary CTA
- restrained secondary path depending on auth state

The composition should feel like a real product scene, not abstract cards.

### 7.4. Design rules

- avoid equal three-column story sections as the main narrative
- avoid decorative emoji
- avoid generic purple/blue gradients disconnected from Quizzy tokens
- use the `navy + teal + amber` system with light, premium surfaces

## 8. Dashboard Design

### 8.1. UX goal

The dashboard should answer quickly:

- what is active now?
- what needs attention?
- how healthy is the system?
- what should I do next?

### 8.2. Reading order

The intended reading order is:

1. top operational framing
2. health and key signals
3. sessions needing attention
4. recent platform activity
5. quiz library

### 8.3. Empty-state expectations

The first-access state must be strong and onboarding-oriented:

- no raw empty list language
- one clear message
- one clear primary action
- optional branded visual reinforcement

### 8.4. Visual goals

- less “list of cards”
- more “operations surface with clear priority”
- stronger contrast between urgent/active/archival information
- calmer but more intentional hierarchy

## 9. Public Entry Design

### 9.1. UX goal

`/join` and `/live/[pin]` must be instantly understandable on mobile.

The participant should know in seconds:

- whether they are in the right place
- what information is required
- what the room state is
- what to do if returning or blocked

### 9.2. `/join`

`/join` should prioritize:

- dominant PIN field
- confidence and clarity over decoration
- large touch targets
- clean error path

The page should feel like a fast operational gateway, not a marketing screen.

### 9.3. `/live/[pin]`

The live entry screen should distinguish three clear states:

- first-time entry
- returning participant with recoverable session
- closed/unavailable session

Each state should feel explicit and trustworthy, with clear next actions.

### 9.4. Copy and errors

Error states should be more specific and action-oriented, especially for:

- invalid or expired session
- session no longer accepting entrants
- participant continuation unavailable

## 10. Lobby And Player/Live Design

### 10.1. UX goal

These screens must prioritize operational clarity while keeping the Quizzy brand present.

Branding should live in:

- atmosphere
- logo
- typography
- accent usage

It should not overpower:

- room state
- countdown
- timer
- answer actions
- feedback

### 10.2. Lobby priorities

The lobby should communicate:

- you are in the right room
- the host is controlling the rhythm
- your identity and continuity are safe
- what is happening now

The lobby should feel calm and ready, not over-decorated.

### 10.3. Player priorities

The question screen should emphasize:

- prompt
- options
- timer
- current score/streak
- submit state

Everything else should be secondary.

### 10.4. Result and ranking priorities

The result state should communicate:

- correct vs wrong clearly
- points gained clearly
- streak impact clearly
- rank changes without visual overload

Ranking and result transitions should support the user’s understanding, not just add spectacle.

### 10.5. Reconnection and interruption

Reconnection states must be visible, readable, and non-ambiguous:

- reconnecting
- host disconnected / paused
- cannot continue
- ended session

These states should feel operational and recoverable, not alarming by default.

## 11. Shared Phase 02 Patterns

Phase 02 should reuse the Phase 01 shared UI base where possible:

- surfaces
- alerts
- empty states
- section hierarchy
- skeletons

Additional shared needs for this phase:

- stronger mobile spacing discipline
- participant-friendly full-width action buttons
- clear room-state badges
- reusable session-state banners

## 12. Loading State Expectations

Loading states should be added to major route-level surfaces where layout is known:

- landing if needed for deferred areas
- dashboard
- join
- live entry
- lobby / player route

Use skeletons or stable placeholders rather than blank canvas plus spinner.

## 13. Risks

### Risk 1. Over-branding participant flows

Too much composition or ornament can slow down mobile comprehension.

Mitigation:

- participant task always wins
- branding stays atmospheric, not dominant

### Risk 2. Dashboard over-structuring

Adding too many layers may reduce scan speed.

Mitigation:

- keep a strict reading order
- highlight only truly operational blocks

### Risk 3. Live-state regressions

Lobby/player visual changes can easily create regressions in edge states.

Mitigation:

- preserve existing behavior
- focus on hierarchy, feedback, and state presentation

## 14. Acceptance Criteria

Phase 02 is complete when:

- landing clearly expresses the branding-first Quizzy thesis
- landing no longer depends on generic marketing-grid storytelling
- dashboard reads more like an operations center than a list of entities
- `/join` and `/live/[pin]` are clearer and faster to use on mobile
- lobby and player/live prioritize state, timer, question, and action over decoration
- reconnecting, paused, and ended states are easier to understand
- visual consistency improves across public, participant, and dashboard surfaces

## 15. Non-goals

This phase does not attempt to:

- redesign the full host control experience from scratch
- change realtime domain behavior
- introduce new product capabilities beyond current support
- solve all future marketing-page needs beyond the MVP landing

## 16. Next Step After Approval

After user approval of this spec:

1. rebuild landing around branding-first conversion
2. refine `/join` and `/live/[pin]`
3. refine lobby and player/live states
4. polish dashboard overview hierarchy and empty states
5. verify consistency and critical-state readability
