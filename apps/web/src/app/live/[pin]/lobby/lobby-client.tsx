"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatusAlert } from "@/components/phase-one-ui";
import { ANSWER_PALETTE, brandingSurfaceStyle } from "@/lib/branding-theme";
import type { LiveBranding } from "@/lib/live";
import type {
  ActiveQuestion,
  LeaderboardEntry,
  QuestionResult,
  SessionStatePayload,
} from "@/lib/socket-types";
import {
  useLiveParticipantSocket,
  type ParticipantListEntry,
} from "@/hooks/useLiveParticipantSocket";

function formatDuration(totalTimeMs: number) {
  const totalSeconds = Math.round(totalTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatStreakMultiplier(currentStreak: number) {
  return Math.min(1.5, 1 + currentStreak * 0.1).toFixed(1);
}

function formatRankDelta(delta: number) {
  if (delta === 0) {
    return null;
  }

  return delta > 0 ? `+${delta}` : String(delta);
}

const ANSWER_TILE_STYLES = ANSWER_PALETTE;

export function LobbyClient({
  branding,
  initialParticipants,
  initialSessionStatus,
  participant,
  pin,
  quizTitle,
  realtimeUrl,
}: {
  branding: LiveBranding;
  initialParticipants: ParticipantListEntry[];
  initialSessionStatus: string;
  participant: {
    avatar: string;
    currentStreak: number;
    id: string;
    nickname: string;
    participantToken: string;
    score: number;
    totalTimeMs: number;
  };
  pin: string;
  quizTitle: string;
  realtimeUrl: string;
}) {
  const {
    answerState,
    connectedCount,
    currentQuestion,
    currentResult,
    finalLeaderboard,
    justReconnected,
    leaderboard,
    leaderboardVersion,
    participants,
    playerCurrentStreak,
    rankDeltaById,
    sessionState,
    socketConnected,
    socketRef,
    submissionStats,
  } = useLiveParticipantSocket({
    realtimeUrl,
    pin,
    participant,
    initialParticipants,
    initialSessionStatus,
  });

  const [questionRemainingSeconds, setQuestionRemainingSeconds] = useState<
    number | null
  >(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(participant.score);
  const animatedScoreRef = useRef(participant.score);

  const roomLabel = useMemo(() => {
    if (sessionState.status === "finished") {
      return "Encerrado";
    }

    if (sessionState.status === "interrupted") {
      return "Pausado";
    }

    if (sessionState.status === "question_result") {
      return "Resultado";
    }

    if (sessionState.status === "playing") {
      return "Ao vivo";
    }

    if (sessionState.status === "countdown") {
      return "Começando";
    }

    return "Aguardando início";
  }, [sessionState.status]);

  const personalStanding = useMemo(() => {
    const activeLeaderboard =
      sessionState.status === "finished" ? finalLeaderboard : leaderboard;

    return (
      activeLeaderboard.find((entry) => entry.id === participant.id) ?? null
    );
  }, [finalLeaderboard, leaderboard, participant.id, sessionState.status]);

  const activeStreak =
    personalStanding?.currentStreak ?? playerCurrentStreak ?? 0;

  useEffect(() => {
    animatedScoreRef.current = animatedScore;
  }, [animatedScore]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => {
      mediaQuery.removeEventListener("change", syncPreference);
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion || sessionState.status !== "playing") {
      return;
    }

    // Anchor the countdown on this device's own clock instead of subtracting
    // the server epoch from Date.now(). Subtracting cross-clock values made a
    // skewed phone clock corrupt the timer (e.g. a 30s question showing 10s).
    // serverNow - startedAt = elapsed already counted on the server at receipt;
    // from there we only add local elapsed measured with this same clock.
    const clientReceivedAt = Date.now();
    const serverElapsedAtReceiptMs =
      currentQuestion.serverNow - currentQuestion.startedAt;

    const computeRemaining = () => {
      const elapsedMs =
        serverElapsedAtReceiptMs + (Date.now() - clientReceivedAt);
      return Math.max(
        0,
        Math.ceil(currentQuestion.timeLimitSeconds - elapsedMs / 1000),
      );
    };

    // First tick runs on the next macrotask (not synchronously in the effect)
    // so a late joiner gets the corrected value immediately without violating
    // react-hooks/set-state-in-effect; before it fires, the render fallback
    // already shows the full time limit.
    const prime = window.setTimeout(() => {
      setQuestionRemainingSeconds(computeRemaining());
    }, 0);

    const interval = window.setInterval(() => {
      setQuestionRemainingSeconds(computeRemaining());
    }, 250);

    return () => {
      window.clearTimeout(prime);
      window.clearInterval(interval);
    };
  }, [currentQuestion, sessionState.status]);

  useEffect(() => {
    const targetScore = personalStanding?.score ?? participant.score;
    if (prefersReducedMotion) {
      return;
    }

    const startScore = animatedScoreRef.current;
    const delta = targetScore - startScore;

    if (delta === 0) {
      return;
    }

    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 400);
      const eased = 1 - (1 - progress) * (1 - progress);
      setAnimatedScore(startScore + Math.round(delta * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [participant.score, personalStanding?.score, prefersReducedMotion]);

  const displayedScore = prefersReducedMotion
    ? (personalStanding?.score ?? participant.score)
    : animatedScore;

  function submitAnswer(answerIndex: number) {
    if (
      !currentQuestion ||
      !socketRef.current ||
      answerState.submitted ||
      questionRemainingSeconds === 0 ||
      sessionState.status !== "playing"
    ) {
      return;
    }

    socketRef.current.emit("answer:submit", {
      answerIndex,
      participantToken: participant.participantToken,
      pin,
      questionId: currentQuestion.id,
    });
  }

  const leaderboardToRender =
    sessionState.status === "finished" && finalLeaderboard.length > 0
      ? finalLeaderboard
      : leaderboard;

  const participantTotalCount = participants.length;
  const visibleQuestionTime =
    questionRemainingSeconds ?? currentQuestion?.timeLimitSeconds ?? null;
  const shouldUseMobileAnswerMode =
    sessionState.status === "playing" && currentQuestion !== null;
  const shouldUseCompactMobileLobby =
    !shouldUseMobileAnswerMode &&
    (sessionState.status === "waiting" || sessionState.status === "countdown");

  return (
    <main
      className="min-h-screen px-4 py-4 text-white sm:px-6 sm:py-6"
      style={brandingSurfaceStyle(branding)}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-4">
        {shouldUseMobileAnswerMode && currentQuestion ? (
          <section className="flex min-h-[100dvh] flex-col md:hidden">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Logo"
                className="mb-3 h-8 w-auto max-w-[150px] self-center object-contain drop-shadow"
                src={branding.logoUrl}
              />
            ) : null}
            {branding.showQuestionOnMobile ? (
              <div className="rounded-[1.25rem] bg-white px-4 py-4 text-center text-[var(--brand-secondary)] shadow-[0_18px_50px_rgba(16,35,63,0.16)]">
                <p className="text-[1.45rem] font-black leading-[1.15] tracking-[-0.03em]">
                  {currentQuestion.prompt}
                </p>
              </div>
            ) : null}

            <div className="relative mt-3 flex flex-1 flex-col overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(0,0,0,0.22))] px-3 py-4">
              <div className="flex items-center gap-3">
                <div
                  aria-atomic="true"
                  aria-label={`${visibleQuestionTime} segundos restantes`}
                  aria-live="polite"
                  className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-full bg-[var(--brand-secondary)] text-white shadow-[0_12px_30px_rgba(30,58,138,0.35)]"
                >
                  <span aria-hidden="true" className="text-xl font-black">
                    {visibleQuestionTime}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="inline-flex rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#10233f]"
                    style={{
                      backgroundColor: branding.accentColor,
                      color: "var(--brand-on-accent)",
                    }}
                  >
                    Pergunta {currentQuestion.orderIndex + 1} de{" "}
                    {currentQuestion.totalQuestions}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-white/80">
                    {answerState.submitted
                      ? answerState.isCorrect
                        ? `+${answerState.pointsEarned} pontos`
                        : "Resposta enviada"
                      : `${submissionStats.submittedCount}/${submissionStats.totalParticipants} respostas`}
                  </p>
                </div>
                <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-full bg-[var(--brand-secondary)] text-white shadow-[0_12px_30px_rgba(30,58,138,0.35)]">
                  <span className="text-xl font-black">
                    {submissionStats.submittedCount}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    envios
                  </span>
                </div>
              </div>

              {currentQuestion.imageUrl && branding.showQuestionOnMobile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Imagem da pergunta"
                  className="mt-4 max-h-40 w-full rounded-[1.2rem] object-cover"
                  src={currentQuestion.imageUrl}
                />
              ) : null}

              <div className="mt-4 grid flex-1 grid-cols-2 overflow-hidden rounded-[1.4rem] shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isChosen = answerState.answerIndex === optionIndex;
                  const tileStyle =
                    ANSWER_TILE_STYLES[
                      optionIndex % ANSWER_TILE_STYLES.length
                    ] ?? ANSWER_TILE_STYLES[0]!;

                  return (
                    <button
                      key={`mobile-${currentQuestion.id}-${optionIndex}`}
                      aria-pressed={isChosen}
                      className="min-h-[132px] border border-black/5 px-4 py-4 text-left transition active:scale-[0.99] disabled:opacity-100"
                      disabled={
                        answerState.submitted || questionRemainingSeconds === 0
                      }
                      onClick={() => submitAnswer(optionIndex)}
                      style={{
                        backgroundColor: tileStyle.bg,
                        boxShadow: isChosen
                          ? "inset 0 0 0 4px rgba(255,255,255,0.96)"
                          : undefined,
                        color: tileStyle.fg,
                      }}
                      type="button"
                    >
                      <div className="flex h-full flex-col justify-between gap-4">
                        <span className="text-xl font-black">
                          {tileStyle.icon}
                        </span>
                        <span className="text-[1rem] font-bold leading-snug">
                          {option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-full bg-[var(--brand-secondary)] px-4 py-2.5 text-sm text-white/80">
                <span className="font-semibold tracking-[0.08em]">
                  PIN {pin}
                </span>
                <span className="font-semibold">
                  {answerState.submitted
                    ? "Aguardando resultado"
                    : "Responda agora"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <header
          className={`rounded-[2rem] bg-white/10 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur ${
            shouldUseMobileAnswerMode ? "hidden md:block" : ""
          }`}
        >
          <div className="flex flex-col gap-4">
            <div
              className={`rounded-[1.7rem] bg-white/6 ${
                shouldUseCompactMobileLobby ? "p-4 md:p-5" : "p-5"
              }`}
            >
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo do quiz"
                  className="h-11 w-auto rounded-xl bg-white/10 p-2"
                  src={branding.logoUrl}
                />
              ) : null}
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                {sessionState.status === "playing"
                  ? "Quiz ao vivo"
                  : "Lobby live"}
              </p>
              <h1
                className={`mt-4 font-bold leading-[1.04] tracking-[-0.03em] ${
                  shouldUseCompactMobileLobby
                    ? "text-3xl md:text-4xl"
                    : "text-4xl"
                }`}
              >
                {quizTitle}
              </h1>
              <p
                className={`mt-3 text-white/74 ${
                  shouldUseCompactMobileLobby
                    ? "text-sm leading-6 md:text-base md:leading-8"
                    : "text-base leading-8"
                }`}
              >
                Olá, {participant.nickname}. Seu lugar na sala já está
                garantido.
              </p>
              <span
                className="mt-5 inline-flex w-fit rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.24em] text-[#10233f]"
                style={{
                  backgroundColor: branding.accentColor,
                  color: "var(--brand-on-accent)",
                }}
              >
                {roomLabel}
              </span>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  PIN {pin}
                </span>
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  {connectedCount} online
                </span>
              </div>
              {shouldUseCompactMobileLobby ? (
                <div className="mt-4 space-y-3 md:hidden">
                  {sessionState.status === "countdown" ? (
                    <div className="rounded-[1.35rem] bg-white/10 px-4 py-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Começando agora
                      </p>
                      <p className="mt-2 text-5xl font-black text-white">
                        {sessionState.countdownSeconds ?? 3}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.2rem] bg-white/10 px-4 py-3">
                      <p className="text-sm font-semibold text-white/85">
                        Aguardando o host iniciar. Você será levado para a
                        pergunta automaticamente.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.2rem] bg-white/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Conexão
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white/85">
                        {socketConnected ? "Você conectado" : "Reconectando"}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] bg-white/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Host
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white/85">
                        {sessionState.hostPresenceStatus === "online"
                          ? "Online"
                          : "Aguardando"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section
          className={`space-y-4 ${shouldUseMobileAnswerMode ? "hidden md:block" : ""}`}
        >
          <article
            className={`rounded-[1.8rem] bg-white/10 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur ${
              shouldUseCompactMobileLobby ? "hidden md:block p-5" : "p-5"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              {sessionState.status === "playing" ? "Sua rodada" : "Sala pronta"}
            </p>
            <p className="mt-3 text-5xl font-black tracking-[-0.04em]">
              {sessionState.status === "playing" && currentQuestion
                ? `${currentQuestion.orderIndex + 1}`
                : participantTotalCount}
            </p>
            <p className="mt-1 text-base font-medium text-white/78">
              {sessionState.status === "playing" && currentQuestion
                ? `de ${currentQuestion.totalQuestions} perguntas`
                : `${connectedCount} conectados agora`}
            </p>
            <p className="mt-1 text-sm font-medium text-white/65">
              Host {sessionState.hostPresenceStatus} •{" "}
              {socketConnected ? "você conectado" : "reconectando"}
            </p>
            <p className="mt-4 text-base leading-8 text-white/72">
              {sessionState.status === "playing"
                ? "Responda rápido para acumular pontos e manter sua sequência."
                : "Quando o host iniciar, todos avancam ao mesmo tempo."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Sua pontuação
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.03em]">
                  {displayedScore} pontos
                </p>
              </div>
              <div className="rounded-[1.4rem] bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  {sessionState.status === "playing" ? "Tempo" : "Sequência"}
                </p>
                {sessionState.status === "playing" &&
                visibleQuestionTime !== null ? (
                  <p className="mt-2 text-3xl font-black tracking-[-0.03em]">
                    {visibleQuestionTime}s
                  </p>
                ) : activeStreak >= 2 ? (
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-[#10233f]"
                      style={{
                        animation:
                          activeStreak >= 5 && !prefersReducedMotion
                            ? "quizzy-pulse-soft 1.2s ease-in-out infinite"
                            : undefined,
                        backgroundColor: branding.accentColor,
                        color: "var(--brand-on-accent)",
                      }}
                    >
                      🔥 Sequência ×{activeStreak}
                    </span>
                    <p className="mt-2 text-xs text-white/65">
                      Multiplicador {formatStreakMultiplier(activeStreak)}×
                      ativo
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-white/75">
                    Sem bônus acumulado ainda
                  </p>
                )}
              </div>
            </div>

            {!socketConnected ? (
              <div className="mt-6">
                <StatusAlert tone="warning">
                  Reconectando... sua sessão continua preservada enquanto o
                  canal realtime tenta retomar a conexão.
                </StatusAlert>
              </div>
            ) : justReconnected ? (
              <div className="mt-6">
                <StatusAlert tone="success">
                  Você foi reconectado. Tudo certo para continuar.
                </StatusAlert>
              </div>
            ) : null}

            {sessionState.status === "countdown" ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Começando agora
                </p>
                <p className="mt-3 text-6xl font-semibold">
                  {sessionState.countdownSeconds ?? 3}
                </p>
              </div>
            ) : null}

            {sessionState.status === "playing" && currentQuestion ? (
              <div className="mt-8 rounded-[1.7rem] bg-white p-4 text-slate-950 shadow-[0_18px_50px_rgba(16,35,63,0.16)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Pergunta {currentQuestion.orderIndex + 1} de{" "}
                      {currentQuestion.totalQuestions}
                    </p>
                    <h2 className="mt-3 text-[1.7rem] font-bold leading-[1.18] tracking-[-0.03em] text-slate-950">
                      {currentQuestion.prompt}
                    </h2>
                  </div>
                  <div
                    aria-atomic="true"
                    aria-label={`${visibleQuestionTime} segundos restantes`}
                    aria-live="polite"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    <span aria-hidden="true">{visibleQuestionTime}s</span>
                  </div>
                </div>

                {currentQuestion.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Imagem da pergunta"
                    className="mt-5 max-h-64 w-full rounded-[1.4rem] object-cover"
                    src={currentQuestion.imageUrl}
                  />
                ) : null}

                <div
                  className={`mt-5 grid gap-3 ${
                    currentQuestion.options.length <= 4
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isChosen = answerState.answerIndex === optionIndex;
                    const tileStyle =
                      ANSWER_TILE_STYLES[
                        optionIndex % ANSWER_TILE_STYLES.length
                      ] ?? ANSWER_TILE_STYLES[0]!;

                    return (
                      <button
                        key={`${currentQuestion.id}-${optionIndex}`}
                        aria-pressed={isChosen}
                        className="min-h-[112px] rounded-[1.5rem] px-4 py-4 text-left transition active:scale-[0.99] disabled:opacity-100"
                        disabled={
                          answerState.submitted ||
                          questionRemainingSeconds === 0
                        }
                        onClick={() => submitAnswer(optionIndex)}
                        style={{
                          backgroundColor: tileStyle.bg,
                          boxShadow: isChosen
                            ? "inset 0 0 0 3px rgba(255,255,255,0.92), 0 18px 30px rgba(15,23,42,0.16)"
                            : "0 14px 24px rgba(15,23,42,0.12)",
                          color: tileStyle.fg,
                        }}
                        type="button"
                      >
                        <div className="flex h-full flex-col justify-between gap-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xl font-black">
                              {tileStyle.icon}
                            </span>
                            {isChosen ? (
                              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/90">
                                selecionada
                              </span>
                            ) : null}
                          </div>
                          <span className="text-lg font-bold leading-snug">
                            {option}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] bg-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Respostas enviadas
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {submissionStats.submittedCount}/
                      {submissionStats.totalParticipants}
                    </p>
                  </div>

                  <div className="rounded-[1.35rem] bg-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Seu status
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {answerState.submitted
                        ? answerState.isCorrect
                          ? `Resposta confirmada: +${answerState.pointsEarned} pontos`
                          : "Resposta confirmada. Aguarde o resultado."
                        : "Aguardando sua resposta"}
                    </p>
                    {answerState.submitted && answerState.currentStreak >= 2 ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                        Sequência x{answerState.currentStreak}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {sessionState.status === "interrupted" ? (
              <div className="mt-8 rounded-[1.5rem] bg-[#fff7ed] p-6 text-[#7c2d12]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a3412]">
                  Pausa operacional
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  O host está se reconectando
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#9a3412]">
                  Sua participacao foi preservada. Assim que o host retomar o
                  controle, a sala volta para um estado seguro automaticamente.
                </p>
              </div>
            ) : null}

            {sessionState.status === "question_result" && currentResult ? (
              <div className="mt-8 rounded-[1.7rem] bg-white p-5 text-slate-950 shadow-[0_18px_50px_rgba(16,35,63,0.16)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {currentResult.questionType === "poll"
                        ? "Resultado da enquete"
                        : "Resultado da rodada"}
                    </p>
                    <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-950">
                      {currentResult.prompt}
                    </h2>
                  </div>
                  {currentResult.questionType === "poll" ? (
                    <span
                      className="rounded-full px-4 py-2 text-sm font-semibold text-[#10233f]"
                      style={{
                        backgroundColor: branding.accentColor,
                        color: "var(--brand-on-accent)",
                      }}
                    >
                      {currentResult.submittedCount} votos
                    </span>
                  ) : (
                    <span
                      className="rounded-full px-4 py-2 text-sm font-semibold text-[#10233f]"
                      style={{
                        backgroundColor: branding.accentColor,
                        color: "var(--brand-on-accent)",
                      }}
                    >
                      {currentResult.correctCount}/
                      {currentResult.submittedCount} acertaram
                    </span>
                  )}
                </div>

                {currentResult.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Imagem da pergunta"
                    className="mt-5 max-h-64 w-full rounded-[1.4rem] object-cover"
                    src={currentResult.imageUrl}
                  />
                ) : null}

                {currentResult.questionType === "poll" ? (
                  <div className="mt-5 grid gap-3">
                    {currentResult.options.map((option, optionIndex) => {
                      const votes = currentResult.voteCounts[optionIndex] ?? 0;
                      const total = currentResult.submittedCount || 1;
                      const pct = Math.round((votes / total) * 100);
                      const isChosen = answerState.answerIndex === optionIndex;
                      return (
                        <div
                          key={`${currentResult.questionId}-${optionIndex}`}
                          className={`rounded-[1.35rem] px-4 py-4 ${isChosen ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800"}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-semibold">
                              {option}
                            </span>
                            <span className="shrink-0 text-sm font-black">
                              {pct}%
                              {isChosen ? (
                                <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">
                                  seu voto
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isChosen
                                  ? "#94a3b8"
                                  : "#cbd5e1",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {currentResult.options.map((option, optionIndex) => {
                      const isCorrectOption =
                        optionIndex === currentResult.correctOptionIndex;
                      const isChosenOption =
                        answerState.answerIndex === optionIndex;

                      return (
                        <div
                          key={`${currentResult.questionId}-${optionIndex}`}
                          className={
                            isCorrectOption
                              ? "scale-[1.03] rounded-[1.35rem] bg-[#16a34a] px-4 py-4 text-sm font-semibold text-white shadow-lg transition-transform"
                              : isChosenOption
                                ? "rounded-[1.35rem] border border-[#fecaca] bg-[#7f1d1d] px-4 py-4 text-sm font-semibold text-white"
                                : "rounded-[1.35rem] bg-slate-100 px-4 py-4 text-sm font-medium text-slate-700"
                          }
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span>{option}</span>
                            {isCorrectOption ? (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#dcfce7]">
                                Correta
                              </span>
                            ) : null}
                            {!isCorrectOption && isChosenOption ? (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                                Sua escolha
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] bg-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {currentResult.questionType === "poll"
                        ? "Seu voto"
                        : "Seu resultado"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {currentResult.questionType === "poll"
                        ? personalStanding?.answeredCurrentQuestion
                          ? `Você votou em "${currentResult.options[answerState.answerIndex ?? -1] ?? "?"}".`
                          : "Você não votou nesta enquete."
                        : personalStanding?.answeredCurrentQuestion
                          ? personalStanding.lastIsCorrect
                            ? `Você acertou e ganhou ${personalStanding.lastPointsEarned} pontos.`
                            : "Você respondeu, mas não acertou nesta rodada."
                          : "Você não respondeu a tempo nesta rodada."}
                    </p>
                    {activeStreak >= 2 ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                        Sequência ativa x{activeStreak}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[1.35rem] bg-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Sua colocacao
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {personalStanding
                        ? `${personalStanding.rank}o lugar com ${displayedScore} pontos`
                        : "Atualizando classificacao"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {sessionState.status === "finished" ? (
              <div className="mt-8 rounded-[1.8rem] bg-white p-6 text-center text-slate-950 shadow-[0_18px_50px_rgba(16,35,63,0.16)]">
                <p className="text-4xl">🏆</p>
                <h2 className="mt-4 text-3xl font-bold leading-tight">
                  Agradecemos a participação!
                </h2>
                <p className="mt-2 text-sm text-slate-500">{quizTitle}</p>

                {personalStanding ? (
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.35rem] bg-slate-100 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Posição final
                      </p>
                      <p className="mt-2 text-3xl font-black">
                        {personalStanding.rank}º
                      </p>
                    </div>
                    <div className="rounded-[1.35rem] bg-slate-100 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Pontuação
                      </p>
                      <p className="mt-2 text-3xl font-black">
                        {personalStanding.score}
                      </p>
                    </div>
                    <div className="rounded-[1.35rem] bg-slate-100 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Tempo total
                      </p>
                      <p className="mt-2 text-3xl font-black">
                        {formatDuration(personalStanding.totalTimeMs)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {sessionState.status === "playing" && !currentQuestion ? (
              <div className="mt-8 rounded-[1.7rem] bg-white p-5 text-slate-950 shadow-[0_18px_50px_rgba(16,35,63,0.16)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Primeira pergunta
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  Preparando o enunciado
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  O host já iniciou a sessão. A pergunta vai aparecer aqui em
                  instantes.
                </p>
              </div>
            ) : null}
          </article>

          <article
            className={`rounded-[1.8rem] bg-white/10 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur ${
              shouldUseCompactMobileLobby ? "hidden md:block" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Ranking ao vivo
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  Classificacao da sala
                </h2>
              </div>
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                {connectedCount} online
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {leaderboardToRender.length === 0 ? (
                <div className="rounded-[1.35rem] bg-white/10 px-4 py-4">
                  <p className="text-sm leading-7 text-white/75">
                    O ranking aparece assim que a rodada começar e as primeiras
                    respostas forem chegando.
                  </p>
                </div>
              ) : (
                leaderboardToRender.slice(0, 5).map((entry, idx) => (
                  <div
                    key={`${entry.id}-v${leaderboardVersion}`}
                    className="flex items-center gap-3 rounded-[1.35rem] bg-white/10 px-4 py-3"
                    style={
                      prefersReducedMotion
                        ? undefined
                        : {
                            animation: "quizzy-rise 360ms ease both",
                            animationDelay: `${(4 - idx) * 70}ms`,
                          }
                    }
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-[#10233f]"
                      style={{
                        backgroundColor: branding.accentColor,
                        color: "var(--brand-on-accent)",
                      }}
                    >
                      {entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{entry.nickname}</p>
                      <p className="text-xs text-white/65">
                        {entry.score} pontos em{" "}
                        {formatDuration(entry.totalTimeMs)}
                      </p>
                    </div>
                    {formatRankDelta(rankDeltaById[entry.id] ?? 0) ? (
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                          (rankDeltaById[entry.id] ?? 0) > 0
                            ? "bg-[#ecfdf3] text-[#0f766e]"
                            : "bg-[#fef2f2] text-[#b91c1c]"
                        }`}
                      >
                        {formatRankDelta(rankDeltaById[entry.id] ?? 0)}
                      </span>
                    ) : null}
                    {sessionState.status === "question_result" ? (
                      <p className="text-xs font-semibold text-white/70">
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

            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    Participantes
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">Quem já entrou</h3>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {participants.map((currentParticipant) => (
                  <div
                    key={currentParticipant.id}
                    className="flex items-center gap-3 rounded-[1.35rem] bg-white/10 px-4 py-3"
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-[#10233f]"
                      style={{
                        backgroundColor: branding.accentColor,
                        color: "var(--brand-on-accent)",
                      }}
                    >
                      {currentParticipant.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {currentParticipant.nickname}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-white/65">
                          {currentParticipant.score} pontos
                        </p>
                        <span
                          className={
                            currentParticipant.presenceStatus === "online"
                              ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#dfff4f]"
                              : "text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55"
                          }
                        >
                          {currentParticipant.presenceStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
