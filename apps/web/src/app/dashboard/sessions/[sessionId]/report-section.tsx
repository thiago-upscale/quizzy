import Link from "next/link";
import {
  EmptyStateCard,
  MetricCard,
  SectionHeading,
  StatusAlert,
} from "@/components/phase-one-ui";
import type { SessionReport } from "@/lib/session-report";
import { formatReportDuration } from "@/lib/session-report";

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

export function ReportSection({
  mode,
  report,
  sessionId,
  sessionStatus,
}: {
  mode: string;
  report: SessionReport | null;
  sessionId: string;
  sessionStatus: string;
}) {
  const isAvailable = sessionStatus === "finished" || mode === "individual";
  const isFinished = sessionStatus === "finished";
  const topRank = report?.leaderboard[0] ?? null;

  return (
    <section className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
      <SectionHeading
        eyebrow="Relatório"
        helper={
          isFinished
            ? "Leia primeiro o resumo executivo da sessão e depois desca para ranking, tentativas e detalhe por pergunta."
            : mode === "individual"
              ? "A sessão individual atualiza o relatório conforme as tentativas sao concluidas."
              : "O relatório completo fica disponível assim que a sessão for encerrada."
        }
        title="Resultado da sessão"
        trailing={
          isAvailable ? (
            <>
              <Link
                className="rounded-full border border-[var(--quizzy-border)] px-4 py-2 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[color:color-mix(in_srgb,var(--quizzy-surface)_65%,white)]"
                href={`/dashboard/sessions/${sessionId}/report/summary.csv`}
                prefetch={false}
              >
                Baixar CSV resumo
              </Link>
              <Link
                className="rounded-full bg-[var(--quizzy-navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3557]"
                href={`/dashboard/sessions/${sessionId}/report/detailed.csv`}
                prefetch={false}
              >
                Baixar CSV detalhado
              </Link>
            </>
          ) : null
        }
      />

      {!isAvailable || !report ? (
        <div className="mt-6">
          <EmptyStateCard
            description={
              mode === "individual"
                ? "Assim que as primeiras tentativas forem concluidas, este painel passa a refletir ranking, desempenho por pergunta e exportacoes em CSV."
                : "Assim que o host encerrar a sessão, o dashboard libera ranking final, desempenho por pergunta e exportacoes em CSV."
            }
            title={
              mode === "individual"
                ? "Aguardando as primeiras respostas"
                : "Relatório liberado no fechamento"
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              helper="Participantes com resultado consolidado nesta sessão."
              label="Participantes"
              value={report.summary.participantsCount}
            />
            <MetricCard
              helper="Volume bruto de respostas aproveitadas no relatório."
              label="Respostas"
              value={report.summary.answersCount}
            />
            <MetricCard
              accent="teal"
              helper="Leitura rápida da média de desempenho do grupo."
              label="Média de score"
              value={report.summary.averageScore}
            />
            <MetricCard
              accent="amber"
              helper="Taxa média de acerto entre todas as respostas registradas."
              label="Taxa de acerto"
              value={formatPercent(report.summary.accuracyPercent)}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[1.5rem] border border-[#fed7aa] bg-[#fff7ed] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a3412]">
                Insight principal
              </p>
              <h3 className="mt-3 text-xl font-semibold text-[#7c2d12]">
                {report.summary.hardestQuestion
                  ? `A pergunta mais dificil foi a Q${report.summary.hardestQuestion.orderIndex + 1}.`
                  : "Ainda não ha dados suficientes para destacar uma pergunta critica."}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#9a3412]">
                {report.summary.hardestQuestion
                  ? `${truncateText(report.summary.hardestQuestion.prompt, 140)} Apenas ${formatPercent(report.summary.hardestQuestion.accuracyPercent)} de acerto em ${report.summary.hardestQuestion.responsesCount} respostas.`
                  : "Assim que a sessão acumular respostas, este bloco mostra a principal fricção do quiz."}
              </p>
            </article>
            <div className="grid gap-4">
              <MetricCard
                accent="navy"
                helper="Tempo medio por resposta para calibrar ritmo e clareza."
                label="Ritmo medio"
                value={formatReportDuration(report.summary.averageTimePerAnswerMs)}
              />
              <MetricCard
                accent="teal"
                helper={
                  topRank
                    ? `${topRank.score} pontos em ${formatReportDuration(topRank.totalTimeMs)}.`
                    : "O ranking principal aparece assim que houver desempenho consolidado."
                }
                label="Lider da sessão"
                value={topRank ? topRank.nickname : "Sem lider"}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <StatusAlert tone="info">
              Comece pelo resumo executivo e use as tabelas abaixo para
              verificacao detalhada ou exportacao operacional.
            </StatusAlert>
            <StatusAlert tone="success">
              {mode === "individual"
                ? "As exportacoes incluem tentativas separadas para leitura de progresso e melhor resultado."
                : "As exportacoes consolidam ranking final, respostas e metadados essenciais da sessão live."}
            </StatusAlert>
          </div>

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Ranking final"
              helper="Leitura consolidada da classificacao com score, tempo, tentativas e precisão."
              title="Classificacao dos participantes"
            />
            <div className="overflow-x-auto rounded-[1.5rem] border border-[#e2e8f0]">
              <table className="min-w-full border-collapse bg-white text-left text-sm">
                <thead className="bg-[#f8fbff] text-[#61708c]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Posicao</th>
                    <th className="px-4 py-3 font-semibold">Nickname</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Tempo total</th>
                    <th className="px-4 py-3 font-semibold">Tentativas</th>
                    <th className="px-4 py-3 font-semibold">Respostas</th>
                    <th className="px-4 py-3 font-semibold">Acertos</th>
                    <th className="px-4 py-3 font-semibold">Precisão</th>
                  </tr>
                </thead>
                <tbody>
                  {report.leaderboard.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5" colSpan={9}>
                        <EmptyStateCard
                          description="Sem participantes registrados ainda. Assim que a sessão acumular resultados, o ranking consolidado aparece aqui."
                          title="Nenhum participante foi registrado nesta sessão"
                        />
                      </td>
                    </tr>
                  ) : (
                    report.leaderboard.map((entry) => (
                      <tr
                        key={entry.participantId}
                        className="border-t border-[#e2e8f0]"
                      >
                        <td className="px-4 py-3 font-semibold text-[#132238]">
                          {entry.rank}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#132238]">
                          {entry.nickname}
                        </td>
                        <td className="px-4 py-3 text-[#44516a]">
                          {entry.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[#132238]">
                          {entry.score}
                        </td>
                        <td className="px-4 py-3 text-[#44516a]">
                          {formatReportDuration(entry.totalTimeMs)}
                        </td>
                        <td className="px-4 py-3 text-[#44516a]">
                          {entry.attemptsCount}
                        </td>
                        <td className="px-4 py-3 text-[#44516a]">
                          {entry.answeredCount}
                        </td>
                        <td className="px-4 py-3 text-[#44516a]">
                          {entry.correctCount}
                        </td>
                        <td className="px-4 py-3 text-[#44516a]">
                          {formatPercent(entry.accuracyPercent)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {report.session.mode === "individual" ? (
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Tentativas"
                helper="Separacao por participante e por execucao para identificar melhor resultado e consistencia."
                title="Histórico por participante"
              />
              <div className="overflow-x-auto rounded-[1.5rem] border border-[#e2e8f0]">
                <table className="min-w-full border-collapse bg-white text-left text-sm">
                  <thead className="bg-[#f8fbff] text-[#61708c]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nickname</th>
                      <th className="px-4 py-3 font-semibold">Tentativa</th>
                      <th className="px-4 py-3 font-semibold">Melhor</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Tempo total</th>
                      <th className="px-4 py-3 font-semibold">Respostas</th>
                      <th className="px-4 py-3 font-semibold">Acertos</th>
                      <th className="px-4 py-3 font-semibold">Precisão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.attemptRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-5" colSpan={8}>
                          <EmptyStateCard
                            description="Assim que a primeira tentativa for concluida, o relatório passa a distinguir histórico, melhor pontuação e consistencia do participante."
                            title="Nenhuma tentativa concluida ainda nesta sessão"
                          />
                        </td>
                      </tr>
                    ) : (
                      report.attemptRows.map((entry) => (
                        <tr
                          key={entry.attemptId}
                          className="border-t border-[#e2e8f0]"
                        >
                          <td className="px-4 py-3 font-medium text-[#132238]">
                            {entry.nickname}
                          </td>
                          <td className="px-4 py-3 text-[#44516a]">
                            {entry.attemptNumber}
                          </td>
                          <td className="px-4 py-3 text-[#44516a]">
                            {entry.isBestAttempt ? "Sim" : "Não"}
                          </td>
                          <td className="px-4 py-3 text-[#132238]">
                            {entry.score}
                          </td>
                          <td className="px-4 py-3 text-[#44516a]">
                            {formatReportDuration(entry.totalTimeMs)}
                          </td>
                          <td className="px-4 py-3 text-[#44516a]">
                            {entry.answeredCount}
                          </td>
                          <td className="px-4 py-3 text-[#44516a]">
                            {entry.correctCount}
                          </td>
                          <td className="px-4 py-3 text-[#44516a]">
                            {formatPercent(entry.accuracyPercent)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <SectionHeading
              eyebrow="Desempenho por pergunta"
              helper="Use esta visão para detectar fricção, ritmo e clareza do conteúdo em cada etapa do quiz."
              title="Leitura de acerto e ritmo"
            />
            <div className="overflow-x-auto rounded-[1.5rem] border border-[#e2e8f0]">
              <table className="min-w-full border-collapse bg-white text-left text-sm">
                <thead className="bg-[#f8fbff] text-[#61708c]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Pergunta</th>
                    <th className="px-4 py-3 font-semibold">Enunciado</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Respostas</th>
                    <th className="px-4 py-3 font-semibold">Acertos</th>
                    <th className="px-4 py-3 font-semibold">Precisão</th>
                    <th className="px-4 py-3 font-semibold">Tempo medio</th>
                  </tr>
                </thead>
                <tbody>
                  {report.questionBreakdown.map((question) => (
                    <tr
                      key={`question-${question.orderIndex}`}
                      className="border-t border-[#e2e8f0]"
                    >
                      <td className="px-4 py-3 font-semibold text-[#132238]">
                        Q{question.orderIndex + 1}
                      </td>
                      <td className="px-4 py-3 text-[#132238]">
                        {question.prompt}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            question.skipped
                              ? "rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c2410c]"
                              : "rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]"
                          }
                        >
                          {question.skipped ? "Pulada" : "Aplicada"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#44516a]">
                        {question.responsesCount}
                      </td>
                      <td className="px-4 py-3 text-[#44516a]">
                        {question.correctCount}
                      </td>
                      <td className="px-4 py-3 text-[#44516a]">
                        {formatPercent(question.accuracyPercent)}
                      </td>
                      <td className="px-4 py-3 text-[#44516a]">
                        {formatReportDuration(question.averageTimeMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
