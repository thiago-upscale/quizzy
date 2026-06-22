# Quizzy

Plataforma de quiz ao vivo para treinamentos corporativos e eventos no Brasil. Suporta branding por quiz, fluxo mobile-first para participantes e relatórios exportáveis para RH, T&D e eventos corporativos.

## Workspace

| Pacote          | Descrição                                                                       |
| --------------- | ------------------------------------------------------------------------------- |
| `apps/web`      | Next.js — dashboard do criador, APIs HTTP, páginas do participante e relatórios |
| `apps/realtime` | Socket.IO standalone — gerencia estado de sessões ao vivo via Redis             |

## Stack

- **Next.js 16** (App Router + Turbopack)
- **TypeScript** em todo o monorepo
- **Tailwind CSS** com sistema de tokens em CSS custom properties
- **Drizzle ORM** + PostgreSQL
- **Socket.IO** em serviço separado (`apps/realtime`)
- **Redis** para estado de sessão ao vivo
- **Auth.js** para autenticação de criadores
- **Zod** para validação de variáveis de ambiente
- **Railway** para deploy (volume Railway para assets)

## Funcionalidades

- Criação e edição de quizzes com múltiplas questões e imagens
- Branding por quiz (logo e imagem de fundo personalizados)
- Sessões ao vivo com entrada via PIN
- Display para telão em tempo real
- Experiência mobile-first para participantes
- Painel de operação para monitorar sessões ativas
- Histórico de sessões e resultados com exportação CSV

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

Ou serviços individuais:

```bash
pnpm dev:web       # Next.js em :3000
pnpm dev:realtime  # Socket.IO em :4001
```

### Variáveis de ambiente

Crie `apps/web/.env.local`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/quizzy
NEXTAUTH_SECRET=uma-chave-secreta-com-pelo-menos-32-caracteres
NEXTAUTH_URL=http://localhost:3000
REALTIME_URL=http://localhost:4001
REALTIME_INTERNAL_TOKEN=token-interno-com-pelo-menos-32-caracteres

# Opcionais
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
REDIS_URL=redis://localhost:6379
SENTRY_DSN=
```

### Banco de dados

```bash
# Gerar migração após alterar o schema
pnpm --filter @quizzy/web db:generate

# Aplicar migrações
pnpm --filter @quizzy/web db:migrate
```

## Qualidade

```bash
pnpm format:check   # Prettier
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm build          # Build de produção
```

## Deploy

O projeto roda no [Railway](https://railway.app) com dois serviços: `web` e `realtime`. Assets são armazenados no volume Railway montado em `RAILWAY_VOLUME_MOUNT_PATH`.
