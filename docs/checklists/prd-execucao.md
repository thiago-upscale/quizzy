# Checklist de Execucao do PRD — Quizzy

**Referencia:** [PRD-Quizzy-v2.md](/Users/thiago/Documents/Quizzy/PRD-Quizzy-v2.md:1)  
**Atualizado em:** 28 de maio de 2026  
**Objetivo:** acompanhar a execucao do MVP por sprint do PRD, com status operacional real.

## Legenda de status

- `Concluido`: entregue e validado no fluxo principal
- `Parcial`: existe, mas nao cobre tudo do PRD ou ainda precisa polimento
- `Faltando`: ainda nao implementado
- `Bloqueado`: depende de credencial, decisao externa ou validacao fora do codigo

## Resumo rapido

- **Avanco geral estimado:** 65%-70%
- **Mais maduro hoje:** Sprint 3, Sprint 4 e parte da Sprint 6
- **Maior bloco pendente:** Sprint 5 — Modo Individual
- **Antes do beta:** observabilidade, hardening e itens operacionais de LGPD

## Sprint 0 — Fundacao

**Objetivo da sprint:** colocar a base tecnica e operacional no ar.

| Item                                             | Status    | Observacoes                                                                                            |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------ |
| Monorepo `pnpm` com `apps/web` e `apps/realtime` | Concluido | Estrutura criada e em uso                                                                              |
| Next.js + TypeScript + Tailwind                  | Concluido | Base do app web ativa                                                                                  |
| Socket.io em servico separado                    | Concluido | Realtime isolado conforme PRD                                                                          |
| PostgreSQL + Drizzle                             | Concluido | Schema e migrations em uso                                                                             |
| Redis para estado live                           | Concluido | Integrado ao realtime                                                                                  |
| Railway com servicos `web` e `realtime`          | Concluido | Deploy funcional                                                                                       |
| GitHub Actions basico                            | Concluido | Format, lint, typecheck e build                                                                        |
| Sentry e observabilidade operacional completa    | Parcial   | Logs estruturados e painel operacional base existem; ainda falta fechamento completo com monitoramento |

**Proximo passo recomendado:** fechar observabilidade e operacao minima para beta.

## Sprint 1 — Criador e Editor

**Objetivo da sprint:** permitir criar, editar, publicar e operar quizzes.

| Item                                  | Status    | Observacoes                                                                                            |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| Cadastro via email/senha              | Concluido | Fluxo implementado                                                                                     |
| Login protegido e dashboard           | Concluido | Rotas protegidas em uso                                                                                |
| CRUD de quizzes                       | Concluido | Fluxo principal funcional                                                                              |
| Publicacao com snapshot/versionamento | Concluido | `quiz_versions` ativo                                                                                  |
| Tipos de pergunta: multipla escolha   | Concluido | Base do live usa esse formato                                                                          |
| Tipo Verdadeiro/Falso                 | Parcial   | Precisa confirmar UX dedicada no editor e validacao fim a fim                                          |
| Tempo limite e pontos por pergunta    | Concluido | Em uso no fluxo live                                                                                   |
| Imagem opcional por pergunta          | Parcial   | Upload ligado no editor, persistido no quiz e exibido no fluxo live; ainda falta polimento operacional |
| Preview do quiz                       | Parcial   | Existe preview base, ainda nao no nivel completo do PRD                                                |

**Proximo passo recomendado:** fechar imagens por pergunta e revisar suporte final a Verdadeiro/Falso.

## Sprint 2 — Branding

**Objetivo da sprint:** tornar branding um diferencial real do produto.

| Item                                | Status  | Observacoes                                                                                      |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| Cor primaria/secundaria/destaque    | Parcial | Base visual e configuracao existem, mas ainda pedem revisao fina                                 |
| Upload de logo                      | Parcial | Upload ligado no branding, preview do editor e entrada live; ainda falta refinamento operacional |
| Upload de background                | Parcial | Upload ligado no branding, preview do editor e entrada live; ainda falta refinamento operacional |
| Selecao de fonte                    | Parcial | Parte visual existe, precisa confirmar opcoes e persistencia final                               |
| Validacao de contraste WCAG         | Parcial | Intencao e parte do design existem, falta fechar como requisito tecnico completo                 |
| Branding consistente no host/player | Parcial | Ja aparece no fluxo, mas ainda nao considero 100% do PRD                                         |

**Proximo passo recomendado:** validar o fluxo em Railway com Volume anexado e depois seguir para Sprint 5.

## Sprint 3 — Sessao Live (Core)

**Objetivo da sprint:** entregar a sessao ao vivo principal do produto.

| Item                             | Status    | Observacoes                      |
| -------------------------------- | --------- | -------------------------------- |
| Criacao de sessao Live           | Concluido | Fluxo ativo no dashboard         |
| Geracao de PIN                   | Concluido | Em uso                           |
| QR Code de acesso                | Concluido | Em uso                           |
| Entrada publica por PIN/link     | Concluido | Join e link direto implementados |
| Lobby do participante            | Concluido | Com lista e status da sala       |
| Presenca em tempo real           | Concluido | Host acompanha entrada e saida   |
| Countdown inicial                | Concluido | Implementado                     |
| Pergunta ao vivo                 | Concluido | Fluxo operacional                |
| Envio de resposta em realtime    | Concluido | Persistido e validado            |
| Resultado por pergunta           | Concluido | Entregue                         |
| Ranking entre perguntas          | Concluido | Entregue                         |
| Tela final da sessao             | Concluido | Entregue                         |
| Encerramento de sessao pelo host | Concluido | Fluxo funcional                  |

**Proximo passo recomendado:** seguir apenas com polimento e validacao de carga.

## Sprint 4 — Reconexao e Robustez

**Objetivo da sprint:** tornar o Live confiavel em uso real.

| Item                                           | Status    | Observacoes                                                                                                        |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| Reconexao do participante com mesmo token      | Concluido | Sem duplicar participante                                                                                          |
| Retomada confirmada da sessao                  | Concluido | Fluxo "Retomar agora" implementado                                                                                 |
| Estado restaurado apos reconexao               | Concluido | Lobby, pergunta, resultado e final                                                                                 |
| Host vendo `online/offline`                    | Concluido | Em producao                                                                                                        |
| Contagem real de conectados                    | Concluido | Separada do ranking                                                                                                |
| Reconexao do host em ate 5 min                 | Parcial   | Painel do host agora exibe reconexao, janela de recuperacao e retomada; ainda falta validar a meta completa do PRD |
| Persistencia segura sem depender so de memoria | Parcial   | Snapshot interno e hidratacao de sala apos restart do realtime entregues; ainda vale validar em carga              |
| Protecoes de limite/abuso                      | Parcial   | Ja existe rate limit leve de PIN e rejeicao estruturada de respostas; ainda falta endurecimento maior              |

**Proximo passo recomendado:** executar teste de carga controlado e observar comportamento de recuperacao.

## Sprint 5 — Modo Individual

**Objetivo da sprint:** entregar o fluxo assincrono minimo validavel.

| Item                               | Status    | Observacoes                                                                       |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------- |
| Criacao de sessao individual       | Concluido | Fluxo do dashboard cria a sessao e abre a pagina de detalhes                      |
| Link individual de acesso          | Concluido | Link publico `/play/[shareToken]` ativo na pagina da sessao                       |
| Deadline/encerramento configuravel | Concluido | Prazo configuravel na criacao da sessao e respeitado no fluxo publico             |
| Controle de tentativas             | Concluido | Modelo com `attempts`, retomada, nova tentativa e limite configuravel funcionando |
| Nickname obrigatorio               | Concluido | Entrada publica exige apelido antes de iniciar a tentativa                        |
| Email opcional/configuravel        | Concluido | Sessao individual pode deixar email opcional ou obrigatorio ja na criacao         |
| Resultado individual final         | Concluido | Participante recebe score, acertos e resumo final ao concluir                     |
| Sem ranking realtime               | Concluido | Fluxo assincrono sem dependencia de realtime entregue                             |

**Proximo passo recomendado:** validar a migration nova no banco e seguir para hardening operacional e refinamento do beta.

## Sprint 6 — Relatorios e Acabamento

**Objetivo da sprint:** transformar sessoes em material util para operacao corporativa.

| Item                                      | Status    | Observacoes                                                             |
| ----------------------------------------- | --------- | ----------------------------------------------------------------------- |
| Ranking final por participante            | Concluido | Disponivel na sessao                                                    |
| Acerto por pergunta                       | Concluido | Disponivel na sessao                                                    |
| Exportacao CSV resumo                     | Concluido | Disponivel                                                              |
| Exportacao CSV detalhado                  | Concluido | Disponivel                                                              |
| Tempo medio por pergunta                  | Parcial   | Dados existem em parte, mas nao estao destacados como leitura principal |
| Pergunta mais dificil                     | Faltando  | Ainda nao aparece como insight claro                                    |
| Visualizacoes/graficos                    | Faltando  | Relatorio atual e mais tabular                                          |
| Acabamento de estados vazios/erro/loading | Parcial   | Ja existe em varios fluxos, ainda nao em nivel sistematico              |

**Proximo passo recomendado:** enriquecer leitura analitica e refinar UX do relatorio.

## Sprint 7 — Beta Privado

**Objetivo da sprint:** deixar o produto apto para uso controlado com clientes reais.

| Item                                       | Status    | Observacoes                                                                    |
| ------------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| Fluxo completo live em producao controlada | Concluido | Ja operavel hoje                                                               |
| Modo Individual pronto para beta           | Concluido | Fluxo publico, tentativas, retomada e relatorios por tentativa entregues       |
| Teste de carga de 80 jogadores             | Faltando  | Ainda precisa execucao formal                                                  |
| Dashboard operacional para sessoes ativas  | Concluido | Dashboard global agora mostra sessoes ativas, interrupcoes e atividade recente |
| Sentry sem novos erros apos staging        | Parcial   | Precisa consolidacao operacional                                               |
| Politica de privacidade e termos revisados | Bloqueado | Depende de validacao juridica                                                  |
| Operadores de dados documentados           | Bloqueado | Depende de processo e documentacao                                             |
| Limite comercial prometido no beta         | Bloqueado | Decisao de negocio                                                             |

**Proximo passo recomendado:** fechar observabilidade minima de beta e depois executar teste de carga controlado.

## Pendencias transversais do PRD

| Tema                   | Status    | Observacoes                                                                              |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------- |
| Google OAuth           | Parcial   | Provider pronto no codigo e escondido por config; falta adicionar credenciais no Railway |
| Recuperacao de senha   | Concluido | Fluxo com token seguro e link interno para beta entregue                                 |
| Perfil basico de conta | Concluido | Pagina de conta com nome, empresa, avatar e troca de senha entregue                      |
| PWA mobile-first       | Parcial   | UX mobile boa em partes, mas nao tratada como entrega formal de PWA                      |
| Acessibilidade WCAG AA | Parcial   | Ainda precisa auditoria dedicada                                                         |
| Anti-cheating basico   | Parcial   | Ha validacoes server-side no core, nao como pacote fechado                               |
| LGPD operacional       | Bloqueado | Falta validacao juridica e processo                                                      |

## Ordem recomendada daqui para frente

1. **Sprint 5 — Modo Individual**
2. **Auth complementar:** Google OAuth, recuperacao de senha e perfil basico
3. **Sprint 2 restante:** branding com upload/storage real
4. **Sprint 7:** observabilidade, carga e operacao de beta
5. **Refino da Sprint 6:** analiticos mais ricos

## Definicao pratica de "quase pronto para beta"

Podemos dizer que o projeto esta perto de beta quando:

- o Live continuar estavel como esta hoje
- o Modo Individual estiver funcional
- auth complementar estiver fechado
- houver um painel operacional minimo
- testes de carga e monitoramento estiverem validados

Hoje, a leitura mais honesta e:

- **Live corporativo:** forte
- **MVP completo do PRD:** ainda nao
- **Maior proximo marco:** concluir o Modo Individual e endurecer a operacao para beta
