# @quizzy/web

Aplicação Next.js do Quizzy — dashboard do criador, APIs internas, páginas do participante e relatórios.

Veja o [README raiz](../../README.md) para setup completo do monorepo.

## Estrutura

```
src/
├── app/
│   ├── dashboard/          # Área do criador (quizzes, sessões, operação, resultados)
│   ├── play/[shareToken]/  # Página pública de participação via link
│   ├── live/[pin]/         # Fluxo ao vivo: entrada, lobby, display, questões
│   ├── api/                # APIs HTTP (assets, sessões internas)
│   └── (auth)/             # Login, registro, recuperação de senha
├── components/             # Componentes reutilizáveis
├── db/                     # Schema Drizzle e cliente PostgreSQL
├── lib/                    # Helpers: auth, sessão, datetime, etc.
└── env.ts                  # Validação de variáveis de ambiente (Zod)
```
