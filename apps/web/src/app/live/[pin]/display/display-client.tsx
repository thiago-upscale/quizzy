"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

type Participant = {
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
};

type ActiveQuestion = {
  id: string;
  options: string[];
  orderIndex: number;
  prompt: string;
  startedAt: number;
  timeLimitSeconds: number;
  totalQuestions: number;
  type: "multiple_choice" | "true_false";
};

type QuestionResult = {
  correctCount: number;
  correctOptionIndex: number;
  options: string[];
  prompt: string;
  questionId: string;
  submittedCount: number;
};

type SessionState = {
  status: string;
  countdownSeconds: number | null;
};

// Kahoot-style option colors and icons
const OPTION_STYLES = [
  { bg: "#e21b3c", icon: "▲" },
  { bg: "#1368ce", icon: "◆" },
  { bg: "#d89e00", icon: "●" },
  { bg: "#26890c", icon: "■" },
];

export function DisplayClient({
  initialParticipants,
  pin,
  quizTitle,
  qrCodeDataUrl,
  pinFormatted,
  baseUrl,
  realtimeUrl,
}: {
  initialParticipants: Participant[];
  pin: string;
  quizTitle: string;
  qrCodeDataUrl: string;
  pinFormatted: string;
  baseUrl: string;
  realtimeUrl: string;
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [connectedCount, setConnectedCount] = useState(
    initialParticipants.filter((p) => p.presenceStatus === "online").length,
  );
  const [sessionState, setSessionState] = useState<SessionState>({
    status: "waiting",
    countdownSeconds: null,
  });
  const [currentQuestion, setCurrentQuestion] =
    useState<ActiveQuestion | null>(null);
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(
    null,
  );
  const [submittedCount, setSubmittedCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = io(realtimeUrl, { transports: ["websocket"] });

    socket.on("connect", () => {
      socket.emit("display:watch", { pin });
    });

    socket.on(
      "participant:list",
      (payload: { connectedCount: number; participants: Participant[] }) => {
        setParticipants(payload.participants);
        setConnectedCount(payload.connectedCount);
      },
    );

    socket.on("session:state", (payload: SessionState) => {
      setSessionState(payload);
    });

    socket.on("session:question", (payload: { question: ActiveQuestion }) => {
      setCurrentQuestion(payload.question);
      setCurrentResult(null);
      setSubmittedCount(0);
      setRemainingSeconds(payload.question.timeLimitSeconds);
    });

    socket.on(
      "question:stats",
      (payload: { submittedCount: number }) => {
        setSubmittedCount(payload.submittedCount);
      },
    );

    socket.on("question:result", (payload: { result: QuestionResult }) => {
      setCurrentResult(payload.result);
      setRemainingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("session:final", () => {
      setSessionState((s) => ({ ...s, status: "finished" }));
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, realtimeUrl]);

  // Client-side countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!currentQuestion || sessionState.status !== "playing") return;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - currentQuestion.startedAt) / 1000;
      const remaining = Math.max(
        0,
        Math.ceil(currentQuestion.timeLimitSeconds - elapsed),
      );
      setRemainingSeconds(remaining);
      if (remaining === 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion, sessionState.status]);

  // ── LOBBY (waiting / countdown) ─────────────────────────────────────────────
  if (sessionState.status === "waiting" || sessionState.status === "countdown") {
    return (
      <div className="flex flex-1 gap-0">
        {/* Left — QR + PIN */}
        <aside className="flex w-72 flex-col items-center justify-center gap-8 bg-[#0a1520] px-8 py-10">
          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              Entrar
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <img
                alt="QR code da sessão"
                className="h-auto w-full"
                src={qrCodeDataUrl}
              />
            </div>
          </div>
          <div className="w-full text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
              PIN do jogo
            </p>
            <p className="mt-3 text-5xl font-black tracking-[0.14em] text-white">
              {pinFormatted}
            </p>
            <p className="mt-3 text-xs leading-5 text-white/30">
              Acesse{" "}
              <span className="text-white/50">
                {baseUrl.replace(/^https?:\/\//, "")}
              </span>
            </p>
          </div>
        </aside>

        {/* Center */}
        <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
          {sessionState.status === "countdown" ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/35">
                Começando em
              </p>
              <p className="mt-6 text-[10rem] font-black leading-none text-white">
                {sessionState.countdownSeconds ?? 3}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/35">
                Tudo pronto para começar?
              </p>
              <h1 className="mt-6 text-6xl font-black leading-tight text-white">
                {quizTitle}
              </h1>
              <p className="mt-6 text-base text-white/40">
                Escaneie o QR code ou use o PIN para entrar na sala.
              </p>
            </>
          )}
        </div>

        {/* Right — participants */}
        <aside className="w-72 overflow-y-auto bg-[#0a1520] px-8 py-10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Participantes
            </p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
              {connectedCount}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {participants.length === 0 ? (
              <p className="text-sm text-white/30">Aguardando participantes...</p>
            ) : (
              participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2"
                >
                  <span
                    className={
                      p.presenceStatus === "online"
                        ? "h-2 w-2 rounded-full bg-[#4ade80]"
                        : "h-2 w-2 rounded-full bg-white/20"
                    }
                  />
                  <span className="text-sm font-medium text-white">
                    {p.nickname}
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────────────────────
  if (
    (sessionState.status === "playing" || sessionState.status === "question_result") &&
    (currentQuestion || currentResult)
  ) {
    const question = currentResult
      ? { prompt: currentResult.prompt, options: currentResult.options }
      : currentQuestion!;

    return (
      <div className="flex flex-1 flex-col">
        {/* Question bar */}
        <div className="flex items-center justify-center bg-white px-6 py-5 shadow-lg">
          <h1 className="max-w-4xl text-center text-2xl font-bold text-[#1a1a2e]">
            {question.prompt}
          </h1>
        </div>

        {/* Timer + response count */}
        <div className="flex flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center px-20 py-8">
            {/* Timer bubble — left */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex h-20 w-20 items-center justify-center rounded-full bg-[#333] text-3xl font-black text-white shadow-lg">
              {remainingSeconds ?? currentQuestion?.timeLimitSeconds ?? "—"}
            </div>

            {/* Question number */}
            <div className="text-center">
              {currentQuestion && (
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/50">
                  Pergunta {currentQuestion.orderIndex + 1} de{" "}
                  {currentQuestion.totalQuestions}
                </p>
              )}
            </div>

            {/* Response count bubble — right */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#333] text-3xl font-black text-white shadow-lg">
                {submittedCount}
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                respostas
              </p>
            </div>
          </div>

          {/* Answer options */}
          <div className="grid grid-cols-2 gap-0">
            {question.options.map((option, i) => {
              const style = OPTION_STYLES[i % OPTION_STYLES.length];
              const isCorrect =
                currentResult && i === currentResult.correctOptionIndex;

              return (
                <div
                  key={i}
                  className="relative flex items-center gap-4 px-8 py-6 text-xl font-bold text-white transition"
                  style={{
                    backgroundColor:
                      currentResult && !isCorrect
                        ? "#555"
                        : (style?.bg ?? "#333"),
                    opacity: currentResult && !isCorrect ? 0.5 : 1,
                  }}
                >
                  <span className="text-2xl">{style?.icon}</span>
                  <span>{option}</span>
                  {isCorrect ? (
                    <span className="ml-auto text-2xl">✓</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between bg-[#0a1520] px-8 py-3">
          <span className="text-xs font-semibold text-white/40">
            PIN: <span className="text-white/70">{pinFormatted}</span>
          </span>
          <span className="text-xs font-semibold text-white/40">
            {connectedCount} participante{connectedCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    );
  }

  // ── FINISHED ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
      <h1 className="text-5xl font-black text-white">Quiz encerrado!</h1>
      <p className="mt-4 text-lg text-white/50">{quizTitle}</p>
    </div>
  );
}
