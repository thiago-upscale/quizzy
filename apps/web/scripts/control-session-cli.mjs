import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

// Load env vars
const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
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
const internalToken = process.env.REALTIME_INTERNAL_TOKEN || "quizzy-internal-dev-token";

const sql = postgres(databaseUrl);

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Parse args
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
const action = args.action; // 'create', 'start', 'next', 'info'
const pin = args.pin;

if (!action) {
  console.log("Comandos válidos: --action [create | start | next | info] [--pin <PIN>]");
  process.exit(0);
}

async function getSessionByPin(p) {
  const sessions = await sql`
    SELECT id, pin, status, quiz_id, quiz_version_id
    FROM quiz_sessions 
    WHERE pin = ${p} 
      AND status IN ('waiting', 'countdown', 'playing', 'question_result', 'interrupted', 'finished') 
    LIMIT 1
  `;
  return sessions[0] || null;
}

async function buildRuntimeQuestions(quizId, quizVersionId) {
  const [version] = await sql`
    SELECT questions_snapshot FROM quiz_versions WHERE id = ${quizVersionId}
  `;
  const currentQuestions = await sql`
    SELECT id, order_index, points_base 
    FROM questions 
    WHERE quiz_id = ${quizId} 
    ORDER BY order_index ASC
  `;

  const snapshot = version?.questions_snapshot || [];
  return snapshot.map((question, index) => {
    const currentQuestion = currentQuestions[index];
    const options = question.content?.options || [];
    return {
      correctIndex: question.correctAnswer?.index ?? 0,
      id: currentQuestion?.id || `virtual-${quizId}-${index}`,
      imageUrl: question.content?.imageUrl || null,
      options,
      orderIndex: index,
      persistable: Boolean(currentQuestion?.id),
      pointsBase: currentQuestion?.points_base ?? 1000,
      prompt: question.content?.question || `Pergunta ${index + 1}`,
      timeLimitSeconds: question.timeLimitSeconds ?? 20,
      type: question.type === "true_false" ? "true_false" : "multiple_choice",
    };
  });
}

async function run() {
  try {
    if (action === "create") {
      const quizId = "53d360f3-0200-4d8c-a3c5-85f796b2a71d"; // A Grande Virada
      const hostId = "fa9c324b-ef09-4e79-a849-23773fb1ae4b";

      // Procurar sessão ativa existente
      const existing = await sql`
        SELECT id, pin, status 
        FROM quiz_sessions 
        WHERE quiz_id = ${quizId} 
          AND status IN ('waiting', 'countdown', 'playing', 'question_result', 'interrupted') 
        LIMIT 1
      `;

      if (existing.length > 0) {
        console.log(`SESSION_PIN=${existing[0].pin}`);
        console.log(`SESSION_ID=${existing[0].id}`);
        console.log(`STATUS=${existing[0].status}`);
        return;
      }

      // Criar nova
      const versions = await sql`
        SELECT id FROM quiz_versions WHERE quiz_id = ${quizId} ORDER BY version_number DESC LIMIT 1
      `;
      if (versions.length === 0) {
        console.error("Nenhuma versão publicada encontrada.");
        process.exit(1);
      }
      const quizVersionId = versions[0].id;

      let newPin = "";
      for (let i = 0; i < 10; i++) {
        const candidate = generatePin();
        const duplicate = await sql`
          SELECT id FROM quiz_sessions WHERE pin = ${candidate} AND status IN ('waiting', 'countdown', 'playing', 'question_result', 'interrupted') LIMIT 1
        `;
        if (duplicate.length === 0) {
          newPin = candidate;
          break;
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      const [newSession] = await sql`
        INSERT INTO quiz_sessions (quiz_id, quiz_version_id, host_id, pin, mode, status, starts_at, expires_at, created_at)
        VALUES (${quizId}, ${quizVersionId}, ${hostId}, ${newPin}, 'live', 'waiting', ${now}, ${expiresAt}, ${now})
        RETURNING id, pin
      `;

      await sql`
        INSERT INTO session_events (session_id, event_type, payload, created_at)
        VALUES (${newSession.id}, 'session.created', ${JSON.stringify({ pin: newPin, quizId, quizVersionId, mode: "live" })}, ${now})
      `;

      console.log(`SESSION_PIN=${newSession.pin}`);
      console.log(`SESSION_ID=${newSession.id}`);
      console.log(`STATUS=waiting`);

    } else if (action === "start") {
      if (!pin) {
        console.error("Erro: PIN é necessário para iniciar a sessão.");
        process.exit(1);
      }
      const session = await getSessionByPin(pin);
      if (!session) {
        console.error("Erro: Sessão não encontrada para o PIN:", pin);
        process.exit(1);
      }
      if (session.status !== "waiting") {
        console.log(`A sessão já está em status: ${session.status}`);
        return;
      }

      console.log(`Iniciando a sessão ${session.id} (PIN ${pin})...`);
      const runtimeQuestions = await buildRuntimeQuestions(session.quiz_id, session.quiz_version_id);
      
      const now = new Date();
      await sql`
        UPDATE quiz_sessions SET status = 'countdown' WHERE id = ${session.id}
      `;
      await sql`
        INSERT INTO session_events (session_id, event_type, payload, created_at)
        VALUES (${session.id}, 'session.countdown_started', ${JSON.stringify({ pin })}, ${now})
      `;

      const response = await fetch(`${realtimeUrl}/internal/session/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-quizzy-internal-token": internalToken,
        },
        body: JSON.stringify({
          questions: runtimeQuestions,
          pin,
          sessionId: session.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Realtime server start failed: ${errorText}`);
      }

      console.log("Sessão iniciada com sucesso (status: countdown no realtime).");

    } else if (action === "next") {
      if (!pin) {
        console.error("Erro: PIN é necessário para avançar.");
        process.exit(1);
      }
      const session = await getSessionByPin(pin);
      if (!session) {
        console.error("Erro: Sessão não encontrada.");
        process.exit(1);
      }

      console.log(`Avançando a sessão ${session.id} (PIN ${pin})...`);
      const response = await fetch(`${realtimeUrl}/internal/session/next`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-quizzy-internal-token": internalToken,
        },
        body: JSON.stringify({
          pin,
          sessionId: session.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Realtime server advance failed: ${errorText}`);
      }

      const resBody = await response.json();
      console.log("Sessão avançada com sucesso. Resposta:", resBody);

    } else if (action === "info") {
      if (!pin) {
        console.error("Erro: PIN é necessário.");
        process.exit(1);
      }
      const session = await getSessionByPin(pin);
      if (!session) {
        console.error("Sessão não encontrada.");
        process.exit(1);
      }
      const pCount = await sql`
        SELECT COUNT(*)::int as count FROM participants WHERE session_id = ${session.id}
      `;
      console.log(`Sessão ID: ${session.id}`);
      console.log(`PIN: ${session.pin}`);
      console.log(`Status: ${session.status}`);
      console.log(`Participantes no banco: ${pCount[0].count}`);
    }
  } catch (error) {
    console.error("Erro ao executar ação:", error.message);
  } finally {
    await sql.end();
  }
}

run();
