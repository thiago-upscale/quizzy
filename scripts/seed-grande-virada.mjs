import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { quizzes, questions } from "../apps/web/src/db/schema.ts";

const DATABASE_URL =
  "postgresql://postgres:PgOvGwIipBfDgnOcycrVXkZbCfUMhvqe@zephyr.proxy.rlwy.net:54062/railway";

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

// 1. Busca o primeiro usuário e organização disponíveis
const usersResult = await pool.query(
  "SELECT u.id as user_id, u.organization_id FROM users u LIMIT 1",
);
const { user_id, organization_id } = usersResult.rows[0];
console.log("User ID:", user_id);
console.log("Org ID:", organization_id);

// 2. Cria o quiz
const [quiz] = await db
  .insert(quizzes)
  .values({
    title: "A Grande Virada",
    organizationId: organization_id,
    createdBy: user_id,
    status: "draft",
  })
  .returning();

console.log("Quiz criado:", quiz.id);

// 3. Cria as 5 perguntas
const questionsData = [
  {
    quizId: quiz.id,
    orderIndex: 0,
    type: "multiple_choice",
    timeLimitSeconds: 30,
    pointsBase: 1000,
    content: {
      text: "Luciana recebeu um evento com todas as contratações realizadas pelo Cliente, onde ela apenas realizaria a intermediação de pagamento desse evento, porém o Tipo de Evento está classificado como Mini Meeting, o que deve ser feito:",
      options: [
        {
          index: 0,
          text: "Efetuar os devidos lançamentos e solicitar que o Financeiro altere o tipo de Evento para Intermediação de Pagamentos",
        },
        {
          index: 1,
          text: "Efetuar os devidos lançamentos e fechar o evento, não se esquecendo de comprovar que o cliente que realizou todas as contratações",
        },
        {
          index: 2,
          text: "Efetuar os devidos lançamentos e solicitar que a supervisão altere o tipo de Evento para Intermediação de Pagamentos, não se esquecendo de comprovar que o cliente que realizou todas as contratações",
        },
        {
          index: 3,
          text: "Como o Tipo de Evento está errado, devolver a supervisão e aguardando que seja ajustado para começar as devidas tratativas",
        },
      ],
    },
    correctAnswer: { optionIndex: 2 },
  },
  {
    quizId: quiz.id,
    orderIndex: 1,
    type: "multiple_choice",
    timeLimitSeconds: 30,
    pointsBase: 1000,
    content: {
      text: "Sabrina precisa realizar um lançamento de Fee e um do Imposto sob o Fee:",
      options: [
        {
          index: 0,
          text: "Ela lança duas linhas de Cobrança de Serviço, uma de Imposto e uma de Fee",
        },
        {
          index: 1,
          text: "Ela lança o valor total como Imposto sob o Fee já que não tem problema",
        },
        {
          index: 2,
          text: "Ela lança o valor total como Fee Terrestre, pois não é necessário que seja lançado separado",
        },
        {
          index: 3,
          text: "Lanço como a primeira opção que aparece, Comissão Diversos, já que assim ganho tempo",
        },
      ],
    },
    correctAnswer: { optionIndex: 0 },
  },
  {
    quizId: quiz.id,
    orderIndex: 2,
    type: "multiple_choice",
    timeLimitSeconds: 30,
    pointsBase: 1000,
    content: {
      text: "Na nota fiscal David recebeu um descritivo de um job que teve AB, Hospedagem e Equipamentos:",
      options: [
        {
          index: 0,
          text: "Solicito que o fornecedor envie uma nota para cada serviço e lanço uma linha para cada nota",
        },
        {
          index: 1,
          text: "Lanço uma única linha com o tipo de serviço AB no valor total",
        },
        {
          index: 2,
          text: "Lanço 3 linhas diferentes com a mesma nota mas com o valor desmembrado",
        },
        {
          index: 3,
          text: "Na mesma linha consigo inserir os 3 itens e desmembrar os valores corretamente",
        },
      ],
    },
    correctAnswer: { optionIndex: 3 },
  },
  {
    quizId: quiz.id,
    orderIndex: 3,
    type: "multiple_choice",
    timeLimitSeconds: 30,
    pointsBase: 1000,
    content: {
      text: "Renata precisa lançar um valor de Markup dentro de um evento:",
      options: [
        {
          index: 0,
          text: "Abre uma linha de Hotelaria e lança uma linha de 0,01 centavo e inserindo o valor de Markup, não podendo colocar o Fornecedor como Tour House Eventos e Incentivos",
        },
        {
          index: 1,
          text: "Abre uma linha de AB e lança uma linha de 0,01 centavo e inserindo o valor de Markup, colocando o Fornecedor como Tour House Eventos e Incentivos",
        },
        {
          index: 2,
          text: "Abre uma linha de Hotelaria e lança uma linha de 0,01 centavo e inserindo o valor de Markup, colocando o Fornecedor como Tour House Eventos e Incentivos",
        },
        {
          index: 3,
          text: "Abre uma linha de AB e lança uma linha de 0,01 centavo e inserindo o valor de Markup, não podendo colocar o Fornecedor como Tour House Eventos e Incentivos",
        },
      ],
    },
    correctAnswer: { optionIndex: 3 },
  },
  {
    quizId: quiz.id,
    orderIndex: 4,
    type: "multiple_choice",
    timeLimitSeconds: 30,
    pointsBase: 1000,
    content: {
      text: "Getulio identificou que precisa lançar um Tipo de Serviço que não tem cadastrado, o que ele deve fazer?",
      options: [
        {
          index: 0,
          text: "Inserir qualquer outro Tipo de Serviço, desde que o valor esteja correto não tem problema",
        },
        { index: 1, text: "Solicita a criação do Tipo de Serviço ao TI" },
        {
          index: 2,
          text: "Solicita a criação do Tipo de Serviço a Auditoria e Processos",
        },
        {
          index: 3,
          text: "Solicita a criação do Tipo de Serviço ao Financeiro",
        },
      ],
    },
    correctAnswer: { optionIndex: 2 },
  },
];

await db.insert(questions).values(questionsData);
console.log("✅ 5 perguntas inseridas com sucesso!");
console.log(`Quiz ID: ${quiz.id}`);
console.log(`Acesse: http://localhost:3000/dashboard/quizzes/${quiz.id}`);

await pool.end();
