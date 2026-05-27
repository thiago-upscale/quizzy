# PRD v2.1 — Quizzy

**Versão:** 2.1
**Data:** 27 de maio de 2026
**Status:** Pronto para refinamento técnico e validação beta

---

## 0. Resumo Executivo da Revisão v2.1

O plano v2 tinha boa direção de produto, mas ainda misturava ambição de produto final com escopo de MVP. Esta revisão corrige os principais riscos antes da execução:

1. **MVP mais validável:** o primeiro lançamento passa a priorizar criação, Live confiável, branding e relatório essencial. Modo Individual continua no MVP, mas como fluxo mínimo, sem prometer robustez de LMS.
2. **Modelo de dados mais seguro:** adicionado versionamento/snapshot de quiz para impedir que edições afetem sessões já criadas; adicionados campos para tentativas no modo Individual.
3. **Realtime mais resiliente:** Redis continua como estado vivo, mas respostas críticas passam a ter estratégia de flush incremental para reduzir perda de dados em queda.
4. **LGPD menos prescritiva:** bases legais e textos jurídicos ficam como validação obrigatória com responsável jurídico, não como afirmação fechada no PRD.
5. **Métricas mais acionáveis:** metas de sucesso agora separam validação de produto, confiabilidade técnica e qualidade da experiência.
6. **Roadmap mais realista:** adicionados testes de carga, homologação operacional e critérios de saída por sprint.

---

## 1. Visão Geral

Quizzy é uma plataforma web de quizzes interativos em tempo real, posicionada como **alternativa profissional ao Kahoot para o mercado corporativo brasileiro**. O diferencial central do MVP é entregar sessões Live confiáveis com customização visual por quiz (branding), relatórios essenciais e experiência PT-BR/LGPD-friendly. O modo assíncrono entra como fluxo mínimo validável para treinamentos e avaliações simples, sem competir ainda com plataformas LMS.

### 1.1. Posicionamento

| Dimensão | Kahoot / Mentimeter | Quizzy |
|---|---|---|
| Branding por quiz | Limitado a planos enterprise caros | Diferencial central desde o MVP |
| Modo assíncrono | Existe, mas secundário | Fluxo mínimo para validação no MVP |
| Localização | Genérico global | PT-BR nativo, preparado para operação LGPD |
| Público | Educação K-12 prioritário | Corporativo e eventos |

### 1.2. Tese do Produto

Empresas brasileiras de médio e grande porte usam Kahoot porque é conhecido e confiável, mas parte delas reclama de três coisas: identidade visual genérica, fricção em compras internacionais e dúvidas de conformidade/LGPD. Quizzy valida se uma alternativa local, brandable e operacionalmente simples é suficiente para capturar esse segmento.

---

## 2. Público-Alvo

**Primário:**
- Áreas de RH e T&D de empresas com 100+ funcionários (treinamentos, integração, avaliações pós-curso)
- Agências de eventos corporativos (convenções, kick-offs, workshops)

**Secundário (não otimizado no MVP):**
- Educadores corporativos independentes
- Organizadores de feiras e congressos

**Anti-público (para evitar dispersão):**
- Professores de escola (mercado dominado por Kahoot, baixa disposição a pagar)
- Eventos sociais e festas (não justifica branding corporativo)

---

## 3. Objetivos e Métricas de Sucesso

### 3.1. Objetivos do Produto

1. Validar a tese de branding como diferencial de compra
2. Provar que o stack realtime suporta operação corporativa confiável
3. Estabelecer fluxo de criação → execução → relatório sem atrito

### 3.2. Métricas de Sucesso do MVP (90 dias após lançamento)

| Métrica | Meta | Como medir | Interpretação |
|---|---|---|
| Ativação de criador | ≥ 50% publicam 1º quiz em 7 dias | Funil `signup → quiz.created → quiz.published` | Valida facilidade de criação |
| Execução real | ≥ 35% dos criadores iniciam 1 sessão com 5+ jogadores | Evento `session.started` + participantes | Valida passagem de editor para uso real |
| Retenção de criador | ≥ 25% criam 2º quiz ou 2ª sessão em 30 dias | Cohort analysis | Valida utilidade recorrente |
| Adoção de branding | ≥ 60% dos quizzes publicados alteram cor, logo ou background | Diff do `branding` vs padrão | Valida tese central do produto |
| Jogadores por sessão Live | Média ≥ 15 em sessões com 5+ participantes | Contagem em `participants` | Exclui testes internos pequenos |
| Taxa de conclusão | ≥ 75% dos jogadores respondem a última pergunta | `answers` / participantes ativos | Valida experiência do jogador |
| Erro na entrada por PIN | < 2% em tentativas não maliciosas | Logs com motivo de falha | Valida fricção de entrada |
| Latência P95 resposta→feedback/ranking | < 800ms em sessão de até 80 jogadores | Telemetria server-side | Valida realtime |
| Sessões Live sem incidente crítico | ≥ 98% | Sessões sem crash, perda de estado ou host preso | Mais útil que uptime genérico no beta |
| Satisfação pós-evento do host | ≥ 4/5 | Survey opcional pós-sessão | NPS pode ficar para amostra maior |

### 3.3. Eventos mínimos de analytics

- `user.signed_up`
- `quiz.created`
- `quiz.branding_changed`
- `quiz.published`
- `session.created`
- `session.started`
- `participant.joined`
- `answer.submitted`
- `question.completed`
- `session.finished`
- `report.viewed`
- `report.exported_csv`
- `error.pin_entry_failed`
- `error.realtime_disconnect`

---

## 4. Escopo

### 4.1. Dentro do MVP (Fase 1)

**Autenticação e Conta**
- Cadastro de criador via email/senha e Google OAuth
- Recuperação de senha
- Perfil básico (nome, empresa, avatar)

**Editor de Quiz**
- CRUD de quizzes
- Tipos de pergunta: Múltipla Escolha (2-6 opções) e Verdadeiro/Falso
- Por pergunta: enunciado, tempo limite (10/20/30/60s), pontos base, imagem opcional
- Preview do quiz com branding aplicado
- Publicação gera uma versão imutável do quiz para uso em sessões

**Branding por Quiz**
- Cor primária, cor secundária, cor de destaque (HEX validado)
- Upload de logo (PNG/JPG/SVG sanitizado, máx 2MB)
- Upload de background (PNG/JPG, máx 5MB, recomendação 1920×1080)
- Seleção de fonte entre 5 opções pré-aprovadas
- Verificação automática de contraste (WCAG AA)
- Preview em tempo real
- Fallback visual se imagem falhar ao carregar

**Modo Live**
- Geração de PIN de 6 dígitos (validade de 4h)
- QR Code grande na tela do host
- Lobby com lista de jogadores conectados
- Controle de avanço do host (manual ou automático ao fim do tempo)
- Ranking entre perguntas (top 5 + posição do jogador)
- Ranking final completo
- Botão de encerrar sessão

**Modo Individual (Mínimo)**
- Link compartilhável da sessão
- Prazo configurável (data/hora limite)
- Limite de tentativas (1 por padrão, configurável até 3)
- Identificação mínima do participante: apelido obrigatório e email opcional configurável pelo criador
- Jogador responde no próprio ritmo
- Resultado individual ao final
- Sem ranking em tempo real (consolida no relatório)
- Controle de tentativa por `participantToken` e, quando email for exigido, por email normalizado

**Entrada do Jogador**
- Acesso por PIN ou link
- Apelido (3-20 chars, validação de duplicata na sessão)
- Avatar (12 opções pré-definidas)
- Sem cadastro
- PWA mobile-first

**Sistema de Pontuação**
- Fórmula definida (ver seção 7)
- Streak com multiplicador
- Desempate por tempo total

**Reconexão**
- Jogador: token em localStorage, reconecta em até 60s preservando score
- Host: token de sessão, retoma controle em até 5 min

**Relatórios**
- Ranking final
- % de acerto por pergunta
- Tempo médio de resposta por pergunta
- Pergunta mais difícil
- Exportação CSV com respostas, pontuação, tempo e metadados mínimos da sessão

**Observabilidade**
- Logs estruturados
- Métricas de sessão (jogadores, latência, erros)
- Error tracking (Sentry)
- Dashboard operacional simples para sessões ativas, desconexões e falhas de entrada

### 4.2. Fora do MVP (Fase 2 ou posterior)

Resposta curta, nuvem de palavras, ordenação, matching, imagem como resposta, perguntas com áudio/vídeo, power-ups, geração com IA, importação CSV, exportação PDF/Excel, banco de perguntas reutilizável, modo espectador, reações com emoji, modo equipes, templates de tema, biblioteca de quizzes públicos.

### 4.3. Justificativa dos cortes

| Item cortado | Razão |
|---|---|
| Resposta curta | Correção automática com normalização é cara; manual quebra o fluxo Live |
| Nuvem de palavras | UI complexa, valor secundário no caso corporativo |
| Áudio/Vídeo | Storage, encoding e bandwidth disparam custo Railway |
| Power-ups | Requer balanceamento, validar core primeiro |
| IA | Dependência externa, custo por quiz, validar demanda antes |
| CSV import | Edge cases de parsing consomem tempo; UI de edição cobre 90% |
| PDF export | CSV resolve, PDF é polimento |
| Banco de perguntas | Refatoração futura, não bloqueia validação |

---

## 5. User Stories e Critérios de Aceite

### 5.1. Épico: Criação de Quiz

**US-01: Como criador, quero criar um quiz para usar em treinamento**
- Dado que estou autenticado, quando clico em "Novo Quiz", então um quiz vazio é criado e abro o editor
- Dado um quiz vazio, quando salvo com pelo menos 1 pergunta válida e título, então status passa a "rascunho"
- Dado um quiz em rascunho, quando clico em "Publicar", então uma versão imutável é criada, status passa a "publicado" e fica disponível para sessões
- Dado um quiz publicado, quando edito perguntas ou respostas corretas, então o sistema cria nova versão ao publicar novamente, sem alterar sessões já criadas

**US-02: Como criador, quero customizar o visual do quiz com a identidade da empresa**
- Dado que estou no editor de branding, quando aplico cor primária, então preview atualiza em até 200ms
- Dado upload de logo > 2MB, quando submeto, então sistema rejeita com mensagem clara
- Dado SVG com tags `<script>`, quando submeto, então sistema sanitiza ou rejeita
- Dado contraste < 4.5:1 entre texto e fundo, quando salvo, então sistema exibe alerta de acessibilidade (não bloqueia)

### 5.2. Épico: Sessão Live

**US-03: Como host, quero iniciar uma sessão ao vivo**
- Dado um quiz publicado, quando inicio sessão Live, então sistema gera PIN único de 6 dígitos válido por 4h
- Dado a sessão iniciada, quando a tela carrega, então PIN e QR Code aparecem em até 1s
- Dado pelo menos 1 jogador no lobby, quando clico "Iniciar", então a primeira pergunta é exibida para todos em até 800ms

**US-04: Como jogador, quero entrar em uma sessão**
- Dado um PIN válido, quando insiro PIN + apelido, então entro no lobby em até 1s
- Dado um PIN expirado ou inválido, quando tento entrar, então recebo mensagem específica
- Dado um apelido já em uso na sessão, quando tento entrar, então sistema sugere variação (ex: "Thiago", "Thiago2")
- Dado um PIN com 80 jogadores ativos, quando tento entrar, então recebo mensagem de capacidade excedida

**US-05: Como jogador, quero responder perguntas**
- Dado uma pergunta exibida, quando seleciono uma alternativa dentro do tempo, então minha resposta é registrada uma única vez e validada server-side
- Dado que respondi, quando o tempo termina ou todos responderam, então vejo feedback (correto/errado) e minha pontuação
- Dado perda de conexão, quando reconecto em até 60s, então retorno ao estado atual da sessão com score preservado

**US-06: Como host, quero controlar o ritmo do jogo**
- Dado uma pergunta ativa, quando clico "Pular" ou todos responderam, então ranking parcial é exibido em até 800ms
- Dado o ranking exibido, quando clico "Próxima", então a próxima pergunta é exibida
- Dado perda de conexão do host, quando reconecto em até 5min, então retomo controle no estado em que parou
- Dado host desconectado por mais de 5min, quando a sessão é vista, então status passa a "interrompida" e jogadores são notificados

### 5.3. Épico: Modo Individual

**US-07: Como criador, quero enviar um quiz como tarefa assíncrona**
- Dado um quiz publicado, quando crio sessão Individual com prazo, então sistema gera link compartilhável da sessão
- Dado que crio sessão Individual, quando escolho exigir email, então o jogador precisa informar email válido antes de iniciar
- Dado o prazo expirado, quando jogador tenta acessar link, então recebe mensagem de prazo encerrado
- Dado jogador concluiu tentativas permitidas, quando tenta acessar novamente, então é bloqueado

**US-08: Como jogador, quero responder no meu ritmo**
- Dado link válido e dentro do prazo, quando acesso, então vejo telas de entrada e quiz com mesmo branding
- Dado que respondi a pergunta, quando clico "Próxima", então passo adiante sem aguardar terceiros
- Dado que fechei o navegador no meio do quiz, quando reabro link, então retomo de onde parei
- Dado que iniciei uma segunda tentativa permitida, quando respondo novamente, então as respostas são registradas em tentativa separada

### 5.4. Épico: Relatórios

**US-09: Como criador, quero ver o desempenho da sessão**
- Dado uma sessão finalizada, quando acesso o relatório, então vejo ranking, % acerto por pergunta e tempo médio
- Dado o relatório aberto, quando clico em "Exportar CSV", então baixo arquivo com dados brutos por participante
- Dado uma sessão Individual com múltiplas tentativas, quando acesso o relatório, então consigo distinguir participante, tentativa e melhor pontuação

---

## 6. Arquitetura Realtime

### 6.1. Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, Shadcn/ui, Socket.io-client
- **Backend Realtime:** Servidor Socket.io standalone (não Next.js API Routes) em container separado no Railway
- **Backend HTTP:** Next.js API Routes para CRUD, auth e relatórios
- **Banco:** PostgreSQL (Railway)
- **Cache/State:** Redis (Railway) — mandatório desde o MVP para state de sessão e Socket.io adapter futuro
- **Storage:** Cloudflare R2 (logos, backgrounds) — evita acoplamento ao Railway Volumes
- **ORM:** Drizzle
- **Auth:** Auth.js com Credentials (email/senha) e Google OAuth
- **Observabilidade:** Sentry + logs estruturados (Pino)

### 6.2. Decisão crítica: Socket.io em container separado

Rodar Socket.io dentro de Next.js API Routes em produção é frágil (serverless functions não mantêm conexões persistentes). Solução para MVP:

- 1 container Next.js (HTTP, SSR, API REST)
- 1 container Socket.io (WebSocket, lógica de sessão)
- Redis como fonte de verdade do estado vivo da sessão
- Comunicação entre containers via Redis pub/sub e/ou HTTP interno

Isso permite escalar horizontalmente o Socket.io quando necessário, sem refatoração.

### 6.3. Modelo de estado de sessão

Estado vivo de cada sessão Live fica em Redis com TTL de 6h:

```
session:{sessionId} → {
  quizId, quizVersionId, pin, hostSocketId, status,
  currentQuestionIdx, questionStartedAt,
  participants: [...], answers: {...}
}
```

Persistência em PostgreSQL acontece em pontos definidos:
- Criação da sessão
- Entrada de cada participante
- Durante a pergunta: respostas aceitas são enfileiradas para flush incremental
- Fim de cada pergunta: batch final e snapshot do placar
- Encerramento da sessão (snapshot final)

Redis otimiza latência, mas não deve ser o único lugar onde respostas aceitas vivem por muito tempo. Para reduzir perda em queda do processo realtime, toda resposta válida deve ser gravada em fila/stream Redis e persistida em PostgreSQL por worker com retry. O ranking pode ser calculado em memória/Redis, mas o relatório final depende de dados persistidos.

### 6.4. Gestão de respostas concorrentes

Quando 80 jogadores respondem nos últimos 200ms:

1. Socket.io recebe e valida server-side (tempo, duplicata)
2. Resposta é gravada em Redis (HSET por participante) e adicionada a fila de persistência
3. Cálculo de pontos acontece em memória no servidor
4. Persistência em PostgreSQL acontece por flush incremental e batch final ao fim da pergunta
5. Ranking calculado e broadcast em evento único por sala

Isso evita rajadas síncronas em Postgres, mantém latência previsível e reduz risco de perda de respostas em caso de queda.

### 6.5. Reconexão

**Jogador:**
- Ao entrar, recebe `participantToken` armazenado em localStorage
- Em desconexão, cliente tenta reconectar por até 60s com backoff exponencial
- Servidor reconhece token e restaura estado (score, respostas dadas)
- Se reconexão falhar, jogador pode entrar novamente com mesmo apelido pelo PIN enquanto a sessão estiver ativa; o servidor associa ao mesmo participante quando o token for apresentado

**Host:**
- Token de sessão armazenado em cookie httpOnly
- Em desconexão, sessão entra em status "host_disconnected" (jogadores veem aviso)
- Host pode reconectar em até 5min pelo dashboard
- Após 5min, sessão é encerrada e relatório é gerado com dados disponíveis

### 6.6. Limites e proteções

- Rate limit por IP: 10 tentativas de PIN por minuto
- Rate limit por PIN: 100 tentativas de entrada por minuto (proteção contra brute force)
- Tamanho de payload por evento: máx 4KB
- Máx jogadores por sessão: 80 no MVP (configurável por plano futuramente)
- Sanitização de apelidos (sem HTML, sem emoji excessivo, sem palavras-chave de bloqueio configuráveis)

---

## 7. Regras de Pontuação

### 7.1. Fórmula

```
pontosBase = 1000
fatorTempo = max(0.5, 1 - (tempoResposta / tempoLimite) * 0.5)
multiplicadorStreak = min(1.5, 1 + (streak * 0.1))

pontos = round(pontosBase * fatorTempo * multiplicadorStreak)
```

**Casos:**
- Acerto instantâneo, sem streak: 1000 pts
- Acerto no último segundo, sem streak: 500 pts
- Acerto instantâneo, streak de 5: 1500 pts
- Acerto no último segundo, streak de 5: 750 pts
- Erro: 0 pts e streak zera

### 7.2. Desempate

1. Maior pontuação total
2. Menor tempo total acumulado (somatório de tempos de resposta)
3. Ordem alfabética do apelido

### 7.3. Validações server-side

- Tempo de resposta é calculado pelo servidor (`questionStartedAt` em Redis), não pelo cliente
- Resposta fora do tempo limite (com margem de 500ms para latência de rede) é rejeitada
- Resposta duplicada na mesma pergunta é ignorada (primeira vale)

---

## 8. Schema do Banco de Dados

```sql
-- Organizações (multi-tenancy desde o início, mesmo que com 1 user por org no MVP)
organizations (
  id uuid PK,
  name varchar(120),
  plan varchar(20) -- free, pro, enterprise
  created_at timestamptz
)

users (
  id uuid PK,
  organization_id uuid FK,
  email varchar(255) unique,
  password_hash text,
  name varchar(120),
  google_id varchar(255) nullable,
  role varchar(20), -- owner, member
  created_at timestamptz,
  last_login_at timestamptz
)

quizzes (
  id uuid PK,
  organization_id uuid FK,
  created_by uuid FK users,
  title varchar(200),
  description text,
  branding jsonb, -- {primaryColor, secondaryColor, accentColor, logoUrl, backgroundUrl, fontFamily}
  status varchar(20), -- draft, published, archived
  created_at timestamptz,
  updated_at timestamptz
)

quiz_versions (
  id uuid PK,
  quiz_id uuid FK,
  version_number int,
  title varchar(200),
  description text,
  branding jsonb,
  questions_snapshot jsonb, -- perguntas, opções, respostas corretas e configurações no momento da publicação
  created_by uuid FK users,
  created_at timestamptz,
  UNIQUE (quiz_id, version_number)
)

questions (
  id uuid PK,
  quiz_id uuid FK,
  order_index int,
  type varchar(30), -- multiple_choice, true_false
  content jsonb, -- {question, options, imageUrl}
  correct_answer jsonb, -- {index} ou {value}
  points_base int default 1000,
  time_limit_seconds int, -- 10, 20, 30, 60
  created_at timestamptz
)

quiz_sessions (
  id uuid PK,
  quiz_id uuid FK,
  quiz_version_id uuid FK quiz_versions,
  host_id uuid FK users,
  pin varchar(6) nullable, -- só para mode=live; único apenas entre sessões ativas
  share_token varchar(40) unique nullable, -- link de sessão individual
  mode varchar(20), -- live, individual
  status varchar(30), -- waiting, playing, finished, interrupted, expired
  starts_at timestamptz nullable,
  ends_at timestamptz nullable, -- prazo para individual
  expires_at timestamptz, -- PIN expira em 4h
  max_attempts int default 1, -- para individual
  created_at timestamptz,
  finished_at timestamptz nullable
)

participants (
  id uuid PK,
  session_id uuid FK,
  nickname varchar(20),
  email varchar(255) nullable, -- opcional no Individual, configurável pelo criador
  email_normalized varchar(255) nullable,
  avatar varchar(50),
  participant_token varchar(40) unique, -- para reconexão
  score int default 0,
  total_time_ms bigint default 0,
  current_streak int default 0,
  joined_at timestamptz,
  finished_at timestamptz nullable,
  UNIQUE (session_id, nickname)
)

attempts (
  id uuid PK,
  participant_id uuid FK,
  session_id uuid FK,
  attempt_number int,
  status varchar(20), -- in_progress, completed, abandoned
  score int default 0,
  total_time_ms bigint default 0,
  started_at timestamptz,
  finished_at timestamptz nullable,
  UNIQUE (participant_id, attempt_number)
)

answers (
  id uuid PK,
  participant_id uuid FK,
  attempt_id uuid FK attempts nullable, -- obrigatório para Individual
  question_id uuid FK,
  session_id uuid FK,
  answer jsonb,
  time_spent_ms int,
  is_correct boolean,
  points_earned int,
  created_at timestamptz,
  -- Live: UNIQUE (participant_id, question_id) WHERE attempt_id IS NULL
  -- Individual: UNIQUE (attempt_id, question_id) WHERE attempt_id IS NOT NULL
)

session_events (
  id uuid PK,
  session_id uuid FK,
  event_type varchar(50), -- session.started, host.disconnected, question.started, etc
  payload jsonb,
  created_at timestamptz
)

audit_log (
  id uuid PK,
  organization_id uuid FK,
  user_id uuid FK nullable,
  action varchar(100),
  resource_type varchar(50),
  resource_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz
)
```

### 8.1. Índices essenciais

- `quiz_sessions.pin` (unique parcial WHERE pin IS NOT NULL AND status IN ('waiting', 'playing'))
- `quiz_sessions.share_token` (unique, parcial)
- `participants.session_id`
- `participants.session_id, email_normalized` (parcial WHERE email_normalized IS NOT NULL)
- `attempts.participant_id, attempt_number`
- `answers.session_id, question_id`
- `answers.attempt_id, question_id`
- `answers.participant_id, question_id` (unique parcial WHERE attempt_id IS NULL)
- `answers.attempt_id, question_id` (unique parcial WHERE attempt_id IS NOT NULL)
- `quizzes.organization_id, status`
- `quiz_versions.quiz_id, version_number`

---

## 9. Telas (UI/UX)

### 9.1. Inventário de telas

**Marketing**
1. Landing Page

**Área do Criador (autenticada)**
2. Login / Cadastro
3. Dashboard (lista de quizzes, sessões recentes, métricas)
4. Editor de Quiz (perguntas + branding em abas)
5. Preview do Quiz
6. Página de início de sessão (escolher Live ou Individual, configurar)
7. **Tela do Host durante Live** (pergunta atual, contagem de respostas, controles)
8. **Tela do Host de Ranking** (entre perguntas)
9. Tela de fim de sessão (resumo + link para relatório)
10. Relatório de sessão (gráficos + exportação)

**Área do Jogador (não autenticada)**
11. Tela de entrada por PIN (input grande, mobile-first)
12. Tela de apelido + avatar
13. Lobby (aguardando início, com branding aplicado)
14. **Tela do Player de Pergunta** (enunciado, alternativas grandes, timer)
15. **Tela do Player de Feedback** (correto/errado, pontos ganhos, streak)
16. Tela de Ranking (posição do jogador + top 5)
17. Tela final (posição final + opção de "Jogar Novamente" no Individual)

**Estados obrigatórios por tela crítica**
- Loading, vazio e erro recuperável no Dashboard, Editor, Início de Sessão e Relatório
- Estado offline/reconectando no Host e Player
- Estado de sessão encerrada, expirada, cheia e interrompida na entrada do jogador
- Confirmação explícita antes de encerrar sessão Live

### 9.2. Separação Host vs. Player

**Tela do Host durante pergunta:**
- Enunciado e alternativas grandes (projeção)
- Timer em destaque
- Contador "X de Y responderam"
- Botão "Pular agora"
- Botão "Encerrar sessão"
- QR Code pequeno no canto (para entrada tardia)

**Tela do Player durante pergunta:**
- Enunciado compacto
- Alternativas como botões grandes (touch-friendly)
- Timer
- Streak atual visível
- Sem informação de outros jogadores (foco)

### 9.3. Prioridade de UX no MVP

1. Entrada por PIN em celular deve ser a experiência mais rápida e robusta do produto.
2. Host não pode ficar preso sem ação clara; todo erro Live precisa oferecer retry, encerrar sessão ou voltar ao lobby.
3. Branding precisa aparecer no lobby, pergunta, ranking e relatório, não apenas no preview.
4. Relatório pode ser simples, mas precisa ser confiável e exportável.

---

## 10. Requisitos Não-Funcionais

### 10.1. Performance

- Latência P95 entre resposta do jogador e atualização do ranking: < 800ms
- Tempo de carregamento da tela de entrada por PIN: < 1s em 3G
- Tamanho do bundle inicial do jogador: < 200KB gzipped
- Imagens de branding servidas via CDN com cache de 30 dias

### 10.2. Escalabilidade

- MVP: 80 jogadores por sessão, até 20 sessões simultâneas
- Arquitetura preparada para escalar horizontalmente Socket.io via Redis adapter (sem refatoração de domínio)

### 10.3. Disponibilidade

- Uptime alvo: 99,5% (compatível com Railway sem multi-região)
- RTO em caso de queda: < 15min
- Backup diário do PostgreSQL com retenção de 30 dias

### 10.4. Segurança

- HTTPS obrigatório
- CSP restritivo
- Sanitização de uploads (SVG via DOMPurify server-side; imagens via re-encoding com sharp)
- Rate limits descritos na seção 6.6
- Senhas com bcrypt (cost 12)
- Tokens de sessão com expiração e rotação
- Validação de inputs server-side (Zod)
- Proteção CSRF nas mutações do criador

### 10.5. Acessibilidade

- WCAG 2.1 AA como meta
- Navegação completa por teclado
- Contraste mínimo 4.5:1 (validado no editor de branding)
- ARIA labels em controles interativos
- Suporte a leitor de tela nas telas de jogador
- Animações respeitam `prefers-reduced-motion`

### 10.6. LGPD e Privacidade

- Base legal provável: legítimo interesse (sessões Live) e execução de contrato (assíncrono), sujeita a validação jurídica antes do beta
- Dados coletados de participantes: apelido, avatar, respostas, timestamps, IP (logs)
- Retenção: dados de sessão por 12 meses, logs por 6 meses
- Anonimização automática após retenção (apelido vira "Participante #N")
- Política de privacidade acessível em todas as telas
- Processo de exportação de dados por solicitação (manual no MVP, automático na Fase 2)
- Processo de exclusão por solicitação (manual no MVP)
- Aviso ao jogador antes de entrar: "Seus dados serão tratados conforme a Política de Privacidade"
- Encarregado/DPO designado e contato visível antes de clientes enterprise
- Registro de consentimento/ciência do aviso de privacidade no evento `participant.joined`
- Contrato com operadores/suboperadores documentado (Railway, Cloudflare R2, Sentry e provedor de email)

### 10.7. Internacionalização

- MVP: PT-BR como única língua
- Arquitetura i18n preparada (next-intl) para Fase 2
- Formatos de data/hora em PT-BR (DD/MM/AAAA, 24h)

### 10.8. Anti-Cheating Básico

- Validação server-side de tempo de resposta
- Detecção de troca de aba (envia evento, registrado no relatório, não bloqueia)
- Impedir múltiplas conexões com mesmo `participantToken` simultaneamente
- Mesmo IP com 5+ participantes em uma sessão dispara flag no relatório
- Server-side é source of truth para pontuação (cliente nunca declara pontos)

---

## 11. Modelo de Negócio (definir antes do código)

Decisões necessárias antes do desenvolvimento, mesmo que cobrança fique para Fase 2:

| Decisão | Opção Recomendada |
|---|---|
| Modelo | SaaS multi-tenant com `organizations` |
| Tier gratuito | 3 quizzes, 30 jogadores por sessão, sem custom logo |
| Tier Pro | R$ X/mês, quizzes ilimitados, 80 jogadores, branding completo |
| Tier Enterprise | Sob consulta, SSO, white-label, suporte dedicado |
| Cobrança no MVP? | Não. Validar produto primeiro, instrumentar limites |
| Billing futuro | Stripe ou Pagar.me (mercado BR) |

Schema já está preparado para multi-tenant via `organization_id`.

**Decisão ajustada para MVP:** limites comerciais devem existir no código como configuração, mas sem bloqueios agressivos que prejudiquem beta privado. Durante o beta, registrar quando um limite seria atingido antes de bloquear o usuário. Bloqueios reais entram quando houver pricing validado.

---

## 12. Roadmap e Sprints

### Sprint 0 — Fundação (1 semana)
- Setup Next.js, TypeScript, Tailwind, Shadcn
- Setup Drizzle + Postgres
- Setup Auth.js
- Setup Sentry + Pino
- Setup container Socket.io standalone
- Setup Redis
- CI/CD básico
- Estratégia de ambientes: local, staging e produção
- Critério de saída: deploy de staging com healthchecks, migrations e logs funcionando

### Sprint 1 — Criador e Editor (2 semanas)
- Telas de auth (login, cadastro, recuperação)
- Dashboard
- CRUD de quizzes
- Editor: múltipla escolha e V/F
- Preview
- Publicação com `quiz_versions`
- Critério de saída: criar, editar, publicar e reabrir quiz sem perda de dados

### Sprint 2 — Branding (1 semana)
- Editor de branding com preview live
- Upload com sanitização (R2)
- Validação de contraste
- Fallbacks visuais e limites de arquivo
- Critério de saída: branding aplicado no preview e persistido na versão publicada

### Sprint 3 — Sessão Live (Core) (3 semanas)
- Criação de sessão e geração de PIN/QR
- Lobby
- Loop de perguntas Host + Player
- Sistema de pontuação server-side
- Ranking entre perguntas e final
- Estado em Redis
- Persistência incremental de respostas
- Critério de saída: sessão Live completa com 20 jogadores simulados

### Sprint 4 — Reconexão e Robustez (1 semana)
- Tokens de participante e host
- Reconexão automática
- Tratamento de host_disconnected
- Rate limits e validações
- Teste de carga com meta MVP: 80 jogadores por sessão e 20 sessões simultâneas
- Critério de saída: P95 < 800ms no ambiente de staging ou decisão explícita de ajuste de arquitetura

### Sprint 5 — Modo Individual (1 semana)
- Geração de link compartilhável
- Tela do jogador assíncrona
- Persistência de progresso parcial
- Prazo e limite de tentativas
- Email opcional e separação de tentativas
- Critério de saída: relatório distingue tentativas e bloqueia novas tentativas após limite

### Sprint 6 — Relatórios e Acabamento (2 semanas)
- Relatório com gráficos
- Exportação CSV
- Polimento de acessibilidade
- Conformidade LGPD (textos, endpoints manuais)
- Landing page
- Dashboard operacional mínimo
- Critério de saída: beta pode operar sem acesso direto ao banco

### Sprint 7 — Beta Privado (2 semanas)
- Lançamento com 5-10 clientes beta selecionados
- Coleta de métricas e feedback
- Correções e ajustes
- Rodar pelo menos 10 sessões Live reais ou assistidas
- Critério de saída: lista de bloqueadores zerada e decisão Go/No-Go para público maior

**Total estimado:** ~13 semanas para beta privado em produção controlada.

---

## 13. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Socket.io instável sob carga | Média | Alto | Container dedicado + Redis desde dia 1, testes de carga no Sprint 3 |
| Queda do host durante evento | Alta | Alto | Estratégia de reconexão definida e testada |
| Perda de respostas aceitas antes do batch | Média | Alto | Fila/stream Redis + worker de persistência incremental + retry |
| Edição de quiz altera sessão ou relatório antigo | Média | Alto | `quiz_versions` imutável em toda sessão |
| Modo Individual vira LMS antes da hora | Alta | Médio | Escopo limitado a prazo, tentativa e resultado; sem turmas, certificados ou trilhas |
| Custo Railway escalar rápido | Média | Médio | Monitorar custo por sessão, R2 fora do Railway, modelar pricing |
| Upload malicioso (SVG, etc) | Baixa | Alto | Sanitização server-side, re-encoding de imagens, CSP |
| LGPD em cliente enterprise | Média | Alto | Revisão jurídica antes do beta, mapa de dados, operadores documentados |
| Latência em sessões com 80 jogadores | Média | Médio | Batching de respostas, testes de carga, observabilidade |
| Acessibilidade insuficiente para venda B2B | Média | Médio | WCAG AA como meta no MVP, auditoria antes do lançamento |
| Escopo expandindo durante desenvolvimento | Alta | Alto | Cortes da seção 4.2 documentados, backlog Fase 2 separado |

---

## 14. Definição de "Pronto"

Uma feature é considerada pronta quando:

1. Atende a todos os critérios de aceite das US relacionadas
2. Tem testes automatizados (unit + integration para lógica crítica)
3. Tem teste e2e para fluxo crítico quando afetar criação, Live, entrada de jogador ou relatório
4. Passa por code review
5. Está instrumentada (logs + métricas relevantes)
6. Documentação atualizada (README ou wiki interna)
7. Validada manualmente em mobile e desktop
8. Conformidade de acessibilidade verificada (axe-core sem violações críticas)
9. Sem erros novos no Sentry após deploy de staging
10. Tem comportamento definido para loading, erro e reconexão quando aplicável

## 14.1. Definição de "Pronto para Beta"

O MVP só deve entrar em beta privado quando:

1. Fluxo completo `criar quiz → publicar → iniciar Live → jogador entra → responde → ranking → relatório` estiver funcionando em produção controlada
2. Teste de carga de 80 jogadores em 1 sessão passar ou tiver limitação comunicada aos beta testers
3. Nenhum dado de sessão depende exclusivamente de memória do processo
4. Política de privacidade, termos e operadores de dados estiverem revisados
5. Dashboard operacional permitir diagnosticar sessões ativas sem acessar banco manualmente

---

## 15. Próximas Decisões Pendentes

Antes do Sprint 0, decidir:

1. Nome final e domínio (Quizzy está disponível?)
2. Identidade visual do próprio Quizzy (logo, paleta)
3. Pricing definitivo dos planos (mesmo que cobrança fique para depois)
4. 5 fontes pré-aprovadas para branding (preferência por web fonts open source)
5. 12 avatares pré-definidos (estilo visual)
6. Política de privacidade e Termos de Uso (texto jurídico)
7. Beta testers iniciais (5-10 clientes do portfólio atual)
8. Quem assume papel de DPO
9. Se email será obrigatório ou opcional no Modo Individual para os primeiros clientes beta
10. Quais clientes beta precisam de relatório por participante identificado
11. Limite real de jogadores prometido comercialmente durante beta
12. Ferramenta de load testing e cenário mínimo de homologação

---

**Apêndice A — Diferenças entre PRD v1 e v2**

- Escopo reduzido: removidos 8 tipos de pergunta, power-ups, IA, importação CSV e exportação PDF
- Adicionado: organizações (multi-tenancy), seção LGPD, métricas de sucesso, critérios de aceite, regras de pontuação explícitas, arquitetura realtime detalhada, sprints estimados
- Mantido com ajustes: branding (com validação de contraste e sanitização), Modo Individual (mínimo), reconexão (com tokens explícitos)
- Reescrito: schema do banco (com `organizations`, `participant_token`, `session_events`, `audit_log`)

**Apêndice B — Diferenças entre PRD v2.0 e v2.1**

- Status alterado de "Pronto para execução" para "Pronto para refinamento técnico e validação beta"
- Posicionamento ajustado: Live + branding como núcleo do MVP; Modo Individual como validação mínima
- Métricas revisadas para medir adoção de branding, execução real e incidentes de sessão
- Adicionado `quiz_versions` para snapshots imutáveis de quizzes publicados
- Adicionadas tentativas (`attempts`) e email opcional no Modo Individual
- Realtime ajustado para persistência incremental de respostas aceitas
- LGPD reescrita como requisito de validação jurídica, não como conclusão fechada
- Roadmap ganhou critérios de saída por sprint e teste de carga obrigatório
