"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { startLiveSession } from "@/app/dashboard/actions";
import type { LiveBranding } from "@/lib/live";
import { io } from "socket.io-client";

type Participant = {
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
};

type LeaderboardEntry = {
  id: string;
  nickname: string;
  rank: number;
  score: number;
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

type QuestionStat = {
  correctCount: number;
  submittedCount: number;
};

const OPTION_STYLES = [
  { bg: "#e21b3c", icon: "▲" },
  { bg: "#1368ce", icon: "◆" },
  { bg: "#d89e00", icon: "●" },
  { bg: "#26890c", icon: "■" },
];

const PODIUM_CONFIG = [
  { rank: 2, height: "h-40", color: "#94a3b8", badge: "bg-[#94a3b8]", label: "2º" },
  { rank: 1, height: "h-56", color: "#f59e0b", badge: "bg-[#f59e0b]", label: "1º" },
  { rank: 3, height: "h-28", color: "#f97316", badge: "bg-[#f97316]", label: "3º" },
];

// Deterministic confetti generator based on index
function generateConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: ((i * 37 + 11) % 100),
    delay: (i * 0.13) % 3,
    duration: 2.5 + (i % 5) * 0.4,
    color: ["#f59e0b", "#e21b3c", "#1368ce", "#26890c", "#a855f7", "#ec4899"][i % 6],
    size: 6 + (i % 4) * 3,
    shape: i % 2 === 0 ? "rounded-sm" : "rounded-full",
  }));
}

const CONFETTI = generateConfetti(60);

export function DisplayClient({
  initialParticipants,
  pin,
  quizTitle,
  qrCodeDataUrl,
  pinFormatted,
  baseUrl,
  realtimeUrl,
  sessionId,
  branding,
}: {
  initialParticipants: Participant[];
  pin: string;
  quizTitle: string;
  qrCodeDataUrl: string;
  pinFormatted: string;
  baseUrl: string;
  realtimeUrl: string;
  sessionId: string;
  branding: LiveBranding;
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
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, startFormAction] = useActionState(startLiveSession, { message: "", status: "idle" });

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

    socket.on("question:stats", (payload: { submittedCount: number }) => {
      setSubmittedCount(payload.submittedCount);
    });

    socket.on("question:result", (payload: { result: QuestionResult }) => {
      setCurrentResult(payload.result);
      setRemainingSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      setQuestionStats((prev) => [
        ...prev,
        {
          correctCount: payload.result.correctCount,
          submittedCount: payload.result.submittedCount,
        },
      ]);
    });

    socket.on(
      "leaderboard:update",
      (payload: { entries: LeaderboardEntry[] }) => {
        setLeaderboard(payload.entries);
      },
    );

    socket.on(
      "session:final",
      (payload: { leaderboard: LeaderboardEntry[]; status: string }) => {
        setLeaderboard(payload.leaderboard);
        setSessionState((s) => ({ ...s, status: payload.status }));
      },
    );

    socket.on("session:finished", () => {
      setSessionState((s) => ({ ...s, status: "finished" }));
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, realtimeUrl]);

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
      if (remaining === 0 && timerRef.current) clearInterval(timerRef.current);
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestion, sessionState.status]);

  // ── FINISHED — podium + summary ─────────────────────────────────────────────
  if (sessionState.status === "finished") {
    const top3 = leaderboard.slice(0, 3);

    // Session summary calculations
    const totalAnswered = questionStats.reduce((s, q) => s + q.submittedCount, 0);
    const totalCorrect = questionStats.reduce((s, q) => s + q.correctCount, 0);
    const pctCorrect = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const hardQuestions = questionStats.filter(
      (q) => q.submittedCount > 0 && q.correctCount / q.submittedCount < 0.5,
    ).length;
    const insight =
      pctCorrect >= 80
        ? "A maioria dos participantes respondeu corretamente. Excelente desempenho!"
        : pctCorrect >= 50
          ? "A turma foi bem! Algumas perguntas geraram mais dúvidas."
          : "As perguntas foram desafiadoras. Vale revisar o conteúdo.";

    if (showSummary) {
      return (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-10 px-12 py-10"
          style={{
            background: `linear-gradient(160deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
            fontFamily: branding.fontFamily,
          }}
        >
          <div className="w-full max-w-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Resumo da sessão</h2>
              <button
                className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                onClick={() => setShowSummary(false)}
                type="button"
              >
                ← Pódio
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl font-black text-white ring-4 ring-white/20">
                  {pctCorrect}%
                </div>
                <p className="mt-3 text-sm font-semibold text-white/70">
                  Respostas corretas
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {pctCorrect >= 80 ? "Grande desempenho!" : pctCorrect >= 50 ? "Bom esforço!" : "Pode melhorar!"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-6 text-center">
                <div
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white ring-4 ring-white/20"
                  style={{ backgroundColor: hardQuestions > 0 ? "#e21b3c" : "#26890c" }}
                >
                  {hardQuestions}
                </div>
                <p className="mt-3 text-sm font-semibold text-white/70">
                  Perguntas difíceis
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {hardQuestions === 0 ? "A prática leva à perfeição!" : `${hardQuestions} pergunta${hardQuestions > 1 ? "s" : ""} com menos de 50% de acertos`}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-6 text-center">
              <p className="text-xl font-semibold text-[#0d1b2a]">{insight}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="relative flex flex-1 flex-col items-center justify-end overflow-hidden pb-0"
        style={{
          background: `linear-gradient(160deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
          fontFamily: branding.fontFamily,
        }}
      >
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI.map((c) => (
            <div
              key={c.id}
              className={`absolute top-0 ${c.shape}`}
              style={{
                animation: `fall ${c.duration}s linear ${c.delay}s infinite`,
                backgroundColor: c.color,
                height: c.size,
                left: `${c.left}%`,
                width: c.size,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div className="relative z-10 mb-8 text-center">
          <span className="text-3xl font-black text-white">
            Quizzy<span className="text-[#f59e0b]">!</span>
          </span>
          <div className="mt-3 rounded-xl bg-white px-8 py-3 shadow-lg">
            <p className="text-xl font-black text-[#0d1b2a]">{quizTitle}</p>
          </div>
          {questionStats.length > 0 && (
            <button
              className="mt-4 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={() => setShowSummary(true)}
              type="button"
            >
              Resumo da sessão →
            </button>
          )}
        </div>

        {/* Podium */}
        <div className="relative z-10 flex w-full max-w-2xl items-end justify-center gap-2 px-8">
          {PODIUM_CONFIG.map(({ rank, height, badge, label }) => {
            const entry = top3.find((e) => e.rank === rank);
            return (
              <div key={rank} className="flex flex-1 flex-col items-center">
                {/* Player name */}
                {entry ? (
                  <div
                    className="mb-3 rounded-xl bg-white px-4 py-2 text-center shadow-lg"
                    style={{
                      animation: `rise 0.6s ease ${rank === 1 ? "0.1s" : rank === 2 ? "0.3s" : "0.5s"} both`,
                    }}
                  >
                    <p className="text-sm font-bold text-[#0d1b2a]">
                      {entry.nickname}
                    </p>
                  </div>
                ) : (
                  <div className="mb-3 h-10" />
                )}

                {/* Badge */}
                <div
                  className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${badge} text-lg font-black text-white shadow-lg`}
                >
                  {label}
                </div>

                {/* Column */}
                <div
                  className={`w-full ${height} rounded-t-2xl bg-white/10 backdrop-blur`}
                  style={{
                    animation: `grow 0.8s ease ${rank === 1 ? "0.2s" : rank === 2 ? "0.4s" : "0.6s"} both`,
                  }}
                >
                  {entry && (
                    <p className="pt-4 text-center text-sm font-semibold text-white/60">
                      {entry.score} pts
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes fall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0.3; }
          }
          @keyframes rise {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes grow {
            from { transform: scaleY(0); transform-origin: bottom; }
            to { transform: scaleY(1); transform-origin: bottom; }
          }
        `}</style>
      </div>
    );
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────────
  if (sessionState.status === "waiting" || sessionState.status === "countdown") {
    return (
      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundImage: branding.backgroundImageUrl
            ? `linear-gradient(180deg, rgba(16,35,63,0.82) 0%, rgba(0,0,0,0.65) 100%), url(${branding.backgroundImageUrl})`
            : `linear-gradient(160deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          fontFamily: branding.fontFamily,
        }}
      >
        {/* Geometric overlay shapes (subtle when using branding gradient) */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1920 1080"
        >
          <polygon fill="#ffffff" points="0,1080 420,340 840,1080" opacity="0.05" />
          <polygon fill="#ffffff" points="380,1080 820,220 1260,1080" opacity="0.04" />
          <polygon fill="#ffffff" points="820,1080 1320,150 1800,1080" opacity="0.03" />
        </svg>

        {/* Iniciar — top right */}
        <div className="relative z-20 flex justify-end px-6 pt-5">
          <form action={startFormAction}>
            <input name="sessionId" type="hidden" value={sessionId} />
            <button
              className="rounded-lg bg-white px-7 py-2.5 text-sm font-black text-[#1a1f3c] shadow-lg transition hover:bg-gray-100 active:scale-95"
              type="submit"
            >
              Iniciar
            </button>
          </form>
        </div>

        {/* 3-column row */}
        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Left: QR + PIN */}
          <aside className="flex w-72 flex-shrink-0 flex-col justify-center gap-8 bg-black/40 px-8 py-10 backdrop-blur-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/40">
                Entrar
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="mt-3 overflow-hidden rounded-2xl bg-white p-3">
                <img alt="QR code da sessão" className="h-auto w-full" src={qrCodeDataUrl} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/40">
                PIN do jogo
              </p>
              <p className="mt-2 text-5xl font-black tracking-[0.16em] text-white">
                {pinFormatted}
              </p>
              <p className="mt-3 text-xs leading-6 text-white/35">
                Participe em{" "}
                <span className="font-semibold text-white/55">
                  {baseUrl.replace(/^https?:\/\//, "")}
                </span>
              </p>
            </div>
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Logo do quiz"
                className="mt-2 h-14 w-auto self-start rounded-xl bg-white/10 p-2"
                src={branding.logoUrl}
              />
            ) : null}
          </aside>

          {/* Center */}
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-12 text-center">
            {sessionState.status === "countdown" ? (
              <>
                <div className="rounded-full bg-black/40 px-7 py-2.5">
                  <p className="text-sm font-bold text-white/70">Começando em</p>
                </div>
                <p className="text-[12rem] font-black leading-none text-white drop-shadow-2xl">
                  {sessionState.countdownSeconds ?? 3}
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-black/35 px-7 py-2.5">
                  <p className="text-sm font-bold text-white/70">
                    Tudo pronto para começar?
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-10 py-5 shadow-2xl">
                  <h1 className="text-4xl font-black" style={{ color: branding.secondaryColor }}>{quizTitle}</h1>
                </div>
              </>
            )}
          </div>

          {/* Right: participants */}
          <aside className="w-72 flex-shrink-0 overflow-y-auto bg-black/40 px-8 py-10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-white">Participantes:</p>
              <span
                className="rounded-full px-2.5 py-0.5 text-sm font-black"
                style={{ backgroundColor: branding.accentColor, color: branding.secondaryColor }}
              >
                {connectedCount}
              </span>
            </div>
            <div className="mt-5 space-y-1">
              {participants.length === 0 ? (
                <p className="text-sm text-white/30">Aguardando...</p>
              ) : (
                participants.map((p) => (
                  <p key={p.id} className="py-1.5 text-sm font-semibold text-white/80">
                    {p.nickname}
                  </p>
                ))
              )}
            </div>
          </aside>
        </div>

        {/* Bottom bar */}
        <div className="relative z-20 flex items-center justify-between bg-[#0d1220] px-7 py-3">
          <div className="flex items-center gap-4">
            <a
              className="rounded-lg bg-[#26890c] px-5 py-2 text-sm font-black text-white transition hover:bg-[#22780a]"
              href={`/live/${pin}`}
            >
              Entrar
            </a>
            <span className="text-xs text-white/50">
              🔒 {baseUrl.replace(/^https?:\/\//, "")} PIN:{" "}
              <strong className="font-bold text-white/75">{pin}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white/60">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z" />
            </svg>
            {connectedCount}
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING / QUESTION RESULT ────────────────────────────────────────────────
  if (
    (sessionState.status === "playing" || sessionState.status === "question_result") &&
    (currentQuestion || currentResult)
  ) {
    const question = currentResult
      ? { prompt: currentResult.prompt, options: currentResult.options }
      : currentQuestion!;

    return (
      <div className="flex flex-1 flex-col" style={{ fontFamily: branding.fontFamily }}>
        <div className="flex items-center justify-center bg-white px-6 py-5 shadow-lg">
          <h1 className="max-w-4xl text-center text-2xl font-bold" style={{ color: branding.secondaryColor }}>
            {question.prompt}
          </h1>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center px-20 py-8"
          style={{
            background: `linear-gradient(160deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
          }}
        >
          <div
            className="absolute left-8 top-1/2 -translate-y-1/2 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg"
            style={{ backgroundColor: branding.secondaryColor }}
          >
            {remainingSeconds ?? currentQuestion?.timeLimitSeconds ?? "—"}
          </div>

          <div className="text-center">
            {currentQuestion && (
              <span
                className="rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.22em]"
                style={{ backgroundColor: branding.accentColor, color: branding.secondaryColor }}
              >
                Pergunta {currentQuestion.orderIndex + 1} de{" "}
                {currentQuestion.totalQuestions}
              </span>
            )}
          </div>

          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg"
              style={{ backgroundColor: branding.secondaryColor }}
            >
              {submittedCount}
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
              respostas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0">
          {question.options.map((option, i) => {
            const style = OPTION_STYLES[i % OPTION_STYLES.length];
            const isCorrect = currentResult && i === currentResult.correctOptionIndex;

            return (
              <div
                key={i}
                className="relative flex items-center gap-4 px-8 py-6 text-xl font-bold text-white"
                style={{
                  backgroundColor: currentResult && !isCorrect ? "#555" : (style?.bg ?? "#333"),
                  opacity: currentResult && !isCorrect ? 0.5 : 1,
                }}
              >
                <span className="text-2xl">{style?.icon}</span>
                <span>{option}</span>
                {isCorrect ? <span className="ml-auto text-2xl">✓</span> : null}
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between px-8 py-3"
          style={{ backgroundColor: branding.secondaryColor }}
        >
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
      <h1 className="text-5xl font-black text-white">Quiz encerrado!</h1>
      <p className="mt-4 text-lg text-white/50">{quizTitle}</p>
    </div>
  );
}
