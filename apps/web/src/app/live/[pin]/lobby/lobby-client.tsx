"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatusAlert } from "@/components/phase-one-ui";
import { io, type Socket } from "socket.io-client";

type Participant = {
  avatar: string;
  currentStreak: number;
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
  score: number;
  totalTimeMs: number;
};

type LeaderboardEntry = {
  answeredCurrentQuestion: boolean;
  avatar: string;
  currentStreak: number;
  id: string;
  lastIsCorrect: boolean | null;
  lastPointsEarned: number;
  nickname: string;
  rank: number;
  score: number;
  totalTimeMs: number;
};

type LiveBranding = {
  accentColor: string;
  backgroundImageUrl: string | null;
  fontFamily: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  showQuestionOnMobile: boolean;
};

type SessionState = {
  connectedParticipantsCount: number;
  countdownSeconds: number | null;
  hostLastSeenAt: number | null;
  hostPresenceStatus: "offline" | "online";
  interruptionReason: "host_disconnected" | null;
  lastEventAt: number | null;
  offlineParticipantsCount: number;
  rejectedAnswersCount: number;
  status: string;
};

type ActiveQuestion = {
  id: string;
  imageUrl: string | null;
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
  imageUrl: string | null;
  leaderboard: LeaderboardEntry[];
  options: string[];
  prompt: string;
  questionId: string;
  questionOrderIndex: number;
  submittedCount: number;
  totalQuestions: number;
};

type AnswerState = {
  accepted: boolean;
  answerIndex: number | null;
  currentStreak: number;
  isCorrect: boolean | null;
  pointsEarned: number;
  submitted: boolean;
};

const initialAnswerState: AnswerState = {
  accepted: false,
  answerIndex: null,
  currentStreak: 0,
  isCorrect: null,
  pointsEarned: 0,
  submitted: false,
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

function formatStreakMultiplier(currentStreak: number) {
  return Math.min(1.5, 1 + currentStreak * 0.1).toFixed(1);
}

function formatRankDelta(delta: number) {
  if (delta === 0) {
    return null;
  }

  return delta > 0 ? `+${delta}` : String(delta);
}

const ANSWER_TILE_STYLES = [
  {
    bg: "#e21b3c",
    fg: "#ffffff",
    icon: "▲",
  },
  {
    bg: "#1368ce",
    fg: "#ffffff",
    icon: "◆",
  },
  {
    bg: "#d89e00",
    fg: "#ffffff",
    icon: "●",
  },
  {
    bg: "#26890c",
    fg: "#ffffff",
    icon: "■",
  },
];

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
  initialParticipants: Participant[];
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
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [connectedCount, setConnectedCount] = useState(
    initialParticipants.filter(
      (currentParticipant) => currentParticipant.presenceStatus === "online",
    ).length,
  );
  const [sessionState, setSessionState] = useState<SessionState>({
    connectedParticipantsCount: initialParticipants.filter(
      (currentParticipant) => currentParticipant.presenceStatus === "online",
    ).length,
    countdownSeconds: initialSessionStatus === "countdown" ? 3 : null,
    hostLastSeenAt: null,
    hostPresenceStatus: "offline",
    interruptionReason: null,
    lastEventAt: null,
    offlineParticipantsCount: initialParticipants.length,
    rejectedAnswersCount: 0,
    status: initialSessionStatus,
  });
  const [currentQuestion, setCurrentQuestion] = useState<ActiveQuestion | null>(
    null,
  );
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(
    null,
  );
  const [finalLeaderboard, setFinalLeaderboard] = useState<LeaderboardEntry[]>(
    [],
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [rankDeltaById, setRankDeltaById] = useState<Record<string, number>>(
    {},
  );
  const [questionRemainingSeconds, setQuestionRemainingSeconds] = useState<
    number | null
  >(null);
  const [answerState, setAnswerState] =
    useState<AnswerState>(initialAnswerState);
  const [socketConnected, setSocketConnected] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const wasDisconnectedRef = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [playerCurrentStreak, setPlayerCurrentStreak] = useState(
    participant.currentStreak,
  );
  const [animatedScore, setAnimatedScore] = useState(participant.score);
  const [submissionStats, setSubmissionStats] = useState({
    submittedCount: 0,
    totalParticipants: initialParticipants.length,
  });
  const socketRef = useRef<Socket | null>(null);
  const animatedScoreRef = useRef(participant.score);
  const previousLeaderboardRef = useRef<LeaderboardEntry[]>([]);
  const playerCurrentStreakRef = useRef(participant.currentStreak);

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
    playerCurrentStreakRef.current = playerCurrentStreak;
  }, [playerCurrentStreak]);

  useEffect(() => {
    if (sessionState.status !== "countdown" || !sessionState.countdownSeconds) {
      return;
    }

    const interval = window.setInterval(() => {
      setSessionState((currentState) => {
        if (
          currentState.status !== "countdown" ||
          currentState.countdownSeconds === null
        ) {
          window.clearInterval(interval);
          return currentState;
        }

        return {
          ...currentState,
          countdownSeconds:
            currentState.countdownSeconds > 1
              ? currentState.countdownSeconds - 1
              : 1,
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [sessionState.countdownSeconds, sessionState.status]);

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

    const interval = window.setInterval(() => {
      const elapsedMs = Date.now() - currentQuestion.startedAt;
      const remaining = Math.max(
        0,
        Math.ceil(currentQuestion.timeLimitSeconds - elapsedMs / 1000),
      );

      setQuestionRemainingSeconds(remaining);
    }, 250);

    return () => {
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

  useEffect(() => {
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      if (wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        setJustReconnected(true);
        window.setTimeout(() => setJustReconnected(false), 4000);
      }
      socket.emit("session:join", {
        avatar: participant.avatar,
        currentStreak: participant.currentStreak,
        nickname: participant.nickname,
        participantId: participant.id,
        participantToken: participant.participantToken,
        pin,
        role: "participant",
        score: participant.score,
        totalTimeMs: participant.totalTimeMs,
      });
    });

    socket.on("disconnect", () => {
      wasDisconnectedRef.current = true;
      setSocketConnected(false);
    });

    socket.on(
      "participant:list",
      (payload: { connectedCount: number; participants: Participant[] }) => {
        setParticipants(payload.participants);
        setConnectedCount(payload.connectedCount);
        const currentParticipant = payload.participants.find(
          (entry) => entry.id === participant.id,
        );
        if (currentParticipant) {
          setPlayerCurrentStreak(currentParticipant.currentStreak);
        }
        setSubmissionStats((currentStats) => ({
          ...currentStats,
          totalParticipants: payload.connectedCount,
        }));
      },
    );

    socket.on("session:state", (payload: SessionState) => {
      setSessionState(payload);
    });

    socket.on("session:countdown", (payload: { seconds: number }) => {
      setCurrentResult(null);
      setSessionState((currentState) => ({
        ...currentState,
        countdownSeconds: payload.seconds,
        interruptionReason: null,
        status: "countdown",
      }));
    });

    socket.on("session:started", () => {
      setCurrentResult(null);
      setFinalLeaderboard([]);
      setSessionState((currentState) => ({
        ...currentState,
        countdownSeconds: null,
        interruptionReason: null,
        status: "playing",
      }));
    });

    socket.on("session:question", (payload: { question: ActiveQuestion }) => {
      setCurrentQuestion(payload.question);
      setCurrentResult(null);
      setAnswerState(initialAnswerState);
      setQuestionRemainingSeconds(payload.question.timeLimitSeconds);
      setSubmissionStats((currentStats) => ({
        submittedCount: payload.question.submittedCount,
        totalParticipants: currentStats.totalParticipants,
      }));
    });

    socket.on(
      "question:stats",
      (payload: { submittedCount: number; totalParticipants: number }) => {
        setSubmissionStats({
          submittedCount: payload.submittedCount,
          totalParticipants: payload.totalParticipants,
        });
      },
    );

    socket.on(
      "leaderboard:update",
      (payload: { entries: LeaderboardEntry[] }) => {
        const previousRanks = new Map(
          previousLeaderboardRef.current.map((entry) => [entry.id, entry.rank]),
        );
        const nextRankDeltaById = payload.entries.reduce<
          Record<string, number>
        >((accumulator, entry) => {
          const previousRank = previousRanks.get(entry.id);

          if (typeof previousRank === "number" && previousRank !== entry.rank) {
            accumulator[entry.id] = previousRank - entry.rank;
          }

          return accumulator;
        }, {});

        previousLeaderboardRef.current = payload.entries;
        setRankDeltaById(nextRankDeltaById);
        setLeaderboardVersion((currentVersion) => currentVersion + 1);
        const currentParticipant = payload.entries.find(
          (entry) => entry.id === participant.id,
        );
        if (currentParticipant) {
          setPlayerCurrentStreak(currentParticipant.currentStreak);
        }
        setLeaderboard(payload.entries);
      },
    );

    socket.on("question:result", (payload: { result: QuestionResult }) => {
      setCurrentResult(payload.result);
      setLeaderboard(payload.result.leaderboard);
      setQuestionRemainingSeconds(0);
      setSessionState((currentState) => ({
        ...currentState,
        countdownSeconds: null,
        interruptionReason: null,
        status: "question_result",
      }));
    });

    socket.on(
      "session:final",
      (payload: { leaderboard: LeaderboardEntry[]; status: string }) => {
        setFinalLeaderboard(payload.leaderboard);
        setLeaderboard(payload.leaderboard);
        setSessionState((currentState) => ({
          ...currentState,
          countdownSeconds: null,
          interruptionReason: null,
          status: payload.status,
        }));
      },
    );

    socket.on(
      "answer:ack",
      (payload: {
        accepted: boolean;
        answerIndex?: number;
        currentStreak?: number;
        isCorrect?: boolean;
        pointsEarned?: number;
      }) => {
        if (!payload.accepted) {
          return;
        }

        setAnswerState({
          accepted: true,
          answerIndex: payload.answerIndex ?? null,
          currentStreak: payload.currentStreak ?? playerCurrentStreakRef.current,
          isCorrect: payload.isCorrect ?? null,
          pointsEarned: payload.pointsEarned ?? 0,
          submitted: true,
        });
        setPlayerCurrentStreak(
          payload.currentStreak ?? playerCurrentStreakRef.current,
        );
      },
    );

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [
    participant.avatar,
    participant.currentStreak,
    participant.id,
    participant.nickname,
    participant.participantToken,
    participant.score,
    participant.totalTimeMs,
    pin,
    realtimeUrl,
  ]);

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
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `linear-gradient(180deg, rgba(16,35,63,0.84) 0%, rgba(15,118,110,0.84) 100%), url(${branding.backgroundImageUrl})`
          : `linear-gradient(180deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        fontFamily: branding.fontFamily,
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-4">
        {shouldUseMobileAnswerMode && currentQuestion ? (
          <section className="flex min-h-[100dvh] flex-col md:hidden">
            {branding.showQuestionOnMobile ? (
              <div className="rounded-[1.25rem] bg-white px-4 py-4 text-center text-[#1e3a8a] shadow-[0_18px_50px_rgba(16,35,63,0.16)]">
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
                  className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-full bg-[#1e3a8a] text-white shadow-[0_12px_30px_rgba(30,58,138,0.35)]"
                >
                  <span aria-hidden="true" className="text-xl font-black">{visibleQuestionTime}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="inline-flex rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#10233f]"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    Pergunta {currentQuestion.orderIndex + 1} de {currentQuestion.totalQuestions}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-white/80">
                    {answerState.submitted
                      ? answerState.isCorrect
                        ? `+${answerState.pointsEarned} pontos`
                        : "Resposta enviada"
                      : `${submissionStats.submittedCount}/${submissionStats.totalParticipants} respostas`}
                  </p>
                </div>
                <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-full bg-[#1e3a8a] text-white shadow-[0_12px_30px_rgba(30,58,138,0.35)]">
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
                    ANSWER_TILE_STYLES[optionIndex % ANSWER_TILE_STYLES.length] ??
                    ANSWER_TILE_STYLES[0]!;

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
                        <span className="text-xl font-black">{tileStyle.icon}</span>
                        <span className="text-[1rem] font-bold leading-snug">
                          {option}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-full bg-[#1e3a8a] px-4 py-2.5 text-sm text-white/80">
                <span className="font-semibold tracking-[0.08em]">PIN {pin}</span>
                <span className="font-semibold">
                  {answerState.submitted ? "Aguardando resultado" : "Responda agora"}
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
                  shouldUseCompactMobileLobby ? "text-3xl md:text-4xl" : "text-4xl"
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
                Olá, {participant.nickname}. Seu lugar na sala já está garantido.
              </p>
              <span
                className="mt-5 inline-flex w-fit rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.24em] text-[#10233f]"
                style={{ backgroundColor: branding.accentColor }}
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

        <section className={`space-y-4 ${shouldUseMobileAnswerMode ? "hidden md:block" : ""}`}>
          <article
            className={`rounded-[1.8rem] bg-white/10 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur ${
              shouldUseCompactMobileLobby ? "hidden md:block p-5" : "p-5"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              {sessionState.status === "playing"
                ? "Sua rodada"
                : "Sala pronta"}
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
                {sessionState.status === "playing" && visibleQuestionTime !== null ? (
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
                      }}
                    >
                      🔥 Sequência ×{activeStreak}
                    </span>
                    <p className="mt-2 text-xs text-white/65">
                      Multiplicador {formatStreakMultiplier(activeStreak)}× ativo
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
                      ANSWER_TILE_STYLES[optionIndex % ANSWER_TILE_STYLES.length] ??
                      ANSWER_TILE_STYLES[0]!;

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
                      Resultado da rodada
                    </p>
                    <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-950">
                      {currentResult.prompt}
                    </h2>
                  </div>
                  <span
                    className="rounded-full px-4 py-2 text-sm font-semibold text-[#10233f]"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    {currentResult.correctCount}/{currentResult.submittedCount}{" "}
                    acertaram
                  </span>
                </div>

                {currentResult.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Imagem da pergunta"
                    className="mt-5 max-h-64 w-full rounded-[1.4rem] object-cover"
                    src={currentResult.imageUrl}
                  />
                ) : null}

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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] bg-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Seu resultado
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {personalStanding?.answeredCurrentQuestion
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
                      style={{ backgroundColor: branding.accentColor }}
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
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        (rankDeltaById[entry.id] ?? 0) > 0 
                          ? "bg-[#ecfdf3] text-[#0f766e]" 
                          : "bg-[#fef2f2] text-[#b91c1c]"
                      }`}>
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
                      style={{ backgroundColor: branding.accentColor }}
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
