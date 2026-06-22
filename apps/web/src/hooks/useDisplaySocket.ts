"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type {
  ActiveQuestion,
  LeaderboardEntry,
  QuestionResult,
  SessionStatePayload,
} from "@/lib/socket-types";

type Participant = {
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
};

type QuestionStat = {
  correctCount: number;
  submittedCount: number;
};

export function useDisplaySocket({
  pin,
  realtimeUrl,
  initialParticipants,
}: {
  pin: string;
  realtimeUrl: string;
  initialParticipants: Participant[];
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [connectedCount, setConnectedCount] = useState(
    initialParticipants.filter((p) => p.presenceStatus === "online").length,
  );
  const [sessionState, setSessionState] = useState<SessionStatePayload>({
    connectedParticipantsCount: 0,
    countdownSeconds: null,
    hostRecoveryDeadlineAt: null,
    hostLastSeenAt: null,
    hostPresenceStatus: "offline",
    interruptionReason: null,
    lastEventAt: null,
    offlineParticipantsCount: 0,
    rejectedAnswersCount: 0,
    status: "waiting",
  });
  const [currentQuestion, setCurrentQuestion] =
    useState<ActiveQuestion | null>(null);
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(
    null,
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);

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

    socket.on("session:state", (payload: SessionStatePayload) => {
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
        setSessionState((s) => ({
          ...s,
          status: payload.status as SessionStatePayload["status"],
        }));
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

  return {
    connectedCount,
    currentQuestion,
    currentResult,
    leaderboard,
    participants,
    questionStats,
    remainingSeconds,
    sessionState,
    submittedCount,
  };
}
