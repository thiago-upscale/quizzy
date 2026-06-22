"use client";

import Image from "next/image";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { io, type Socket } from "socket.io-client";
import { formatTime } from "@/lib/datetime";
import type { StartLiveSessionState } from "../../actions";
import { getStatusLabel } from "../../dashboard-helpers";
import type {
  ActiveQuestion,
  LeaderboardEntry,
  QuestionResult,
  SessionStatePayload,
  SessionStatus,
} from "@/lib/socket-types";

type Participant = {
  avatar: string;
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
  score: number;
  totalTimeMs: number;
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
  return value ? formatTime(value) : "Sem eventos recentes";
}

function formatRemainingSeconds(remainingMs: number) {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function SubmitButton({
  className,
  disabled,
  label,
  loadingLabel,
}: {
  className: string;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} type="submit">
      {pending ? loadingLabel : label}
    </button>
  );
}

export function HostSessionPanel({
  advanceAction,
  hostToken,
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
  hostToken: string;
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
      status: sessionStatus as SessionStatus,
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
  const [startSuccessVisible, setStartSuccessVisible] = useState(false);
  const [advanceSuccessVisible, setAdvanceSuccessVisible] = useState(false);

  const nextButtonLabel = useMemo(() => {
    if (status === "playing") {
      return "Encerrar rodada";
    }

    if (status === "question_result") {
      if (
        currentResult &&
        currentResult.questionOrderIndex + 1 >= currentResult.totalQuestions
      ) {
        return "Encerrar sessão";
      }

      return "Abrir próxima pergunta";
    }

    if (status === "finished") {
      return "Sessão encerrada";
    }

    return "Abrir primeira pergunta";
  }, [currentResult, status]);

  const operationalWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (!socketConnected) {
      warnings.push("Painel do host sem conexão ativa com o realtime");
    }

    if (operationalState.hostPresenceStatus === "offline") {
      warnings.push("Host offline no canal realtime");
    }

    if (status === "interrupted") {
      warnings.push("Sessão pausada por ausência do host");
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
    if (startState.status !== "success") return;
    startTransition(() => setStartSuccessVisible(true));
    const timer = setTimeout(() => setStartSuccessVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [startState]);

  useEffect(() => {
    if (advanceState.status !== "success") return;
    startTransition(() => setAdvanceSuccessVisible(true));
    const timer = setTimeout(() => setAdvanceSuccessVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [advanceState]);

  useEffect(() => {
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      setSocketPhase("connected");
      setReconnectNote(null);
      socket.emit("host:watch", { hostToken, pin, sessionId });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setSocketPhase("reconnecting");
      setReconnectNote("Tentando retomar o canal do host...");
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      setSocketPhase("reconnecting");
      setReconnectNote(`Nova tentativa de conexão (${attempt})`);
    });

    socket.io.on("reconnect_failed", () => {
      setSocketPhase("disconnected");
      setReconnectNote("Não foi possível retomar o realtime automaticamente.");
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
  }, [hostToken, pin, realtimeUrl, sessionId]);

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-[1.75rem] border border-[var(--quizzy-border)] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
              Entrada do participante
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--quizzy-text)]">
              QR Code e PIN
            </h2>
          </div>
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
            {getStatusLabel(status)}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-3">
            <Image
              alt="QR Code da sessão live"
              className="h-auto w-full rounded-xl"
              height={160}
              src={qrCodeDataUrl}
              width={160}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                PIN
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-[0.18em] text-[var(--quizzy-text)]">
                {pin}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                Link público
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-[var(--quizzy-text)]">
                {publicUrl}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-sm text-[var(--quizzy-muted)]">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${
                socketPhase === "connected"
                  ? "bg-[var(--quizzy-success)]"
                  : socketPhase === "connecting"
                    ? "bg-[var(--quizzy-muted)]"
                    : "bg-[var(--quizzy-warning)]"
              }`}
            />
            {socketPhase === "connected"
              ? "Conectado ao tempo real"
              : socketPhase === "reconnecting"
                ? "Reconectando…"
                : socketPhase === "disconnected"
                  ? "Sem conexão com o tempo real"
                  : "Conectando…"}
          </p>

          <div aria-live="polite" aria-atomic="true" role="status">
            {startState.status === "error" ? (
              <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
                {startState.message}
              </p>
            ) : startSuccessVisible ? (
              <p className="rounded-2xl bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] px-4 py-3 text-sm font-medium text-[var(--quizzy-success)]">
                {startState.message}
              </p>
            ) : null}
          </div>

          <div aria-live="polite" aria-atomic="true" role="status">
            {advanceState.status === "error" ? (
              <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
                {advanceState.message}
              </p>
            ) : advanceSuccessVisible ? (
              <p className="rounded-2xl bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] px-4 py-3 text-sm font-medium text-[var(--quizzy-success)]">
                {advanceState.message}
              </p>
            ) : null}
          </div>

          <div aria-live="assertive" role="alert">
            {restartState.status === "error" ? (
              <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
                {restartState.message}
              </p>
            ) : null}
          </div>

          <div aria-live="polite" role="status">
            {reconnectNote ? (
              <p className="rounded-2xl bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]">
                {reconnectNote}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={startFormAction}>
              <input name="sessionId" type="hidden" value={sessionId} />
              <SubmitButton
                className="cursor-pointer rounded-full bg-[var(--quizzy-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quizzy-teal)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status !== "waiting"}
                label={
                  status === "waiting"
                    ? "Iniciar contagem regressiva"
                    : "Sessão em andamento"
                }
                loadingLabel="Iniciando…"
              />
            </form>

            <form action={advanceFormAction}>
              <input name="sessionId" type="hidden" value={sessionId} />
              <SubmitButton
                className="cursor-pointer rounded-full border border-[var(--quizzy-border)] px-5 py-3 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quizzy-teal)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!["playing", "question_result"].includes(status)}
                label={nextButtonLabel}
                loadingLabel="Aguarde…"
              />
            </form>

            {status === "finished" ? (
              <form action={restartFormAction}>
                <input name="sessionId" type="hidden" value={sessionId} />
                <SubmitButton
                  className="cursor-pointer rounded-full bg-[var(--quizzy-teal)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quizzy-teal)] focus-visible:ring-offset-2"
                  label="Recomeçar"
                  loadingLabel="Reiniciando…"
                />
              </form>
            ) : null}
          </div>
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-[var(--quizzy-border)] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
              Operação da rodada
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--quizzy-text)]">
              Controle da sessão
            </h2>
          </div>
          <span className="rounded-full bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-success)]">
            {connectedCount} conectados
          </span>
        </div>

        <p className="mt-6 text-sm text-[var(--quizzy-muted)]">
          Último evento: {formatEventTime(operationalState.lastEventAt)}
          {recoverySecondsRemaining !== null
            ? ` • Janela de recuperação: ${recoverySecondsRemaining}s`
            : ""}
        </p>

        {operationalWarnings.length > 0 ? (
          <div className="mt-4 space-y-2">
            {operationalWarnings.map((warning) => (
              <p
                key={warning}
                className="rounded-2xl bg-[color:color-mix(in_srgb,var(--quizzy-warning)_8%,white)] px-4 py-3 text-sm font-medium text-[var(--quizzy-warning)]"
              >
                {warning}
              </p>
            ))}
          </div>
        ) : null}

        {recoverySecondsRemaining !== null &&
        operationalState.hostPresenceStatus === "offline" &&
        status !== "interrupted" ? (
          <div className="mt-6 rounded-[1.5rem] border border-[#bfdbfe] bg-[#eff6ff] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
              Janela de reconexão
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--quizzy-text)]">
              A sala ainda pode ser recuperada sem interromper a rodada
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#1e3a8a]">
              Se o host voltar em até {recoverySecondsRemaining}s, a sessão
              segue para um estado seguro automaticamente.
            </p>
          </div>
        ) : null}

        {status === "playing" && currentQuestion ? (
          <div className="mt-6 rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                  Pergunta {currentQuestion.orderIndex + 1} de{" "}
                  {currentQuestion.totalQuestions}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--quizzy-text)]">
                  {currentQuestion.prompt}
                </h3>
              </div>
              <span className="rounded-full bg-[var(--quizzy-navy)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {currentQuestion.timeLimitSeconds}s
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {currentQuestion.options.map((option, optionIndex) => (
                <div
                  key={`${currentQuestion.id}-${optionIndex}`}
                  className="rounded-2xl border border-[var(--quizzy-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--quizzy-text)]"
                >
                  {option}
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                  Respostas enviadas
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--quizzy-text)]">
                  {questionStats.submittedCount}/
                  {questionStats.totalParticipants}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                  Estado da rodada
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--quizzy-text)]">
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
          <div className="mt-6 rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                  Resultado da rodada
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--quizzy-text)]">
                  {currentResult.prompt}
                </h3>
              </div>
              <span className="rounded-full bg-[var(--quizzy-navy)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
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
                      ? "rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-semibold text-[var(--quizzy-text)]"
                      : "rounded-2xl border border-[var(--quizzy-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--quizzy-text)]"
                  }
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {status === "interrupted" ? (
          <div className="mt-6 rounded-[1.5rem] border border-[color:color-mix(in_srgb,var(--quizzy-warning)_25%,white)] bg-[color:color-mix(in_srgb,var(--quizzy-warning)_8%,white)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-warning)]">
              Pausa operacional
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--quizzy-warning)]">
              Sessão interrompida
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--quizzy-warning)]">
              O realtime marcou a sala como interrompida por ausência do host.
              Assim que a conexão for retomada, a sessão volta para um estado
              seguro.
            </p>
          </div>
        ) : null}

        {status === "finished" ? (
          <div className="mt-6 rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
              Resultado final
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--quizzy-text)]">
              Sessão concluída
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
              O ranking final já está congelado e pronto para consulta.
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                Ranking
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--quizzy-text)]">
                Liderança da sala
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-sm leading-7 text-[var(--quizzy-muted)]">
                O ranking aparece assim que as primeiras respostas forem
                registradas.
              </p>
            ) : (
              leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] px-4 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--quizzy-navy)] text-sm font-semibold text-white">
                    {entry.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--quizzy-text)]">
                      {entry.nickname}
                    </p>
                    <p className="text-xs text-[var(--quizzy-muted)]">
                      {entry.score} pontos em{" "}
                      {formatDuration(entry.totalTimeMs)}
                    </p>
                  </div>
                  {status === "question_result" ? (
                    <p className="text-xs font-semibold text-[var(--quizzy-muted)]">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
              Presença
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--quizzy-text)]">
              Participantes
            </h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--quizzy-navy)] text-sm font-semibold text-white">
                  {participant.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--quizzy-text)]">
                    {participant.nickname}
                  </p>
                  <p className="text-xs text-[var(--quizzy-muted)]">
                    {participant.score} pontos
                  </p>
                </div>
                <span
                  className={
                    participant.presenceStatus === "online"
                      ? "rounded-full bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--quizzy-success)]"
                      : "rounded-full bg-[var(--quizzy-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--quizzy-muted)]"
                  }
                >
                  {participant.presenceStatus === "online"
                    ? "Online"
                    : "Offline"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
