// Script puro Node.js para criar o quiz "A Grande Virada"
// Executa com: node scripts/seed-grande-virada.cjs
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

const DATABASE_URL =
  "postgresql://postgres:PgOvGwIipBfDgnOcycrVXkZbCfUMhvqe@zephyr.proxy.rlwy.net:54062/railway";

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // 1. Busca usuário e organização
    const usersResult = await client.query(
      "SELECT id as user_id, organization_id FROM users LIMIT 1",
    );
    const { user_id, organization_id } = usersResult.rows[0];
    console.log("User ID:", user_id);
    console.log("Org ID:", organization_id);

    // 2. Cria o quiz
    const quizId = randomUUID();
    await client.query(
      `INSERT INTO quizzes (id, organization_id, created_by, title, description, branding, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        quizId,
        organization_id,
        user_id,
        "A Grande Virada",
        null,
        "{}",
        "draft",
      ],
    );
    console.log("Quiz criado:", quizId);

    // 3. Perguntas
    const questionsData = [
      {
        id: randomUUID(),
        orderIndex: 0,
        text: "Luciana recebeu um evento com todas as contratações realizadas pelo Cliente, onde ela apenas realizaria a intermediação de pagamento desse evento, porém o Tipo de Evento está classificado como Mini Meeting, o que deve ser feito:",
        options: [
          "Efetuar os devidos lançamentos e solicitar que o Financeiro altere o tipo de Evento para Intermediação de Pagamentos",
          "Efetuar os devidos lançamentos e fechar o evento, não se esquecendo de comprovar que o cliente que realizou todas as contratações",
          "Efetuar os devidos lançamentos e solicitar que a supervisão altere o tipo de Evento para Intermediação de Pagamentos, não se esquecendo de comprovar que o cliente que realizou todas as contratações",
          "Como o Tipo de Evento está errado, devolver a supervisão e aguardando que seja ajustado para começar as devidas tratativas",
        ],
        correctIndex: 2,
      },
      {
        id: randomUUID(),
        orderIndex: 1,
        text: "Sabrina precisa realizar um lançamento de Fee e um do Imposto sob o Fee:",
        options: [
          "Ela lança duas linhas de Cobrança de Serviço, uma de Imposto e uma de Fee",
          "Ela lança o valor total como Imposto sob o Fee já que não tem problema",
          "Ela lança o valor total como Fee Terrestre, pois não é necessário que seja lançado separado",
          "Lanço como a primeira opção que aparece, Comissão Diversos, já que assim ganho tempo",
        ],
        correctIndex: 0,
      },
      {
        id: randomUUID(),
        orderIndex: 2,
        text: "Na nota fiscal David recebeu um descritivo de um job que teve AB, Hospedagem e Equipamentos:",
        options: [
          "Solicito que o fornecedor envie uma nota para cada serviço e lanço uma linha para cada nota",
          "Lanço uma única linha com o tipo de serviço AB no valor total",
          "Lanço 3 linhas diferentes com a mesma nota mas com o valor desmembrado",
          "Na mesma linha consigo inserir os 3 itens e desmembrar os valores corretamente",
        ],
        correctIndex: 3,
      },
      {
        id: randomUUID(),
        orderIndex: 3,
        text: "Renata precisa lançar um valor de Markup dentro de um evento:",
        options: [
          "Abre uma linha de Hotelaria e lança uma linha de 0,01 centavo e inserindo o valor de Markup, não podendo colocar o Fornecedor como Tour House Eventos e Incentivos",
          "Abre uma linha de AB e lança uma linha de 0,01 centavo e inserindo o valor de Markup, colocando o Fornecedor como Tour House Eventos e Incentivos",
          "Abre uma linha de Hotelaria e lança uma linha de 0,01 centavo e inserindo o valor de Markup, colocando o Fornecedor como Tour House Eventos e Incentivos",
          "Abre uma linha de AB e lança uma linha de 0,01 centavo e inserindo o valor de Markup, não podendo colocar o Fornecedor como Tour House Eventos e Incentivos",
        ],
        correctIndex: 3,
      },
      {
        id: randomUUID(),
        orderIndex: 4,
        text: "Getulio identificou que precisa lançar um Tipo de Serviço que não tem cadastrado, o que ele deve fazer?",
        options: [
          "Inserir qualquer outro Tipo de Serviço, desde que o valor esteja correto não tem problema",
          "Solicita a criação do Tipo de Serviço ao TI",
          "Solicita a criação do Tipo de Serviço a Auditoria e Processos",
          "Solicita a criação do Tipo de Serviço ao Financeiro",
        ],
        correctIndex: 2,
      },
    ];

    for (const q of questionsData) {
      const content = JSON.stringify({
        text: q.text,
        options: q.options.map((text, index) => ({ index, text })),
      });
      const correctAnswer = JSON.stringify({ optionIndex: q.correctIndex });

      await client.query(
        `INSERT INTO questions (id, quiz_id, order_index, type, content, correct_answer, points_base, time_limit_seconds, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          q.id,
          quizId,
          q.orderIndex,
          "multiple_choice",
          content,
          correctAnswer,
          1000,
          30,
        ],
      );
      console.log(`  ✓ Pergunta ${q.orderIndex + 1} inserida`);
    }

    console.log("\n✅ Quiz criado com sucesso!");
    console.log(`Quiz ID: ${quizId}`);
    console.log(`URL local: http://localhost:3000/dashboard/quizzes/${quizId}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
