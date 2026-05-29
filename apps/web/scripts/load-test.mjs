import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { io } from "socket.io-client";

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs();
const pin = args.pin;
const numPlayers = parseInt(args.players || "80", 10);
const joinDelayMs = parseInt(args.delay || "10", 10);
const actionDelayMin = parseInt(args["action-delay-min"] || "500", 10);
const actionDelayMax = parseInt(args["action-delay-max"] || "2500", 10);

if (!pin) {
  console.error("Erro: PIN é obrigatório. Use --pin <PIN de 6 dígitos>");
  console.log("Exemplo: node scripts/load-test.mjs --pin 123456 --players 80");
  process.exit(1);
}

const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^"|"$/g, "");
      }
    }
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Erro: DATABASE_URL não está configurada.");
  process.exit(1);
}

const realtimeUrl = process.env.REALTIME_URL || "http://localhost:4001";
console.log(`Carregando teste de carga...`);
console.log(`- PIN do Quiz: ${pin}`);
console.log(`- Jogadores simulados: ${numPlayers}`);
console.log(`- URL do Realtime: ${realtimeUrl}`);

const sql = postgres(databaseUrl);
const clients = [];
let progressInterval = null;
let isShuttingDown = false;

const stats = {
  connected: 0,
  answered: 0,
  acks: 0,
  rtts: [],
  errors: 0,
  disconnects: 0,
  reconnects: 0,
  reconnectTimes: [],
};

function calcP95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return sorted[idx] ?? sorted[sorted.length - 1];
}

function printStats() {
  const avgRtt =
    stats.rtts.length > 0
      ? stats.rtts.reduce((a, b) => a + b, 0) / stats.rtts.length
      : 0;
  const p95Rtt = calcP95(stats.rtts);
  const avgReconn =
    stats.reconnectTimes.length > 0
      ? stats.reconnectTimes.reduce((a, b) => a + b, 0) /
        stats.reconnectTimes.length
      : 0;
  const p95Reconn = calcP95(stats.reconnectTimes);

  console.log(`\nStatus do Teste:`);
  console.log(`- Conectados: ${stats.connected}/${numPlayers}`);
  console.log(`- Respostas enviadas: ${stats.answered}`);
  console.log(`- Confirmados (ACK): ${stats.acks}`);
  console.log(
    `- Latência RTT média: ${avgRtt.toFixed(2)}ms | P95: ${p95Rtt.toFixed(2)}ms`,
  );
  console.log(`- Desconexões: ${stats.disconnects}`);
  console.log(`- Reconexões bem-sucedidas: ${stats.reconnects}`);
  if (stats.reconnectTimes.length > 0) {
    console.log(
      `- Tempo de reconexão média: ${avgReconn.toFixed(2)}ms | P95: ${p95Reconn.toFixed(2)}ms`,
    );
  }
  console.log(`- Erros acumulados: ${stats.errors}`);
}

async function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  for (const s of clients) s.disconnect();
  if (progressInterval) clearInterval(progressInterval);
  await sql.end();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function run() {
  try {
    const sessions = await sql`
      SELECT id, status
      FROM quiz_sessions
      WHERE pin = ${pin}
        AND status IN ('waiting', 'countdown', 'playing', 'question_result', 'interrupted')
      LIMIT 1
    `;

    if (sessions.length === 0) {
      console.error(`Erro: Nenhuma sessão ativa encontrada com o PIN ${pin}.`);
      process.exit(1);
    }

    const sessionId = sessions[0].id;
    console.log(`Sessão encontrada no banco! ID: ${sessionId}`);

    console.log(`Cadastrando ${numPlayers} participantes virtuais no banco...`);
    const virtualParticipants = [];
    for (let i = 1; i <= numPlayers; i++) {
      virtualParticipants.push({
        sessionId,
        nickname: `Sim-${String(i).padStart(3, "0")}`,
        avatar: "live",
        participantToken: `token-virtual-${pin}-${i}`,
      });
    }

    for (const p of virtualParticipants) {
      await sql`
        INSERT INTO participants (session_id, nickname, avatar, participant_token)
        VALUES (${p.sessionId}, ${p.nickname}, ${p.avatar}, ${p.participantToken})
        ON CONFLICT (session_id, nickname)
        DO UPDATE SET participant_token = EXCLUDED.participant_token
      `;
    }
    console.log(`Participantes cadastrados/atualizados no banco com sucesso.`);

    console.log(`Iniciando conexão de ${numPlayers} sockets...`);

    // Tracks the ordinal of the "reporter" socket — the lowest ordinal currently connected.
    // This ensures printStats is always called even when socket 0 disconnects.
    let reporterOrdinal = 0;
    const connectedOrdinals = new Set();

    let currentQuestionId = null;
    let currentOptionsCount = 0;
    let sessionFinalized = false;

    for (let i = 0; i < numPlayers; i++) {
      const p = virtualParticipants[i];

      await new Promise((resolve) => setTimeout(resolve, joinDelayMs));

      const socket = io(realtimeUrl, {
        transports: ["websocket"],
        forceNew: true,
      });

      // Per-socket disconnect timestamp for reconnect timing
      let disconnectAt = null;
      let hasConnectedOnce = false;

      socket.on("connect", () => {
        if (!hasConnectedOnce) {
          hasConnectedOnce = true;
          stats.connected++;
          connectedOrdinals.add(i);
        } else {
          // This is a reconnect
          stats.connected++;
          connectedOrdinals.add(i);
          if (disconnectAt !== null) {
            const reconnectTime = Date.now() - disconnectAt;
            stats.reconnects++;
            stats.reconnectTimes.push(reconnectTime);
            disconnectAt = null;
          }
        }
        reporterOrdinal = Math.min(...connectedOrdinals);

        socket.emit("session:join", {
          avatar: p.avatar,
          nickname: p.nickname,
          participantId: p.participantToken,
          participantToken: p.participantToken,
          pin,
          role: "participant",
          score: 0,
          totalTimeMs: 0,
        });
      });

      socket.on("disconnect", (reason) => {
        stats.connected = Math.max(0, stats.connected - 1);
        stats.disconnects++;
        connectedOrdinals.delete(i);
        disconnectAt = Date.now();
        if (connectedOrdinals.size > 0) {
          reporterOrdinal = Math.min(...connectedOrdinals);
        }
        console.log(`[${p.nickname}] Desconectado: ${reason}`);
      });

      socket.on("connect_error", (err) => {
        stats.errors++;
        console.error(`[${p.nickname}] Erro de conexão:`, err.message);
      });

      socket.on("session:question", (payload) => {
        const question = payload?.question;
        if (!question) return;

        if (currentQuestionId !== question.id) {
          currentQuestionId = question.id;
          currentOptionsCount = question.options?.length || 4;

          if (i === reporterOrdinal) {
            console.log(
              `\n--- Pergunta Iniciada: "${question.prompt}" (ID: ${question.id}) ---`,
            );
            stats.answered = 0;
            stats.acks = 0;
            stats.rtts = [];
          }
        }

        const responseDelay =
          Math.random() * (actionDelayMax - actionDelayMin) + actionDelayMin;
        setTimeout(() => {
          if (currentQuestionId !== question.id) return;

          const answerIndex = Math.floor(Math.random() * currentOptionsCount);
          const submitTime = Date.now();

          socket.emit("answer:submit", {
            answerIndex,
            participantToken: p.participantToken,
            pin,
            questionId: question.id,
          });
          stats.answered++;

          socket.once("answer:ack", (ack) => {
            if (ack.accepted) {
              stats.acks++;
              stats.rtts.push(Date.now() - submitTime);
            } else {
              console.warn(`[${p.nickname}] Resposta rejeitada: ${ack.reason}`);
            }
          });
        }, responseDelay);
      });

      socket.on("question:result", (payload) => {
        if (i === reporterOrdinal) {
          console.log(`\n--- Resultado da Rodada Recebido ---`);
          console.log(
            `Acertos: ${payload.result?.correctCount}/${payload.result?.submittedCount}`,
          );
          printStats();
        }
      });

      socket.on("session:final", () => {
        if (!sessionFinalized) {
          sessionFinalized = true;
          console.log(`\n--- Sessão Finalizada! ---`);
          printStats();
          setTimeout(cleanup, 2000);
        }
        socket.disconnect();
      });

      clients.push(socket);
    }

    progressInterval = setInterval(() => {
      console.log(
        `[Progresso] Online: ${stats.connected}/${numPlayers} | ACKs: ${stats.acks}/${stats.answered} | Reconexões: ${stats.reconnects} | Erros: ${stats.errors}`,
      );
    }, 5000);
  } catch (error) {
    console.error("Falha fatal na execução do teste de carga:", error);
    await cleanup();
  }
}

run();
