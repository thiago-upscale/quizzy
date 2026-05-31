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
      return "Comecando";
    }

    return "Aguardando inicio";
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

  return (
    <main
      className="min-h-screen px-6 py-10 text-white"
      style={{
        backgroundImage: branding.backgroundImageUrl
          ? `linear-gradient(180deg, rgba(16,35,63,0.84) 0%, rgba(15,118,110,0.84) 100%), url(${branding.backgroundImageUrl})`
          : `linear-gradient(180deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        fontFamily: branding.fontFamily,
      }}
    >
      <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo do quiz"
                  className="h-12 w-auto rounded-xl bg-white/10 p-2"
                  src={branding.logoUrl}
                />
              ) : null}
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">
                Lobby live
              </p>
              <h1 className="mt-4 text-4xl font-semibold">{quizTitle}</h1>
              <p className="mt-3 text-sm leading-7 text-white/75">
                Ola, {participant.nickname}. Seu lugar na sala ja esta
                garantido.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                PIN {pin}
              </span>
              <span
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                style={{ backgroundColor: branding.accentColor }}
              >
                {roomLabel}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[1.75rem] bg-white/10 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Sala pronta
            </p>
            <p className="mt-3 text-5xl font-semibold">{participants.length}</p>
            <p className="mt-1 text-sm font-medium text-white/75">
              {connectedCount} conectados agora
            </p>
            <p className="mt-1 text-sm font-medium text-white/65">
              Host {sessionState.hostPresenceStatus} •{" "}
              {socketConnected ? "voce conectado" : "reconectando"}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/75">
              participantes ja passaram por esta sala. Quando o host iniciar,
              todos avancam ao mesmo tempo.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Sua pontuacao
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {displayedScore} pontos
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Sequencia
                </p>
                {activeStreak >= 2 ? (
                  <span
                    className="mt-2 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-[#10233f]"
                    style={{
                      animation:
                        activeStreak >= 5 && !prefersReducedMotion
                          ? "quizzy-pulse-soft 1.2s ease-in-out infinite"
                          : undefined,
                      backgroundColor: branding.accentColor,
                    }}
                  >
                    Sequencia x{activeStreak} • {formatStreakMultiplier(activeStreak)}x
                  </span>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-white/75">
                    Sem bonus acumulado ainda
                  </p>
                )}
              </div>
            </div>

            {!socketConnected ? (
              <div className="mt-6">
                <StatusAlert tone="warning">
                  Reconectando... sua sessao continua preservada enquanto o
                  canal realtime tenta retomar a conexao.
                </StatusAlert>
              </div>
            ) : null}

            {sessionState.status === "countdown" ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Comecando agora
                </p>
                <p className="mt-3 text-6xl font-semibold">
                  {sessionState.countdownSeconds ?? 3}
                </p>
              </div>
            ) : null}

            {sessionState.status === "playing" && currentQuestion ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Pergunta {currentQuestion.orderIndex + 1} de{" "}
                      {currentQuestion.totalQuestions}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">
                      {currentQuestion.prompt}
                    </h2>
                  </div>
                  <span
                    className="rounded-full px-4 py-2 text-sm font-semibold text-[#10233f]"
                    style={{ backgroundColor: branding.accentColor }}
                  >
                    {questionRemainingSeconds ??
                      currentQuestion.timeLimitSeconds}
                    s
                  </span>
                </div>

                {currentQuestion.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Imagem da pergunta"
                    className="mt-6 max-h-64 w-full rounded-2xl object-cover"
                    src={currentQuestion.imageUrl}
                  />
                ) : null}

                <div className="mt-6 grid gap-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isChosen = answerState.answerIndex === optionIndex;

                    return (
                      <button
                        key={`${currentQuestion.id}-${optionIndex}`}
                        className={
                          isChosen
                            ? "min-h-14 scale-[1.03] rounded-2xl bg-white px-4 py-4 text-left text-sm font-semibold text-[#10233f] transition"
                            : "min-h-14 rounded-2xl bg-white/10 px-4 py-4 text-left text-sm font-medium text-white transition hover:bg-white/20"
                        }
                        disabled={
                          answerState.submitted ||
                          questionRemainingSeconds === 0
                        }
                        onClick={() => submitAnswer(optionIndex)}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Respostas enviadas
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {submissionStats.submittedCount}/
                      {submissionStats.totalParticipants}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Seu status
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {answerState.submitted
                        ? answerState.isCorrect
                          ? `Resposta confirmada: +${answerState.pointsEarned} pontos`
                          : "Resposta confirmada. Aguarde o resultado."
                        : "Aguardando sua resposta"}
                    </p>
                    {answerState.submitted && answerState.currentStreak >= 2 ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                        Sequencia x{answerState.currentStreak}
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
                  O host esta se reconectando
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#9a3412]">
                  Sua participacao foi preservada. Assim que o host retomar o
                  controle, a sala volta para um estado seguro automaticamente.
                </p>
              </div>
            ) : null}

            {sessionState.status === "question_result" && currentResult ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Resultado da rodada
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">
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
                    className="mt-6 max-h-64 w-full rounded-2xl object-cover"
                    src={currentResult.imageUrl}
                  />
                ) : null}

                <div className="mt-6 grid gap-3">
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
                            ? "rounded-2xl border border-[#d9ff37] bg-white px-4 py-4 text-sm font-semibold text-[#10233f]"
                            : isChosenOption
                              ? "rounded-2xl border border-[#fecaca] bg-[#7f1d1d] px-4 py-4 text-sm font-semibold text-white"
                              : "rounded-2xl bg-white/10 px-4 py-4 text-sm font-medium text-white/78"
                        }
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span>{option}</span>
                          {isCorrectOption ? (
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
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

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Seu resultado
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {personalStanding?.answeredCurrentQuestion
                        ? personalStanding.lastIsCorrect
                          ? `Voce acertou e ganhou ${personalStanding.lastPointsEarned} pontos.`
                          : "Voce respondeu, mas nao acertou nesta rodada."
                        : "Voce nao respondeu a tempo nesta rodada."}
                    </p>
                    {activeStreak >= 2 ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                        Sequencia ativa x{activeStreak}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Sua colocacao
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {personalStanding
                        ? `${personalStanding.rank}o lugar com ${displayedScore} pontos`
                        : "Atualizando classificacao"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {sessionState.status === "finished" ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Resultado final
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  Sessao encerrada
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  O ranking final ja esta consolidado. Obrigado por jogar.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Sua posicao
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {personalStanding
                        ? `${personalStanding.rank}o lugar`
                        : "Posicao indisponivel"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      Pontuacao final
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {personalStanding
                        ? `${personalStanding.score} pontos em ${formatDuration(personalStanding.totalTimeMs)}`
                        : "Sem pontuacao registrada"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {sessionState.status === "playing" && !currentQuestion ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Primeira pergunta
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  Preparando o enunciado
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  O host ja iniciou a sessao. A pergunta vai aparecer aqui em
                  instantes.
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.75rem] bg-white/10 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur">
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
                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-sm leading-7 text-white/75">
                    O ranking aparece assim que a rodada comecar e as primeiras
                    respostas forem chegando.
                  </p>
                </div>
              ) : (
                leaderboardToRender.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"
                    style={
                      prefersReducedMotion
                        ? undefined
                        : {
                            animation: "quizzy-rise 360ms ease both",
                            animationDelay: `${(leaderboardVersion + entry.rank) % 5 * 70}ms`,
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
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
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
                  <h3 className="mt-2 text-xl font-semibold">Quem ja entrou</h3>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {participants.map((currentParticipant) => (
                  <div
                    key={currentParticipant.id}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"
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
