"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  advanceLiveSession,
  skipLiveQuestion,
  startLiveSession,
} from "@/app/dashboard/actions";
import type { LiveBranding } from "@/lib/live";
import { useDisplaySocket } from "@/hooks/useDisplaySocket";

const OPTION_STYLES = [
  { bg: "#e21b3c", icon: "▲" },
  { bg: "#1368ce", icon: "◆" },
  { bg: "#d89e00", icon: "●" },
  { bg: "#26890c", icon: "■" },
];

const PODIUM_CONFIG = [
  {
    rank: 2,
    height: "h-40",
    color: "#94a3b8",
    badge: "bg-[#94a3b8]",
    label: "2º",
  },
  {
    rank: 1,
    height: "h-56",
    color: "#f59e0b",
    badge: "bg-[#f59e0b]",
    label: "1º",
  },
  {
    rank: 3,
    height: "h-28",
    color: "#f97316",
    badge: "bg-[#f97316]",
    label: "3º",
  },
];

// Deterministic confetti generator based on index
function generateConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: (i * 37 + 11) % 100,
    delay: (i * 0.13) % 3,
    duration: 2.5 + (i % 5) * 0.4,
    color: ["#f59e0b", "#e21b3c", "#1368ce", "#26890c", "#a855f7", "#ec4899"][
      i % 6
    ],
    size: 6 + (i % 4) * 3,
    shape: i % 2 === 0 ? "rounded-sm" : "rounded-full",
  }));
}

const CONFETTI = generateConfetti(60);

type DensityMode = "normal" | "compact" | "dense";

function getDisplayDensityMode(prompt: string, options: string[]): DensityMode {
  const promptLength = prompt.trim().length;
  const optionLengths = options.map((option) => option.trim().length);
  const maxOptionLength =
    optionLengths.length > 0 ? Math.max(...optionLengths) : 0;
  const averageOptionLength =
    optionLengths.length > 0
      ? optionLengths.reduce((sum, length) => sum + length, 0) /
        optionLengths.length
      : 0;
  const totalTextLength =
    promptLength + optionLengths.reduce((sum, length) => sum + length, 0);

  if (
    promptLength > 185 ||
    maxOptionLength > 125 ||
    averageOptionLength > 95 ||
    totalTextLength > 520
  ) {
    return "dense";
  }

  if (
    promptLength > 110 ||
    maxOptionLength > 82 ||
    averageOptionLength > 68 ||
    totalTextLength > 360
  ) {
    return "compact";
  }

  return "normal";
}

function getPromptDensityClasses(mode: DensityMode) {
  if (mode === "dense") {
    return {
      container: "gap-4 px-20",
      heading:
        "max-w-4xl text-balance text-[2.15rem] font-black leading-[1.03] text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.55)] xl:text-[3.25rem]",
      stage: "px-16 py-8",
    };
  }

  if (mode === "compact") {
    return {
      container: "gap-5 px-24",
      heading:
        "max-w-5xl text-balance text-[2.65rem] font-black leading-[1.06] text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.55)] xl:text-[4.2rem]",
      stage: "px-18 py-9",
    };
  }

  return {
    container: "gap-8 px-28",
    heading:
      "max-w-5xl text-balance text-4xl font-black leading-[1.12] text-white drop-shadow-[0_10px_30px_rgba(15,23,42,0.55)] xl:text-6xl",
    stage: "px-20 py-10",
  };
}

function getOptionDensityClasses(option: string, mode: DensityMode) {
  const length = option.trim().length;

  if (mode === "dense") {
    if (length > 125) {
      return {
        card: "min-h-30 gap-3 px-5 py-4",
        icon: "pt-1 text-lg font-black",
        text: "max-w-[28rem] text-[1.08rem] font-bold leading-[1.12]",
        mark: "text-lg font-black",
      };
    }

    return {
      card: "min-h-32 gap-4 px-6 py-4",
      icon: "pt-1 text-xl font-black",
      text: "max-w-[30rem] text-[1.2rem] font-bold leading-[1.14]",
      mark: "text-xl font-black",
    };
  }

  if (mode === "compact") {
    if (length > 110) {
      return {
        card: "min-h-34 gap-4 px-6 py-5",
        icon: "pt-1 text-[1.45rem] font-black",
        text: "max-w-[31rem] text-[1.35rem] font-bold leading-[1.16]",
        mark: "text-[1.45rem] font-black",
      };
    }

    return {
      card: "min-h-36 gap-4 px-7 py-5",
      icon: "pt-1 text-2xl font-black",
      text: "max-w-[32rem] text-[1.45rem] font-bold leading-[1.18]",
      mark: "text-2xl font-black",
    };
  }

  if (length > 165) {
    return {
      card: "min-h-36 gap-4 px-7 py-5",
      icon: "pt-1 text-2xl font-black",
      text: "max-w-[32rem] text-[1.45rem] font-bold leading-[1.18]",
      mark: "text-2xl font-black",
    };
  }

  if (length > 110) {
    return {
      card: "min-h-40 gap-4 px-7 py-6",
      icon: "pt-1 text-[1.7rem] font-black",
      text: "max-w-[33rem] text-[1.7rem] font-bold leading-[1.2]",
      mark: "text-[1.7rem] font-black",
    };
  }

  return {
    card: "min-h-44 gap-5 px-8 py-7",
    icon: "pt-1 text-3xl font-black",
    text: "max-w-[34rem] text-[2rem] font-bold leading-[1.22]",
    mark: "text-3xl font-black",
  };
}

function HostControlButton({
  disabled = false,
  label,
  pendingLabel,
  variant,
}: {
  disabled?: boolean;
  label: string;
  pendingLabel: string;
  variant: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        variant === "primary"
          ? "min-w-28 rounded-xl bg-[#10233f] px-5 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.2)] transition hover:bg-[#1d3557] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
          : "min-w-24 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#334155] shadow-sm transition hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
      }
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

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
  canControlSession,
}: {
  initialParticipants: { id: string; nickname: string; presenceStatus: "offline" | "online" }[];
  pin: string;
  quizTitle: string;
  qrCodeDataUrl: string;
  pinFormatted: string;
  baseUrl: string;
  realtimeUrl: string;
  sessionId: string;
  branding: LiveBranding;
  canControlSession: boolean;
}) {
  const {
    connectedCount,
    currentQuestion,
    currentResult,
    leaderboard,
    participants,
    questionStats,
    remainingSeconds,
    sessionState,
    submittedCount,
  } = useDisplaySocket({ pin, realtimeUrl, initialParticipants });

  const [showSummary, setShowSummary] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const advanceFormRef = useRef<HTMLFormElement | null>(null);
  const [startState, startFormAction] = useActionState(startLiveSession, {
    message: "",
    status: "idle",
  });
  const [advanceState, advanceFormAction] = useActionState(advanceLiveSession, {
    message: "",
    status: "idle",
  });
  const [skipState, skipFormAction] = useActionState(skipLiveQuestion, {
    message: "",
    status: "idle",
  });

  const backgroundStyle = {
    backgroundImage: branding.backgroundImageUrl
      ? `linear-gradient(180deg, rgba(16,35,63,0.82) 0%, rgba(0,0,0,0.65) 100%), url(${branding.backgroundImageUrl})`
      : `linear-gradient(160deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
    backgroundPosition: "center",
    backgroundSize: "cover",
    fontFamily: branding.fontFamily,
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (
      !canControlSession ||
      !["playing", "question_result"].includes(sessionState.status)
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.matches("input, textarea, select, button, [contenteditable]")
      ) {
        return;
      }

      if (showSkipConfirmation) {
        if (event.key === "Escape") {
          setShowSkipConfirmation(false);
        }
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setShowSkipConfirmation(false);
        advanceFormRef.current?.requestSubmit();
      } else if (
        event.key.toLowerCase() === "s" &&
        sessionState.status === "playing"
      ) {
        event.preventDefault();
        setShowSkipConfirmation(true);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canControlSession, sessionState.status, showSkipConfirmation]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  // ── FINISHED — podium + summary ─────────────────────────────────────────────
  if (sessionState.status === "finished") {
    const top3 = leaderboard.slice(0, 3);

    // Session summary calculations
    const totalAnswered = questionStats.reduce(
      (s, q) => s + q.submittedCount,
      0,
    );
    const totalCorrect = questionStats.reduce((s, q) => s + q.correctCount, 0);
    const pctCorrect =
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
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
          style={backgroundStyle}
        >
          <div className="w-full max-w-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">
                Resumo da sessão
              </h2>
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
                  {pctCorrect >= 80
                    ? "Grande desempenho!"
                    : pctCorrect >= 50
                      ? "Bom esforço!"
                      : "Pode melhorar!"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-6 text-center">
                <div
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white ring-4 ring-white/20"
                  style={{
                    backgroundColor: hardQuestions > 0 ? "#e21b3c" : "#26890c",
                  }}
                >
                  {hardQuestions}
                </div>
                <p className="mt-3 text-sm font-semibold text-white/70">
                  Perguntas difíceis
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  {hardQuestions === 0
                    ? "A prática leva à perfeição!"
                    : `${hardQuestions} pergunta${hardQuestions > 1 ? "s" : ""} com menos de 50% de acertos`}
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
        style={backgroundStyle}
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
  if (
    sessionState.status === "waiting" ||
    sessionState.status === "countdown"
  ) {
    return (
      <div
        className="relative flex flex-1 flex-col overflow-hidden"
        style={backgroundStyle}
      >
        {/* Geometric overlay shapes (subtle when using branding gradient) */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1920 1080"
        >
          <polygon
            fill="#ffffff"
            points="0,1080 420,340 840,1080"
            opacity="0.05"
          />
          <polygon
            fill="#ffffff"
            points="380,1080 820,220 1260,1080"
            opacity="0.04"
          />
          <polygon
            fill="#ffffff"
            points="820,1080 1320,150 1800,1080"
            opacity="0.03"
          />
        </svg>

        {canControlSession ? (
          <div className="relative z-20 flex items-start justify-end gap-3 px-6 pt-5">
            {startState.status === "error" ? (
              <p className="rounded-xl bg-[var(--quizzy-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--quizzy-error)] shadow-lg">
                {startState.message}
              </p>
            ) : null}
            <form action={startFormAction}>
              <input name="sessionId" type="hidden" value={sessionId} />
              <HostControlButton
                disabled={sessionState.status !== "waiting"}
                label="Iniciar"
                pendingLabel="Iniciando..."
                variant="primary"
              />
            </form>
          </div>
        ) : null}

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
                <img
                  alt="QR code da sessão"
                  className="h-auto w-full"
                  src={qrCodeDataUrl}
                />
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
                  <p className="text-sm font-bold text-white/70">
                    Começando em
                  </p>
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
                  <h1
                    className="text-4xl font-black"
                    style={{ color: branding.secondaryColor }}
                  >
                    {quizTitle}
                  </h1>
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
                style={{
                  backgroundColor: branding.accentColor,
                  color: branding.secondaryColor,
                }}
              >
                {connectedCount}
              </span>
            </div>
            <div className="mt-5 space-y-1">
              {participants.length === 0 ? (
                <p className="text-sm text-white/30">Aguardando...</p>
              ) : (
                participants.map((p) => (
                  <p
                    key={p.id}
                    className="py-1.5 text-sm font-semibold text-white/80"
                  >
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
    (sessionState.status === "playing" ||
      sessionState.status === "question_result") &&
    (currentQuestion || currentResult)
  ) {
    const question = currentResult
      ? { prompt: currentResult.prompt, options: currentResult.options }
      : currentQuestion!;
    const densityMode = getDisplayDensityMode(
      question.prompt,
      question.options,
    );
    const promptDensity = getPromptDensityClasses(densityMode);
    const isLastQuestion = currentQuestion
      ? currentQuestion.orderIndex === currentQuestion.totalQuestions - 1
      : false;
    const advanceLabel =
      sessionState.status === "playing"
        ? "Ver resultado"
        : isLastQuestion
          ? "Encerrar quiz"
          : "Próxima pergunta";

    return (
      <div
        className="relative flex flex-1 flex-col"
        style={{ fontFamily: branding.fontFamily }}
      >
        <div className="relative flex min-h-24 items-center justify-end bg-white px-6 py-5 shadow-lg">
          {canControlSession ? (
            <div className="z-30 flex items-center gap-2">
              {sessionState.status === "playing" ? (
                <button
                  className="min-w-24 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#334155] shadow-sm transition hover:bg-slate-50 active:translate-y-px"
                  onClick={() => setShowSkipConfirmation(true)}
                  title="Pular pergunta (S)"
                  type="button"
                >
                  Pular
                </button>
              ) : null}
              <form action={advanceFormAction} ref={advanceFormRef}>
                <input name="sessionId" type="hidden" value={sessionId} />
                <HostControlButton
                  label={advanceLabel}
                  pendingLabel="Avançando..."
                  variant="primary"
                />
              </form>
              <button
                aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-[#334155] shadow-sm transition hover:bg-slate-50 active:translate-y-px"
                onClick={() => void toggleFullscreen()}
                title={
                  isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"
                }
                type="button"
              >
                {isFullscreen ? (
                  <Minimize2 aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <Maximize2 aria-hidden="true" className="h-5 w-5" />
                )}
              </button>
            </div>
          ) : null}
        </div>

        {canControlSession && showSkipConfirmation ? (
          <div className="absolute right-6 top-28 z-50 w-[22rem] rounded-2xl border border-slate-200 bg-white p-5 text-[#132238] shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c2410c]">
              Pular pergunta
            </p>
            <h2 className="mt-2 text-lg font-bold">
              Seguir sem mostrar o resultado?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              As respostas já enviadas permanecem registradas, mas esta pergunta
              será marcada como pulada no relatório.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setShowSkipConfirmation(false)}
                type="button"
              >
                Cancelar
              </button>
              <form
                action={skipFormAction}
                onSubmit={() => setShowSkipConfirmation(false)}
              >
                <input name="sessionId" type="hidden" value={sessionId} />
                <HostControlButton
                  label="Pular agora"
                  pendingLabel="Pulando..."
                  variant="primary"
                />
              </form>
            </div>
          </div>
        ) : null}

        {canControlSession &&
        (advanceState.status === "error" || skipState.status === "error") ? (
          <div className="absolute right-6 top-28 z-40 max-w-sm rounded-xl bg-[var(--quizzy-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--quizzy-error)] shadow-xl">
            {advanceState.status === "error"
              ? advanceState.message
              : skipState.message}
          </div>
        ) : null}

        <div
          className={`relative flex flex-1 items-center justify-center overflow-hidden ${promptDensity.stage}`}
          style={backgroundStyle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.32))]" />

          <div className="absolute left-8 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg"
              style={{ backgroundColor: branding.secondaryColor }}
            >
              {remainingSeconds ?? currentQuestion?.timeLimitSeconds ?? "—"}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
              tempo
            </p>
          </div>

          <div
            className={`relative z-10 flex w-full max-w-6xl flex-col items-center justify-center text-center ${promptDensity.container}`}
          >
            {currentQuestion ? (
              <span
                className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-[0.3em] shadow-lg"
                style={{
                  backgroundColor: branding.accentColor,
                  color: branding.secondaryColor,
                }}
              >
                Pergunta {currentQuestion.orderIndex + 1} de{" "}
                {currentQuestion.totalQuestions}
              </span>
            ) : null}
            <h1 className={promptDensity.heading}>{question.prompt}</h1>
          </div>

          <div className="absolute right-8 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg"
              style={{ backgroundColor: branding.secondaryColor }}
            >
              {submittedCount}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
              respostas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0">
          {question.options.map((option, i) => {
            const style = OPTION_STYLES[i % OPTION_STYLES.length];
            const isCorrect =
              currentResult && i === currentResult.correctOptionIndex;
            const optionDensity = getOptionDensityClasses(option, densityMode);

            return (
              <div
                key={i}
                className={`relative flex items-start text-white ${optionDensity.card}`}
                style={{
                  backgroundColor:
                    currentResult && !isCorrect
                      ? "#555"
                      : (style?.bg ?? "#333"),
                  opacity: currentResult && !isCorrect ? 0.5 : 1,
                }}
              >
                <span className={optionDensity.icon}>{style?.icon}</span>
                <span className={optionDensity.text}>{option}</span>
                {isCorrect ? (
                  <span className={`ml-auto self-center ${optionDensity.mark}`}>
                    ✓
                  </span>
                ) : null}
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
          {canControlSession ? (
            <span className="text-xs font-semibold text-white/50">
              Espaço: avançar · S: pular · F: tela cheia
            </span>
          ) : null}
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
