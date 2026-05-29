import Link from "next/link";
import type { SessionReport } from "@/lib/session-report";
import { formatReportDuration } from "@/lib/session-report";

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
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

  return (
    <section className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
            Relatorio
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
            Resultado da sessao
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#61708c]">
            {isFinished
              ? "Use esta leitura para revisar ranking, acerto por pergunta e exportar os dados da sessao."
              : mode === "individual"
                ? "A sessao individual atualiza o relatorio conforme as tentativas sao concluidas."
                : "O relatorio completo fica disponivel assim que a sessao for encerrada."}
          </p>
        </div>
        {isAvailable ? (
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-[#d2d8e5] px-4 py-2 text-sm font-semibold text-[#10233f] transition hover:bg-[#f8fbff]"
              href={`/dashboard/sessions/${sessionId}/report/summary.csv`}
              prefetch={false}
            >
              Baixar CSV resumo
            </Link>
            <Link
              className="rounded-full bg-[#10233f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3557]"
              href={`/dashboard/sessions/${sessionId}/report/detailed.csv`}
              prefetch={false}
            >
              Baixar CSV detalhado
            </Link>
          </div>
        ) : null}
      </div>

      {!isAvailable || !report ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#d2d8e5] bg-[#f8fbff] p-6">
          <p className="text-sm font-medium text-[#44516a]">
            {mode === "individual"
              ? "Assim que as primeiras tentativas forem concluidas, este painel passa a refletir ranking, desempenho por pergunta e exportacoes em CSV."
              : "Assim que o host encerrar a sessao, o dashboard libera ranking final, desempenho por pergunta e exportacoes em CSV."}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Participantes
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#132238]">
                  {report.summary.participantsCount}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Respostas
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#132238]">
                  {report.summary.answersCount}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Media de score
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#132238]">
                  {report.summary.averageScore}
                </p>
              </article>
              <article className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Taxa de acerto
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#132238]">
                  {formatPercent(report.summary.accuracyPercent)}
                </p>
              </article>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Ranking final
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#132238]">
                Classificacao dos participantes
              </h3>
            </div>
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
                    <th className="px-4 py-3 font-semibold">Precisao</th>
                  </tr>
                </thead>
                <tbody>
                  {report.leaderboard.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-[#61708c]" colSpan={9}>
                        Nenhum participante foi registrado nesta sessao.
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Tentativas
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#132238]">
                  Historico por participante
                </h3>
              </div>
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
                      <th className="px-4 py-3 font-semibold">Precisao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.attemptRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-5 text-[#61708c]" colSpan={8}>
                          Nenhuma tentativa concluida ainda nesta sessao.
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
                            {entry.isBestAttempt ? "Sim" : "Nao"}
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Desempenho por pergunta
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#132238]">
                Leitura de acerto da rodada
              </h3>
            </div>
            <div className="overflow-x-auto rounded-[1.5rem] border border-[#e2e8f0]">
              <table className="min-w-full border-collapse bg-white text-left text-sm">
                <thead className="bg-[#f8fbff] text-[#61708c]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Pergunta</th>
                    <th className="px-4 py-3 font-semibold">Enunciado</th>
                    <th className="px-4 py-3 font-semibold">Respostas</th>
                    <th className="px-4 py-3 font-semibold">Acertos</th>
                    <th className="px-4 py-3 font-semibold">Precisao</th>
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
