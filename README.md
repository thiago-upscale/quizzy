# Quizzy

Quizzy is a realtime quiz platform for Brazilian corporate training and events, with per-quiz branding, mobile-first player flows, and reports for HR, training, and corporate events.

## Workspace

- `apps/web`: Next.js app for creators, players, reports, and HTTP APIs.
- `apps/realtime`: standalone Socket.io server for live sessions.

## Planned Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Drizzle ORM + PostgreSQL
- Socket.io in a standalone service
- Redis for live session state
- Cloudflare R2 for branding assets
- Auth.js for creator authentication
- Sentry + Pino for observability

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

## Next Technical Sprint

1. Provision PostgreSQL and Redis.
2. Connect Drizzle migrations to the database.
3. Implement creator auth.
4. Implement quiz CRUD.
5. Add publish flow with immutable `quiz_versions`.
