import postgres from "postgres";
import { randomUUID } from "crypto";

async function fix() {
  const sql = postgres("postgresql://postgres:PgOvGwIipBfDgnOcycrVXkZbCfUMhvqe@zephyr.proxy.rlwy.net:54062/railway");

  // Verifica o que está salvo hoje
  const raw = await sql`SELECT id, order_index, content FROM questions WHERE quiz_id = '8e0c09a1-c711-4047-a36a-9df405b3d7a3' ORDER BY order_index LIMIT 1`;
  console.log("Content atual (Q1):", JSON.stringify(raw[0]?.content));

  const questionsData = [
    {
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

  // Atualiza cada questão com o content correto (objeto nativo, não string)
  for (const q of questionsData) {
    const content = sql.json({
      text: q.text,
      options: q.options.map((text, index) => ({ index, text })),
    });
    const correctAnswer = sql.json({ optionIndex: q.correctIndex });

    await sql`
      UPDATE questions
      SET content = ${content}, correct_answer = ${correctAnswer}
      WHERE quiz_id = '8e0c09a1-c711-4047-a36a-9df405b3d7a3'
        AND order_index = ${q.orderIndex}
    `;
    console.log(`  ✓ Q${q.orderIndex + 1} atualizada`);
  }

  // Verifica resultado
  const check = await sql`
    SELECT order_index, content->>'text' as text, correct_answer
    FROM questions
    WHERE quiz_id = '8e0c09a1-c711-4047-a36a-9df405b3d7a3'
    ORDER BY order_index
  `;
  check.forEach(q =>
    console.log(`Q${Number(q.order_index)+1}: ${String(q.text).substring(0,60)}... ✓`)
  );

  console.log("\n✅ Conteúdo corrigido com sucesso!");
  await sql.end();
}

fix().catch(e => { console.error("❌", e.message); process.exit(1); });
