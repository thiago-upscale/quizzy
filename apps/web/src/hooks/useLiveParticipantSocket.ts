"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ActiveQuestion,
  LeaderboardEntry,
  QuestionResult,
  SessionStatePayload,
} from "@/lib/socket-types";

export type ParticipantListEntry = {
  avatar: string;
  currentStreak: number;
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
  score: number;
  totalTimeMs: number;
};

export type AnswerState = {
  accepted: boolean;
  answerIndex: number | null;
  answerValue?: number;
  currentStreak: number;
  isCorrect: boolean | null;
  pointsEarned: number;
  submitted: boolean;
};

const initialAnswerState: AnswerState = {
  accepted: false,
  answerIndex: null,
  answerValue: undefined,
  currentStreak: 0,
  isCorrect: null,
  pointsEarned: 0,
  submitted: false,
};

export function useLiveParticipantSocket({
  realtimeUrl,
  pin,
  participant,
  initialParticipants,
  initialSessionStatus,
}: {
  realtimeUrl: string;
  pin: string;
  participant: {
    avatar: string;
    currentStreak: number;
    id: string;
    nickname: string;
    participantToken: string;
    score: number;
    totalTimeMs: number;
  };
  initialParticipants: ParticipantListEntry[];
  initialSessionStatus: string;
}) {
  const [participants, setParticipants] =
    useState<ParticipantListEntry[]>(initialParticipants);
  const [connectedCount, setConnectedCount] = useState(
    initialParticipants.filter((p) => p.presenceStatus === "online").length,
  );
  const [sessionState, setSessionState] = useState<SessionStatePayload>({
    connectedParticipantsCount: initialParticipants.filter(
      (p) => p.presenceStatus === "online",
    ).length,
    countdownSeconds: initialSessionStatus === "countdown" ? 3 : null,
    hostRecoveryDeadlineAt: null,
    hostLastSeenAt: null,
    hostPresenceStatus: "offline",
    interruptionReason: null,
    lastEventAt: null,
    offlineParticipantsCount: initialParticipants.length,
    rejectedAnswersCount: 0,
    status: initialSessionStatus as SessionStatePayload["status"],
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
  const [playerCurrentStreak, setPlayerCurrentStreak] = useState(
    participant.currentStreak,
  );
  const [answerState, setAnswerState] =
    useState<AnswerState>(initialAnswerState);
  const [submissionStats, setSubmissionStats] = useState({
    submittedCount: 0,
    totalParticipants: initialParticipants.length,
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const wasDisconnectedRef = useRef(false);
  const previousLeaderboardRef = useRef<LeaderboardEntry[]>([]);
  const playerCurrentStreakRef = useRef(participant.currentStreak);

  useEffect(() => {
    playerCurrentStreakRef.current = playerCurrentStreak;
  }, [playerCurrentStreak]);

  useEffect(() => {
    // Keep the polling fallback: on some mobile networks/proxies the raw
    // WebSocket upgrade is blocked, and websocket-only would leave those
    // phones unable to connect (blank question screen for the whole game).
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket", "polling"],
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
      (payload: {
        connectedCount: number;
        participants: ParticipantListEntry[];
      }) => {
        setParticipants(payload.participants);
        setConnectedCount(payload.connectedCount);
        const self = payload.participants.find((p) => p.id === participant.id);
        if (self) {
          setPlayerCurrentStreak(self.currentStreak);
        }
        setSubmissionStats((s) => ({
          ...s,
          totalParticipants: payload.connectedCount,
        }));
      },
    );

    socket.on("session:state", (payload: SessionStatePayload) => {
      setSessionState(payload);
    });

    socket.on("session:countdown", (payload: { seconds: number }) => {
      setCurrentResult(null);
      setSessionState((s) => ({
        ...s,
        countdownSeconds: payload.seconds,
        interruptionReason: null,
        status: "countdown",
      }));
    });

    socket.on("session:started", () => {
      setCurrentResult(null);
      setFinalLeaderboard([]);
      setSessionState((s) => ({
        ...s,
        countdownSeconds: null,
        interruptionReason: null,
        status: "playing",
      }));
    });

    socket.on("session:question", (payload: { question: ActiveQuestion }) => {
      setCurrentQuestion(payload.question);
      setCurrentResult(null);
      setAnswerState(initialAnswerState);
      setSubmissionStats((s) => ({
        submittedCount: payload.question.submittedCount,
        totalParticipants: s.totalParticipants,
      }));
    });

    socket.on(
      "question:stats",
      (payload: { submittedCount: number; totalParticipants: number }) => {
        setSubmissionStats(payload);
      },
    );

    socket.on(
      "leaderboard:update",
      (payload: { entries: LeaderboardEntry[] }) => {
        const previousRanks = new Map(
          previousLeaderboardRef.current.map((e) => [e.id, e.rank]),
        );
        const deltas = payload.entries.reduce<Record<string, number>>(
          (acc, entry) => {
            const prev = previousRanks.get(entry.id);
            if (typeof prev === "number" && prev !== entry.rank) {
              acc[entry.id] = prev - entry.rank;
            }
            return acc;
          },
          {},
        );

        previousLeaderboardRef.current = payload.entries;
        setRankDeltaById(deltas);
        setLeaderboardVersion((v) => v + 1);
        const self = payload.entries.find((e) => e.id === participant.id);
        if (self) {
          setPlayerCurrentStreak(self.currentStreak);
        }
        setLeaderboard(payload.entries);
      },
    );

    socket.on("question:result", (payload: { result: QuestionResult }) => {
      setCurrentResult(payload.result);
      setLeaderboard(payload.result.leaderboard);
      setSessionState((s) => ({
        ...s,
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
        setSessionState((s) => ({
          ...s,
          countdownSeconds: null,
          interruptionReason: null,
          status: payload.status as SessionStatePayload["status"],
        }));
      },
    );

    socket.on(
      "answer:ack",
      (payload: {
        accepted: boolean;
        answerIndex?: number;
        answerValue?: number;
        currentStreak?: number;
        isCorrect?: boolean;
        pointsEarned?: number;
      }) => {
        if (!payload.accepted) return;

        setAnswerState({
          accepted: true,
          answerIndex: payload.answerIndex ?? null,
          answerValue: payload.answerValue,
          currentStreak:
            payload.currentStreak ?? playerCurrentStreakRef.current,
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

  useEffect(() => {
    if (sessionState.status !== "countdown" || !sessionState.countdownSeconds) {
      return;
    }

    const interval = window.setInterval(() => {
      setSessionState((s) => {
        if (s.status !== "countdown" || s.countdownSeconds === null) {
          window.clearInterval(interval);
          return s;
        }
        return {
          ...s,
          countdownSeconds: s.countdownSeconds > 1 ? s.countdownSeconds - 1 : 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [sessionState.countdownSeconds, sessionState.status]);

  return {
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
  };
}
