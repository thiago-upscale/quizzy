"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { StartLiveSessionState } from "../../actions";

type Participant = {
  avatar: string;
  id: string;
  nickname: string;
  score: number;
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

const initialActionState: StartLiveSessionState = {
  status: "idle",
};

export function HostSessionPanel({
  advanceAction,
  initialParticipants,
  pin,
  publicUrl,
  qrCodeDataUrl,
  realtimeUrl,
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
  sessionId: string;
  sessionStatus: string;
  startAction: (
    state: StartLiveSessionState,
    formData: FormData,
  ) => Promise<StartLiveSessionState>;
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [status, setStatus] = useState(sessionStatus);
  const [currentQuestion, setCurrentQuestion] = useState<ActiveQuestion | null>(
    null,
  );
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

  const nextButtonLabel = useMemo(() => {
    if (!currentQuestion) {
      return "Abrir primeira pergunta";
    }

    return currentQuestion.orderIndex + 1 >= currentQuestion.totalQuestions
      ? "Encerrar sessao"
      : "Abrir proxima pergunta";
  }, [currentQuestion]);

  useEffect(() => {
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("host:watch", { pin, sessionId });
    });

    socket.on(
      "participant:list",
      (payload: { participants: Participant[] }) => {
        setParticipants(payload.participants);
        setQuestionStats((currentStats) => ({
          ...currentStats,
          totalParticipants: payload.participants.length,
        }));
      },
    );

    socket.on(
      "session:state",
      (payload: { countdownSeconds?: number; status: string }) => {
        setStatus(payload.status);
      },
    );

    socket.on("session:question", (payload: { question: ActiveQuestion }) => {
      setCurrentQuestion(payload.question);
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

    socket.on("session:finished", () => {
      setStatus("finished");
      setCurrentQuestion(null);
    });

    return () => {
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
                disabled={status !== "playing"}
                type="submit"
              >
                {nextButtonLabel}
              </button>
            </form>
          </div>
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Presenca em tempo real
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
              Participantes na sala
            </h2>
          </div>
          <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
            {participants.length} conectados
          </span>
        </div>

        {currentQuestion ? (
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
                  Estado
                </p>
                <p className="mt-2 text-sm font-semibold text-[#132238]">
                  {questionStats.submittedCount ===
                  questionStats.totalParticipants
                    ? "Todos responderam"
                    : "Aguardando novas respostas"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {participants.length === 0 ? (
            <p className="text-sm leading-7 text-[#61708c]">
              Assim que os participantes escanearem o QR Code ou entrarem pelo
              PIN, a lista aparece aqui.
            </p>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10233f] text-sm font-semibold text-white">
                  {participant.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#132238]">
                    {participant.nickname}
                  </p>
                  <p className="text-xs text-[#61708c]">
                    {participant.score} pontos
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
