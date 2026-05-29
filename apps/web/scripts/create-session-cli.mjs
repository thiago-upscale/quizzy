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
  console.error("Erro: DATABASE_URL não configurada.");
  process.exit(1);
}

const sql = postgres(databaseUrl);

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function run() {
  try {
    const quizId = "53d360f3-0200-4d8c-a3c5-85f796b2a71d";
    const hostId = "fa9c324b-ef09-4e79-a849-23773fb1ae4b"; // THIAGO SILVA SANTOS

    // 1. Verificamos se já existe sessão ativa
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
      await sql.end();
      return;
    }

    // 2. Se não existir, buscamos a última versão do quiz
    const versions = await sql`
      SELECT id 
      FROM quiz_versions 
      WHERE quiz_id = ${quizId} 
      ORDER BY version_number DESC 
      LIMIT 1
    `;

    if (versions.length === 0) {
      console.error("Erro: Nenhuma versão publicada encontrada para o quiz.");
      process.exit(1);
    }

    const quizVersionId = versions[0].id;

    // Geramos um PIN único
    let pin = "";
    for (let i = 0; i < 10; i++) {
      const candidate = generatePin();
      const duplicate = await sql`
        SELECT id FROM quiz_sessions WHERE pin = ${candidate} AND status IN ('waiting', 'countdown', 'playing', 'question_result', 'interrupted') LIMIT 1
      `;
      if (duplicate.length === 0) {
        pin = candidate;
        break;
      }
    }

    if (!pin) {
      console.error("Erro: Não foi possível gerar PIN único.");
      process.exit(1);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    const [newSession] = await sql`
      INSERT INTO quiz_sessions (quiz_id, quiz_version_id, host_id, pin, mode, status, starts_at, expires_at, created_at)
      VALUES (${quizId}, ${quizVersionId}, ${hostId}, ${pin}, 'live', 'waiting', ${now}, ${expiresAt}, ${now})
      RETURNING id, pin
    `;

    await sql`
      INSERT INTO session_events (session_id, event_type, payload, created_at)
      VALUES (${newSession.id}, 'session.created', ${JSON.stringify({ pin, quizId, quizVersionId, mode: "live" })}, ${now})
    `;

    console.log(`SESSION_PIN=${newSession.pin}`);
    console.log(`SESSION_ID=${newSession.id}`);
  } catch (error) {
    console.error("Falha ao criar/buscar sessão:", error);
  } finally {
    await sql.end();
  }
}

run();
