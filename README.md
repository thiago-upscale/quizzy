# Quizzy

Quizzy e uma plataforma web de quizzes corporativos em tempo real, com foco em branding por quiz, experiencia mobile-first e relatorios para RH, T&D e eventos.

Este repositorio iniciou a execucao do PRD v2 pela fundacao tecnica e pelo fluxo principal: criador, entrada por PIN, design system, schema e servidor realtime standalone.

## Stack planejada

- Next.js 15 com App Router
- TypeScript
- Tailwind CSS
- Drizzle ORM + PostgreSQL
- Socket.io em container standalone
- Redis para estado operacional de sessoes live
- Cloudflare R2 para assets de branding
- Auth.js para autenticacao do criador
- Sentry + Pino para observabilidade

## Como rodar

O ambiente atual nao possui `npm` disponivel no PATH. Quando Node/npm estiverem instalados localmente:

```bash
npm install
npm run dev
```

Para o servidor realtime:

```bash
npm run realtime:dev
```

## Estrutura

- `src/app`: rotas Next.js, landing, dashboard, entrada por PIN e healthcheck.
- `src/components`: componentes reutilizaveis da UI.
- `src/domain`: regras de negocio, validacoes e contratos.
- `src/server/db`: schema Drizzle baseado no PRD v2.
- `src/server/auth`: configuracao inicial Auth.js.
- `apps/realtime`: servidor Socket.io standalone.
- `design-system`: tokens visuais importados do design system.
- `docs`: documentacao e preview visual.

## Proxima sprint tecnica

1. Instalar dependencias e validar build.
2. Conectar Drizzle ao PostgreSQL.
3. Implementar CRUD real de quizzes.
4. Criar fluxo de publicacao.
5. Conectar lobby ao servidor Socket.io.
6. Persistir sessoes e participantes.
