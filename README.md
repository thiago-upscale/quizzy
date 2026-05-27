# Quizzy

Quizzy is a realtime quiz platform for Brazilian corporate training and events.

## Workspace

- `apps/web`: Next.js app for creators, players, reports, and HTTP APIs.
- `apps/realtime`: standalone Socket.io server for live sessions.

## Local Development

```bash
pnpm install
pnpm dev
```

Run individual services:

```bash
pnpm dev:web
pnpm dev:realtime
```

Quality checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

Generate database migrations:

```bash
pnpm --filter @quizzy/web db:generate
```
