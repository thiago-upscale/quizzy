import postgres from "postgres";

async function check() {
  const sql = postgres("postgresql://postgres:PgOvGwIipBfDgnOcycrVXkZbCfUMhvqe@zephyr.proxy.rlwy.net:54062/railway");
  const quiz = await sql`SELECT id, title, status FROM quizzes WHERE id = '8e0c09a1-c711-4047-a36a-9df405b3d7a3'`;
  console.log("Quiz:", JSON.stringify(quiz[0], null, 2));
  const qs = await sql`SELECT order_index, type, content->>'text' as text, correct_answer FROM questions WHERE quiz_id = '8e0c09a1-c711-4047-a36a-9df405b3d7a3' ORDER BY order_index`;
  qs.forEach(q => console.log(`Q${Number(q.order_index)+1}: ${String(q.text).substring(0,70)}... | correta: ${JSON.stringify(q.correct_answer)}`));
  await sql.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });
