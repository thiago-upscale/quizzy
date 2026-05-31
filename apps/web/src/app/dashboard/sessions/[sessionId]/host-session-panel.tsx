"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { StartLiveSessionState } from "../../actions";

type Participant = {
  avatar: string;
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
  score: number;
  totalTimeMs: number;
};

type LeaderboardEntry = {
  answeredCurrentQuestion: boolean;
  avatar: string;
  id: string;
  lastIsCorrect: boolean | null;
  lastPointsEarned: number;
  nickname: string;
  rank: number;
  score: number;
  totalTimeMs: number;
};

type ActiveQuestion = {
  id: string;
  options: string[];
  orderIndex: number;
  prompt: string;
  startedAt: number;
  submittedCount: number;
  timeLimitSeconds: number;
  totalQuestions: number;
  type: "multiple_choice" | "true_false";
};

type QuestionResult = {
  correctCount: number;
  correctOptionIndex: number;
  leaderboard: LeaderboardEntry[];
  options: string[];
  prompt: string;
  questionId: string;
  questionOrderIndex: number;
  submittedCount: number;
  totalQuestions: number;
};

type SessionStatePayload = {
  connectedParticipantsCount: number;
  countdownSeconds: number | null;
  hostRecoveryDeadlineAt: number | null;
  hostLastSeenAt: number | null;
  hostPresenceStatus: "offline" | "online";
  interruptionReason: "host_disconnected" | null;
  lastEventAt: number | null;
  offlineParticipantsCount: number;
  rejectedAnswersCount: number;
  status: string;
};

const initialActionState: StartLiveSessionState = {
  status: "idle",
};

function formatDuration(totalTimeMs: number) {
  const totalSeconds = Math.round(totalTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatEventTime(value: number | null) {
  if (!value) {
    return "Sem eventos recentes";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  }).format(value);
}

function formatRemainingSeconds(remainingMs: number) {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function HostSessionPanel({
  advanceAction,
  initialParticipants,
  pin,
  publicUrl,
  qrCodeDataUrl,
  realtimeUrl,
  restartAction,
  sessionId,
  sessionStatus,
  startAction,
}: {
  advanceAction: (
    state: StartLiveSessionState,
    formData: FormData,
  ) => Promise<StartLiveSessionState>;
  initialParticipants: Participant[];
  pin: string;
  publicUrl: string;
  qrCodeDataUrl: string;
  realtimeUrl: string;
  restartAction: (
    state: StartLiveSessionState,
    formData: FormData,
  ) => Promise<StartLiveSessionState>;
  sessionId: string;
  sessionStatus: string;
  startAction: (
    state: StartLiveSessionState,
    formData: FormData,
  ) => Promise<StartLiveSessionState>;
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [connectedCount, setConnectedCount] = useState(
    initialParticipants.filter(
      (participant) => participant.presenceStatus === "online",
    ).length,
  );
  const [status, setStatus] = useState(sessionStatus);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketPhase, setSocketPhase] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected"
  >("connecting");
  const [reconnectNote, setReconnectNote] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [operationalState, setOperationalState] = useState<SessionStatePayload>(
    {
      connectedParticipantsCount: initialParticipants.filter(
        (participant) => participant.presenceStatus === "online",
      ).length,
      countdownSeconds: sessionStatus === "countdown" ? 3 : null,
      hostRecoveryDeadlineAt: null,
      hostLastSeenAt: null,
      hostPresenceStatus: "offline",
      interruptionReason: null,
      lastEventAt: null,
      offlineParticipantsCount: initialParticipants.length,
      rejectedAnswersCount: 0,
      status: sessionStatus,
    },
  );
  const [currentQuestion, setCurrentQuestion] = useState<ActiveQuestion | null>(
    null,
  );
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(
    null,
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [questionStats, setQuestionStats] = useState({
    submittedCount: 0,
    totalParticipants: initialParticipants.length,
  });
  const [startState, startFormAction] = useActionState(
    startAction,
    initialActionState,
  );
  const [advanceState, advanceFormAction] = useActionState(
    advanceAction,
    initialActionState,
  );
  const [restartState, restartFormAction] = useActionState(
    restartAction,
    initialActionState,
  );

  const nextButtonLabel = useMemo(() => {
    if (status === "playing") {
      return "Encerrar rodada";
    }

    if (status === "question_result") {
      if (
        currentResult &&
        currentResult.questionOrderIndex + 1 >= currentResult.totalQuestions
      ) {
        return "Encerrar sessao";
      }

      return "Abrir proxima pergunta";
    }

    if (status === "finished") {
      return "Sessao encerrada";
    }

    return "Abrir primeira pergunta";
  }, [currentResult, status]);

  const operationalWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (!socketConnected) {
      warnings.push("Painel do host sem conexao ativa com o realtime");
    }

    if (operationalState.hostPresenceStatus === "offline") {
      warnings.push("Host offline no canal realtime");
    }

    if (status === "interrupted") {
      warnings.push("Sessao pausada por ausencia do host");
    }

    if (operationalState.rejectedAnswersCount > 0) {
      warnings.push(
        `${operationalState.rejectedAnswersCount} resposta(s) rejeitada(s) nesta sala`,
      );
    }

    return warnings;
  }, [
    operationalState.hostPresenceStatus,
    operationalState.rejectedAnswersCount,
    socketConnected,
    status,
  ]);

  const recoverySecondsRemaining =
    operationalState.hostRecoveryDeadlineAt !== null
      ? formatRemainingSeconds(operationalState.hostRecoveryDeadlineAt - now)
      : null;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      setSocketPhase("connected");
      setReconnectNote(null);
      socket.emit("host:watch", { pin, sessionId });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setSocketPhase("reconnecting");
      setReconnectNote("Tentando retomar o canal do host...");
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      setSocketPhase("reconnecting");
      setReconnectNote(`Nova tentativa de conexao (${attempt})`);
    });

    socket.io.on("reconnect_failed", () => {
      setSocketPhase("disconnected");
      setReconnectNote("Nao foi possivel retomar o realtime automaticamente.");
    });

    socket.io.on("error", () => {
      setSocketPhase("disconnected");
    });

    socket.on(
      "participant:list",
      (payload: { connectedCount: number; participants: Participant[] }) => {
        setParticipants(payload.participants);
        setConnectedCount(payload.connectedCount);
        setQuestionStats((currentStats) => ({
          ...currentStats,
          totalParticipants: payload.connectedCount,
        }));
      },
    );

    socket.on("session:state", (payload: SessionStatePayload) => {
      setStatus(payload.status);
      setOperationalState(payload);
    });

    socket.on("session:question", (payload: { question: ActiveQuestion }) => {
      setCurrentQuestion(payload.question);
      setCurrentResult(null);
      setQuestionStats((currentStats) => ({
        submittedCount: payload.question.submittedCount,
        totalParticipants: currentStats.totalParticipants,
      }));
    });

    socket.on(
      "question:stats",
      (payload: { submittedCount: number; totalParticipants: number }) => {
        setQuestionStats({
          submittedCount: payload.submittedCount,
          totalParticipants: payload.totalParticipants,
        });
      },
    );

    socket.on(
      "leaderboard:update",
      (payload: { entries: LeaderboardEntry[] }) => {
        setLeaderboard(payload.entries);
      },
    );

    socket.on("question:result", (payload: { result: QuestionResult }) => {
      setCurrentResult(payload.result);
      setLeaderboard(payload.result.leaderboard);
      setStatus("question_result");
    });

    socket.on(
      "session:final",
      (payload: { leaderboard: LeaderboardEntry[]; status: string }) => {
        setLeaderboard(payload.leaderboard);
        setStatus(payload.status);
      },
    );

    socket.on("session:finished", () => {
      setStatus("finished");
      setCurrentQuestion(null);
    });

    return () => {
      socket.io.off("reconnect_attempt");
      socket.io.off("reconnect_failed");
      socket.io.off("error");
      socket.disconnect();
    };
  }, [pin, realtimeUrl, sessionId]);

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Entrada do participante
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
              QR Code e PIN
            </h2>
          </div>
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
            {status}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-3">
            <Image
              alt="QR Code da sessao live"
              className="h-auto w-full rounded-xl"
              height={160}
              src={qrCodeDataUrl}
              width={160}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                PIN
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-[0.18em] text-[#132238]">
                {pin}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Link publico
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-[#132238]">
                {publicUrl}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Canal do host
              </p>
              <p className="mt-2 text-sm font-semibold text-[#132238]">
                {socketPhase === "connected"
                  ? "Conectado ao realtime"
                  : socketPhase === "reconnecting"
                    ? "Reconectando"
                    : socketPhase === "disconnected"
                      ? "Sem conexao"
                      : "Conectando"}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Presenca do host
              </p>
              <p className="mt-2 text-sm font-semibold text-[#132238]">
                {operationalState.hostPresenceStatus}
              </p>
            </div>
          </div>

          {startState.status !== "idle" ? (
            <p
              className={
                startState.status === "success"
                  ? "rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#0f766e]"
                  : "rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]"
              }
            >
              {startState.message}
            </p>
          ) : null}

          {advanceState.status !== "idle" ? (
            <p
              className={
                advanceState.status === "success"
                  ? "rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#0f766e]"
                  : "rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]"
              }
            >
              {advanceState.message}
            </p>
          ) : null}

          {restartState.status === "error" ? (
            <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
              {restartState.message}
            </p>
          ) : null}

          {reconnectNote ? (
            <p className="rounded-2xl bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]">
              {reconnectNote}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <form action={startFormAction}>
              <input name="sessionId" type="hidden" value={sessionId} />
              <button
                className="rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557] disabled:opacity-60"
                disabled={status !== "waiting"}
                type="submit"
              >
                {status === "waiting"
                  ? "Iniciar contagem regressiva"
                  : "Sessao em andamento"}
              </button>
            </form>

            <form action={advanceFormAction}>
              <input name="sessionId" type="hidden" value={sessionId} />
              <button
                className="rounded-full border border-[#d2d8e5] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-white disabled:opacity-60"
                disabled={!["playing", "question_result"].includes(status)}
                type="submit"
              >
                {nextButtonLabel}
              </button>
            </form>

            {status === "finished" ? (
              <form action={restartFormAction}>
                <input name="sessionId" type="hidden" value={sessionId} />
                <button
                  className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0d6460]"
                  type="submit"
                >
                  Recomeçar
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Operacao da rodada
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
              Controle da sessao
            </h2>
          </div>
          <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
            {connectedCount} conectados
          </span>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Painel operacional
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Sessao
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {status}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Ultimo evento
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {formatEventTime(operationalState.lastEventAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Recuperacao
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {recoverySecondsRemaining !== null
                    ? `${recoverySecondsRemaining}s restantes`
                    : "Sem janela ativa"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Online
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {operationalState.connectedParticipantsCount}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Offline
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {operationalState.offlineParticipantsCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Alertas
            </p>
            <div className="mt-3 space-y-2">
              {operationalWarnings.length === 0 ? (
                <p className="text-sm text-[#61708c]">
                  Nenhum alerta operacional no momento.
                </p>
              ) : (
                operationalWarnings.map((warning) => (
                  <p
                    key={warning}
                    className="rounded-2xl bg-[#fff7ed] px-3 py-2 text-sm font-medium text-[#9a3412]"
                  >
                    {warning}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {recoverySecondsRemaining !== null &&
        operationalState.hostPresenceStatus === "offline" &&
        status !== "interrupted" ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#bfdbfe] bg-[#eff6ff] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
              Janela de reconexao
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#132238]">
              A sala ainda pode ser recuperada sem interromper a rodada
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#1e3a8a]">
              Se o host voltar em ate {recoverySecondsRemaining}s, a sessao
              segue para um estado seguro automaticamente.
            </p>
          </div>
        ) : null}

        {status === "playing" && currentQuestion ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Pergunta {currentQuestion.orderIndex + 1} de{" "}
                  {currentQuestion.totalQuestions}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#132238]">
                  {currentQuestion.prompt}
                </h3>
              </div>
              <span className="rounded-full bg-[#10233f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {currentQuestion.timeLimitSeconds}s
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {currentQuestion.options.map((option, optionIndex) => (
                <div
                  key={`${currentQuestion.id}-${optionIndex}`}
                  className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-medium text-[#22304a]"
                >
                  {option}
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Respostas enviadas
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#132238]">
                  {questionStats.submittedCount}/
                  {questionStats.totalParticipants}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Estado da rodada
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {questionStats.submittedCount ===
                  questionStats.totalParticipants
                    ? "Todos responderam. Pode revelar o resultado."
                    : "Aguardando novas respostas ou fechamento manual."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {status === "question_result" && currentResult ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Resultado da rodada
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[#132238]">
                  {currentResult.prompt}
                </h3>
              </div>
              <span className="rounded-full bg-[#10233f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {currentResult.correctCount}/{currentResult.submittedCount}{" "}
                acertos
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {currentResult.options.map((option, optionIndex) => (
                <div
                  key={`${currentResult.questionId}-${optionIndex}`}
                  className={
                    optionIndex === currentResult.correctOptionIndex
                      ? "rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-semibold text-[#132238]"
                      : "rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm font-medium text-[#22304a]"
                  }
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {status === "interrupted" ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#fed7aa] bg-[#fff7ed] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a3412]">
              Pausa operacional
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#7c2d12]">
              Sessao interrompida
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#9a3412]">
              O realtime marcou a sala como interrompida por ausencia do host.
              Assim que a conexao for retomada, a sessao volta para um estado
              seguro.
            </p>
          </div>
        ) : null}

        {status === "finished" ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Resultado final
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[#132238]">
              Sessao concluida
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#61708c]">
              O ranking final ja esta congelado e pronto para consulta.
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Ranking
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#132238]">
                Lideranca da sala
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-sm leading-7 text-[#61708c]">
                O ranking aparece assim que as primeiras respostas forem
                registradas.
              </p>
            ) : (
              leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] px-4 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10233f] text-sm font-semibold text-white">
                    {entry.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#132238]">
                      {entry.nickname}
                    </p>
                    <p className="text-xs text-[#61708c]">
                      {entry.score} pontos em{" "}
                      {formatDuration(entry.totalTimeMs)}
                    </p>
                  </div>
                  {status === "question_result" ? (
                    <p className="text-xs font-semibold text-[#61708c]">
                      {entry.answeredCurrentQuestion
                        ? entry.lastIsCorrect
                          ? `+${entry.lastPointsEarned}`
                          : "0"
                        : "-"}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Presenca
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#132238]">
              Online e offline
            </h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10233f] text-sm font-semibold text-white">
                  {participant.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#132238]">
                    {participant.nickname}
                  </p>
                  <p className="text-xs text-[#61708c]">
                    {participant.score} pontos
                  </p>
                </div>
                <span
                  className={
                    participant.presenceStatus === "online"
                      ? "rounded-full bg-[#ecfdf3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f766e]"
                      : "rounded-full bg-[#f4f4f5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#52525b]"
                  }
                >
                  {participant.presenceStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
