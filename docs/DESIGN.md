# Quizzy Design System

## Purpose

This document defines the shared visual language for Quizzy so new screens do not drift into starter-template UI.

## Core Direction

Quizzy should feel:

- corporate and premium
- clear before flashy
- product-led instead of engineering-led
- trustworthy in live operational moments

## Typography

### App shell

- default font: `Geist Sans`
- mono/supporting font: `Geist Mono`

### Approved branding fonts for quizzes

These are the pre-approved type options for creator branding controls:

- `Montserrat`
- `DM Sans`
- `Raleway`
- `Playfair Display`
- `Space Grotesk`

Use them only where quiz branding is being previewed or applied. Do not replace the product shell typography with them by default.

## Color Tokens

Use semantic tokens instead of raw hex values when possible.

```css
:root {
  --quizzy-navy: #10233f;
  --quizzy-teal: #0f766e;
  --quizzy-accent: #f59e0b;
  --quizzy-surface: #f7f8fa;
  --quizzy-surface-strong: #ffffff;
  --quizzy-border: #d8e2ee;
  --quizzy-text: #18202f;
  --quizzy-muted: #667085;
  --quizzy-success: #0f766e;
  --quizzy-warning: #b54708;
}
```

## Avatar Set

Approved avatar set:

- `🦊`
- `🦉`
- `🐻`
- `🐯`
- `🦁`
- `🐸`
- `🐧`
- `🦋`
- `🦄`
- `🐺`
- `🦅`
- `🦔`

## Motion Rules

- motion should reinforce feedback, not decorate empty space
- prefer short, meaningful transitions over constant animation
- streak and ranking motion must respect `prefers-reduced-motion`
- loading states should use skeletons before spinners when layout is already known

## Anti-Slop Rules

Avoid:

- Arial as the primary font
- generic three-column feature grids as the core story of a page
- flat single-color empty canvases
- icon plus title plus paragraph cards repeated without hierarchy
- copy that describes infrastructure before value

Prefer:

- one dominant message per section
- product compositions over abstract marketing cards
- semantic tokens over repeated raw hex values
- visible hierarchy between product value, workflow, and proof

## State Guidance

### Empty states

- explain what the user should do next
- include one primary action
- avoid raw empty tables or contextless "none found" copy

### Loading states

- prefer skeletons for dashboards, reports, and cards
- keep layout stable while content loads

### Error states

- state the problem in plain PT-BR
- offer a next action when possible
- use amber or red sparingly and with readable contrast
