import { createServer } from "node:http";
import { URL } from "node:url";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./env.js";
import { logger } from "./logger.js";

type SessionStatus =
  | "waiting"
  | "countdown"
  | "playing"
  | "question_result"
  | "interrupted"
  | "finished";

type InterruptionReason = "host_disconnected" | null;

type RoomParticipant = {
  avatar: string;
  connected: boolean;
  currentStreak: number;
  id: string;
  nickname: string;
  participantToken: string;
  score: number;
  socketId: string | null;
  totalTimeMs: number;
};

type SerializedParticipant = {
  avatar: string;
  currentStreak: number;
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
  score: number;
  totalTimeMs: number;
};

type RoomQuestion = {
  correctIndex: number;
  id: string;
  imageUrl: string | null;
  options: string[];
  orderIndex: number;
  persistable: boolean;
  pointsBase: number;
  prompt: string;
  timeLimitSeconds: number;
  type: "multiple_choice" | "true_false";
};

type RoomAnswer = {
  answerIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentMs: number;
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

type QuestionResultSnapshot = {
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

type SessionStatePayload = {
  connectedParticipantsCount: number;
  countdownSeconds: number | null;
  hostRecoveryDeadlineAt: number | null;
  hostLastSeenAt: number | null;
  hostPresenceStatus: "offline" | "online";
  interruptionReason: InterruptionReason;
  lastEventAt: number | null;
  offlineParticipantsCount: number;
  rejectedAnswersCount: number;
  status: SessionStatus;
};

type RoomState = {
  activeQuestionTimer: NodeJS.Timeout | null;
  answersByQuestion: Map<string, Map<string, RoomAnswer>>;
  cleanupTimer: NodeJS.Timeout | null;
  countdownSeconds: number | null;
  countdownTimer: NodeJS.Timeout | null;
  currentQuestionIndex: number | null;
  currentQuestionResult: QuestionResultSnapshot | null;
  hostDisconnectedAt: number | null;
  hostInterruptionTimer: NodeJS.Timeout | null;
  hostLastSeenAt: number | null;
  hostPresenceStatus: "offline" | "online";
  hostRecoveryDeadlineAt: number | null;
  hostSocketIds: Set<string>;
  interruptedFromStatus:
    | "waiting"
    | "countdown"
    | "playing"
    | "question_result"
    | null;
  interruptionReason: InterruptionReason;
  lastEventAt: number | null;
  participants: Map<string, RoomParticipant>;
  questionClosedAt: number | null;
  questionStartedAt: number | null;
  questions: RoomQuestion[];
  rejectedAnswersCount: number;
  sessionId: string | null;
  status: SessionStatus;
};

type StartSessionPayload = {
  pin?: string;
  questions?: RoomQuestion[];
  sessionId?: string;
};

type AdvanceSessionPayload = {
  pin?: string;
  sessionId?: string;
};

type TerminateSessionPayload = {
  pin?: string;
  sessionId?: string;
};

type PersistAnswerPayload = {
  answerIndex: number;
  currentStreak: number;
  isCorrect: boolean;
  participantToken: string;
  pin: string;
  pointsEarned: number;
  questionId: string;
  questionOrderIndex: number;
  sessionId: string;
  timeSpentMs: number;
};

type RecoverySnapshot = {
  countdownStartedAt: string | null;
  currentQuestionAnswers: Array<{
    answerIndex: number;
    isCorrect: boolean;
    participantToken: string;
    pointsEarned: number;
    timeSpentMs: number;
  }>;
  currentQuestionIndex: number | null;
  participants: Array<{
    avatar: string;
    currentStreak: number;
    id: string;
    nickname: string;
    participantToken: string;
    score: number;
    totalTimeMs: number;
  }>;
  pin: string;
  questionStartedAt: string | null;
  questions: RoomQuestion[];
  sessionId: string;
  status: SessionStatus;
};

const HOST_RECOVERY_GRACE_MS = 300_000;
const ANSWER_PERSIST_MAX_ATTEMPTS = 4;
const ROOM_CLEANUP_DELAY_MS = 30_000;

function createEmptyRoom(): RoomState {
  return {
    activeQuestionTimer: null,
    answersByQuestion: new Map(),
    cleanupTimer: null,
    countdownSeconds: null,
    countdownTimer: null,
    currentQuestionIndex: null,
    currentQuestionResult: null,
    hostDisconnectedAt: null,
    hostInterruptionTimer: null,
    hostLastSeenAt: null,
    hostPresenceStatus: "offline",
    hostRecoveryDeadlineAt: null,
    hostSocketIds: new Set(),
    interruptedFromStatus: null,
    interruptionReason: null,
    lastEventAt: null,
    participants: new Map(),
    questionClosedAt: null,
    questionStartedAt: null,
    questions: [],
    rejectedAnswersCount: 0,
    sessionId: null,
    status: "waiting",
  };
}

const liveRooms = new Map<string, RoomState>();
const pendingHydrations = new Map<string, Promise<RoomState>>();

function getOrCreateRoom(pin: string) {
  const existingRoom = liveRooms.get(pin);

  if (existingRoom) {
    return existingRoom;
  }

  const nextRoom = createEmptyRoom();
  liveRooms.set(pin, nextRoom);
  return nextRoom;
}

function markRoomEvent(room: RoomState) {
  room.lastEventAt = Date.now();
}

function clearQuestionTimer(room: RoomState) {
  if (room.activeQuestionTimer) {
    clearTimeout(room.activeQuestionTimer);
    room.activeQuestionTimer = null;
  }
}

function clearCountdownTimer(room: RoomState) {
  if (room.countdownTimer) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  }
}

function clearHostInterruptionTimer(room: RoomState) {
  if (room.hostInterruptionTimer) {
    clearTimeout(room.hostInterruptionTimer);
    room.hostInterruptionTimer = null;
  }
}

function clearRoomCleanupTimer(room: RoomState) {
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
}

function scheduleRoomCleanup(pin: string, room: RoomState) {
  clearRoomCleanupTimer(room);

  room.cleanupTimer = setTimeout(() => {
    const currentRoom = liveRooms.get(pin);

    if (currentRoom === room) {
      liveRooms.delete(pin);
      logger.info({ pin, sessionId: room.sessionId }, "room.cleaned_up");
    }
  }, ROOM_CLEANUP_DELAY_MS);
}

function serializeParticipants(room: RoomState) {
  return [...room.participants.values()]
    .map(
      (participant) =>
        ({
          avatar: participant.avatar,
          currentStreak: participant.currentStreak,
          id: participant.id,
          nickname: participant.nickname,
          presenceStatus: participant.connected ? "online" : "offline",
          score: participant.score,
          totalTimeMs: participant.totalTimeMs,
        }) satisfies SerializedParticipant,
    )
    .sort((left, right) => left.nickname.localeCompare(right.nickname));
}

function getCurrentQuestion(room: RoomState) {
  if (
    room.currentQuestionIndex === null ||
    room.currentQuestionIndex < 0 ||
    room.currentQuestionIndex >= room.questions.length
  ) {
    return null;
  }

  return room.questions[room.currentQuestionIndex] ?? null;
}

function getQuestionAnswerKey(question: RoomQuestion) {
  return `${question.orderIndex}:${question.id}`;
}

function getQuestionAnswers(room: RoomState, question: RoomQuestion) {
  return (
    room.answersByQuestion.get(getQuestionAnswerKey(question)) ?? new Map()
  );
}

function getConnectedParticipantCount(room: RoomState) {
  return [...room.participants.values()].filter(
    (participant) => participant.connected,
  ).length;
}

function getOfflineParticipantCount(room: RoomState) {
  return room.participants.size - getConnectedParticipantCount(room);
}

function buildLeaderboard(
  room: RoomState,
  question: RoomQuestion | null = getCurrentQuestion(room),
) {
  const questionAnswers = question ? getQuestionAnswers(room, question) : null;

  return [...room.participants.values()]
    .map((participant) => {
      const currentAnswer = questionAnswers?.get(participant.participantToken);

      return {
        answeredCurrentQuestion: Boolean(currentAnswer),
        avatar: participant.avatar,
        currentStreak: participant.currentStreak,
        id: participant.id,
        lastIsCorrect: currentAnswer?.isCorrect ?? null,
        lastPointsEarned: currentAnswer?.pointsEarned ?? 0,
        nickname: participant.nickname,
        rank: 0,
        score: participant.score,
        totalTimeMs: participant.totalTimeMs,
      } satisfies LeaderboardEntry;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.totalTimeMs !== right.totalTimeMs) {
        return left.totalTimeMs - right.totalTimeMs;
      }

      return left.nickname.localeCompare(right.nickname);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function serializeCurrentQuestion(room: RoomState) {
  const currentQuestion = getCurrentQuestion(room);

  if (!currentQuestion || room.questionStartedAt === null) {
    return null;
  }

  return {
    id: currentQuestion.id,
    imageUrl: currentQuestion.imageUrl,
    options: currentQuestion.options,
    orderIndex: currentQuestion.orderIndex,
    prompt: currentQuestion.prompt,
    startedAt: room.questionStartedAt,
    submittedCount: getQuestionAnswers(room, currentQuestion).size,
    timeLimitSeconds: currentQuestion.timeLimitSeconds,
    totalQuestions: room.questions.length,
    type: currentQuestion.type,
  };
}

function getQuestionStats(room: RoomState) {
  const currentQuestion = getCurrentQuestion(room);

  if (!currentQuestion) {
    return null;
  }

  return {
    questionId: currentQuestion.id,
    questionOrderIndex: currentQuestion.orderIndex,
    submittedCount: getQuestionAnswers(room, currentQuestion).size,
    totalParticipants: getConnectedParticipantCount(room),
  };
}

function buildQuestionResult(room: RoomState) {
  const currentQuestion = getCurrentQuestion(room);

  if (!currentQuestion) {
    return null;
  }

  const answers = getQuestionAnswers(room, currentQuestion);
  const leaderboard = buildLeaderboard(room, currentQuestion);
  const correctCount = [...answers.values()].filter(
    (answer) => answer.isCorrect,
  ).length;

  return {
    correctCount,
    correctOptionIndex: currentQuestion.correctIndex,
    imageUrl: currentQuestion.imageUrl,
    leaderboard,
    options: currentQuestion.options,
    prompt: currentQuestion.prompt,
    questionId: currentQuestion.id,
    questionOrderIndex: currentQuestion.orderIndex,
    submittedCount: answers.size,
    totalQuestions: room.questions.length,
  } satisfies QuestionResultSnapshot;
}

function buildSessionStatePayload(room: RoomState): SessionStatePayload {
  return {
    connectedParticipantsCount: getConnectedParticipantCount(room),
    countdownSeconds: room.countdownSeconds,
    hostRecoveryDeadlineAt: room.hostRecoveryDeadlineAt,
    hostLastSeenAt: room.hostLastSeenAt,
    hostPresenceStatus: room.hostPresenceStatus,
    interruptionReason: room.interruptionReason,
    lastEventAt: room.lastEventAt,
    offlineParticipantsCount: getOfflineParticipantCount(room),
    rejectedAnswersCount: room.rejectedAnswersCount,
    status: room.status,
  };
}

async function notifyWebOfStateChange(params: {
  pin: string;
  questionIndex?: number;
  sessionId: string;
  status: SessionStatus;
}) {
  try {
    await fetch(new URL("/api/internal/live/state", env.WEB_ORIGIN), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    logger.error({ error, ...params }, "Failed to notify web of state change");
  }
}

async function persistAnswer(payload: PersistAnswerPayload) {
  try {
    const response = await fetch(
      new URL("/api/internal/live/answer", env.WEB_ORIGIN),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(`persist_live_answer_failed:${response.status}`);
    }
  } catch (error) {
    logger.error({ error, payload }, "Failed to persist live answer");
    throw error;
  }
}

function queuePersistAnswer(payload: PersistAnswerPayload, attempt = 1) {
  void persistAnswer(payload).catch((error) => {
    if (attempt >= ANSWER_PERSIST_MAX_ATTEMPTS) {
      logger.error(
        { attempt, error, payload },
        "answer.persist_exhausted_retries",
      );
      return;
    }

    const delayMs = attempt * 1500;
    logger.warn(
      { attempt, delayMs, error, payload },
      "answer.persist_retry_scheduled",
    );

    setTimeout(() => {
      queuePersistAnswer(payload, attempt + 1);
    }, delayMs);
  });
}

async function fetchRecoverySnapshot(params: {
  pin: string;
  sessionId?: string;
}) {
  try {
    const url = new URL("/api/internal/live/session", env.WEB_ORIGIN);
    url.searchParams.set("pin", params.pin);

    if (params.sessionId) {
      url.searchParams.set("sessionId", params.sessionId);
    }

    const response = await fetch(url, {
      headers: {
        "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
      },
    });

    if (!response.ok) {
      logger.warn(
        {
          pin: params.pin,
          sessionId: params.sessionId,
          status: response.status,
        },
        "session.snapshot_unavailable",
      );
      return null;
    }

    return (await response.json()) as RecoverySnapshot;
  } catch (error) {
    logger.error(
      {
        error,
        pin: params.pin,
        sessionId: params.sessionId,
      },
      "session.snapshot_fetch_failed",
    );
    return null;
  }
}

async function parseJsonBody<T>(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function populateRoomParticipantsFromSnapshot(
  room: RoomState,
  participants: RecoverySnapshot["participants"],
) {
  const previousParticipants = room.participants;
  const nextParticipants = new Map<string, RoomParticipant>();

  for (const participant of participants) {
    const previousParticipant = previousParticipants.get(
      participant.participantToken,
    );

    nextParticipants.set(participant.participantToken, {
      avatar: previousParticipant?.avatar ?? participant.avatar,
      connected: previousParticipant?.connected ?? false,
      currentStreak: participant.currentStreak,
      id: participant.id,
      nickname: participant.nickname,
      participantToken: participant.participantToken,
      score: participant.score,
      socketId: previousParticipant?.socketId ?? null,
      totalTimeMs: participant.totalTimeMs,
    });
  }

  room.participants = nextParticipants;
}

function populateCurrentQuestionAnswersFromSnapshot(
  room: RoomState,
  snapshot: RecoverySnapshot,
) {
  room.answersByQuestion = new Map();

  if (snapshot.currentQuestionIndex === null) {
    return;
  }

  const currentQuestion = snapshot.questions[snapshot.currentQuestionIndex];

  if (!currentQuestion) {
    return;
  }

  room.currentQuestionIndex = snapshot.currentQuestionIndex;
  room.answersByQuestion.set(
    getQuestionAnswerKey(currentQuestion),
    new Map(
      snapshot.currentQuestionAnswers.map((answer) => [
        answer.participantToken,
        {
          answerIndex: answer.answerIndex,
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned,
          timeSpentMs: answer.timeSpentMs,
        } satisfies RoomAnswer,
      ]),
    ),
  );
}

function scheduleRecoveredQuestionTimer(
  io: Server,
  pin: string,
  room: RoomState,
) {
  const currentQuestion = getCurrentQuestion(room);

  if (!currentQuestion || room.questionStartedAt === null || !room.sessionId) {
    return;
  }

  const remainingMs =
    room.questionStartedAt +
    currentQuestion.timeLimitSeconds * 1000 -
    Date.now();

  if (remainingMs <= 0) {
    if (closeQuestion(io, { pin, room })) {
      void notifyWebOfStateChange({
        pin,
        questionIndex: room.currentQuestionIndex ?? undefined,
        sessionId: room.sessionId,
        status: "question_result",
      });
    }

    return;
  }

  room.activeQuestionTimer = setTimeout(() => {
    const currentRoom = getOrCreateRoom(pin);

    if (
      currentRoom.sessionId &&
      closeQuestion(io, { pin, room: currentRoom })
    ) {
      void notifyWebOfStateChange({
        pin,
        questionIndex: currentRoom.currentQuestionIndex ?? undefined,
        sessionId: currentRoom.sessionId,
        status: "question_result",
      });
    }
  }, remainingMs);
}

function scheduleRecoveredCountdown(
  io: Server,
  params: {
    pin: string;
    room: RoomState;
    startedAtMs: number;
  },
) {
  const { pin, room, startedAtMs } = params;

  if (!room.sessionId) {
    return;
  }

  const remainingMs = startedAtMs + 3000 - Date.now();

  if (remainingMs <= 0) {
    const started = startQuestion(io, {
      pin,
      questionIndex: 0,
      room,
    });

    if (started && room.sessionId) {
      void notifyWebOfStateChange({
        pin,
        questionIndex: 0,
        sessionId: room.sessionId,
        status: "playing",
      });
    }

    return;
  }

  room.countdownSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  room.countdownTimer = setTimeout(() => {
    const currentRoom = getOrCreateRoom(pin);
    const started = startQuestion(io, {
      pin,
      questionIndex: 0,
      room: currentRoom,
    });

    if (started && currentRoom.sessionId) {
      void notifyWebOfStateChange({
        pin,
        questionIndex: 0,
        sessionId: currentRoom.sessionId,
        status: "playing",
      });
    }
  }, remainingMs);
}

function hydrateRoomFromSnapshot(
  io: Server,
  params: {
    pin: string;
    room: RoomState;
    snapshot: RecoverySnapshot;
  },
) {
  const { pin, room, snapshot } = params;

  clearQuestionTimer(room);
  clearCountdownTimer(room);
  clearHostInterruptionTimer(room);
  clearRoomCleanupTimer(room);

  room.sessionId = snapshot.sessionId;
  room.questions = snapshot.questions;
  room.status = snapshot.status;
  room.currentQuestionIndex = snapshot.currentQuestionIndex;
  room.currentQuestionResult = null;
  room.questionClosedAt = null;
  room.questionStartedAt = null;
  room.interruptedFromStatus = null;
  room.interruptionReason = null;
  room.countdownSeconds = null;
  room.hostRecoveryDeadlineAt = null;
  room.rejectedAnswersCount = 0;
  populateRoomParticipantsFromSnapshot(room, snapshot.participants);
  populateCurrentQuestionAnswersFromSnapshot(room, snapshot);

  if (snapshot.status === "countdown" && snapshot.countdownStartedAt) {
    const startedAtMs = Date.parse(snapshot.countdownStartedAt);

    if (!Number.isNaN(startedAtMs)) {
      scheduleRecoveredCountdown(io, {
        pin,
        room,
        startedAtMs,
      });
    } else {
      room.status = "waiting";
    }
  }

  if (snapshot.currentQuestionIndex !== null && snapshot.questionStartedAt) {
    const startedAtMs = Date.parse(snapshot.questionStartedAt);

    if (!Number.isNaN(startedAtMs)) {
      room.questionStartedAt = startedAtMs;
      room.questionClosedAt = null;

      if (snapshot.status === "playing") {
        scheduleRecoveredQuestionTimer(io, pin, room);
      } else if (
        snapshot.status === "question_result" ||
        snapshot.status === "interrupted"
      ) {
        room.questionStartedAt = null;
        room.questionClosedAt = Date.now();
        room.currentQuestionResult = buildQuestionResult(room);
      }
    }
  }

  markRoomEvent(room);
}

async function ensureRoomHydrated(
  io: Server,
  params: {
    pin: string;
    room: RoomState;
    sessionId?: string;
  },
): Promise<RoomState> {
  const { pin, room, sessionId } = params;

  if (room.questions.length > 0 && room.sessionId) {
    clearRoomCleanupTimer(room);
    return room;
  }

  let promise = pendingHydrations.get(pin);
  if (!promise) {
    promise = (async () => {
      try {
        const snapshot = await fetchRecoverySnapshot({ pin, sessionId });
        if (snapshot) {
          hydrateRoomFromSnapshot(io, {
            pin,
            room,
            snapshot,
          });
        }
      } catch (err) {
        logger.error({ err, pin }, "Failed to hydrate room from snapshot");
      } finally {
        pendingHydrations.delete(pin);
      }
      return room;
    })();
    pendingHydrations.set(pin, promise);
  }

  return promise;
}

function emitRoomSnapshot(io: Server, pin: string, room: RoomState) {
  const leaderboard = buildLeaderboard(room);
  const participants = serializeParticipants(room);
  const connectedCount = getConnectedParticipantCount(room);

  io.to(pin).emit("participant:list", {
    connectedCount,
    participants,
  });
  io.to(pin).emit("session:state", buildSessionStatePayload(room));
  io.to(pin).emit("leaderboard:update", {
    entries: leaderboard,
  });

  if (room.status === "playing") {
    const currentQuestion = serializeCurrentQuestion(room);
    if (currentQuestion) {
      io.to(pin).emit("session:question", {
        question: currentQuestion,
      });
    }

    const questionStats = getQuestionStats(room);
    if (questionStats) {
      io.to(pin).emit("question:stats", questionStats);
    }
  }

  if (room.status === "question_result" && room.currentQuestionResult) {
    io.to(pin).emit("question:result", {
      result: room.currentQuestionResult,
    });
  }

  if (room.status === "finished") {
    io.to(pin).emit("session:final", {
      leaderboard,
      status: "finished",
      totalQuestions: room.questions.length,
    });
  }
}

function computePoints(params: {
  currentStreak: number;
  isCorrect: boolean;
  pointsBase: number;
  timeLimitSeconds: number;
  timeSpentMs: number;
}) {
  if (!params.isCorrect) {
    return 0;
  }

  const totalMs = Math.max(1, params.timeLimitSeconds * 1000);
  const speedFactor = Math.max(0.5, 1 - (params.timeSpentMs / totalMs) * 0.5);
  const streakMultiplier = Math.min(1.5, 1 + params.currentStreak * 0.1);
  return Math.round(params.pointsBase * speedFactor * streakMultiplier);
}

function finishSession(io: Server, params: { pin: string; room: RoomState }) {
  const { pin, room } = params;

  clearQuestionTimer(room);
  clearCountdownTimer(room);
  clearHostInterruptionTimer(room);

  room.status = "finished";
  room.countdownSeconds = null;
  room.currentQuestionIndex = null;
  room.questionStartedAt = null;
  room.questionClosedAt = Date.now();
  room.currentQuestionResult = null;
  room.hostRecoveryDeadlineAt = null;
  room.interruptedFromStatus = null;
  room.interruptionReason = null;
  markRoomEvent(room);

  const leaderboard = buildLeaderboard(room);

  io.to(pin).emit("session:state", buildSessionStatePayload(room));
  io.to(pin).emit("leaderboard:update", {
    entries: leaderboard,
  });
  io.to(pin).emit("session:final", {
    leaderboard,
    status: "finished",
    totalQuestions: room.questions.length,
  });
  io.to(pin).emit("session:finished", {
    leaderboard,
    status: "finished",
  });

  scheduleRoomCleanup(pin, room);
}

function closeQuestion(io: Server, params: { pin: string; room: RoomState }) {
  const { pin, room } = params;
  const currentQuestion = getCurrentQuestion(room);

  if (!currentQuestion || room.status !== "playing") {
    return false;
  }

  clearQuestionTimer(room);

  const result = buildQuestionResult(room);

  if (!result) {
    return false;
  }

  room.status = "question_result";
  room.countdownSeconds = null;
  room.questionClosedAt = Date.now();
  room.questionStartedAt = null;
  room.currentQuestionResult = result;
  room.hostRecoveryDeadlineAt = null;
  room.interruptedFromStatus = null;
  room.interruptionReason = null;
  markRoomEvent(room);

  io.to(pin).emit("session:state", buildSessionStatePayload(room));
  io.to(pin).emit("question:closed", {
    questionId: currentQuestion.id,
    questionOrderIndex: currentQuestion.orderIndex,
  });
  io.to(pin).emit("question:result", {
    result,
  });
  io.to(pin).emit("leaderboard:update", {
    entries: result.leaderboard,
  });

  return true;
}

function interruptRoom(io: Server, params: { pin: string; room: RoomState }) {
  const { pin, room } = params;

  if (room.status === "finished" || room.status === "interrupted") {
    return;
  }

  const previousStatus = room.status;
  room.interruptedFromStatus = previousStatus;
  room.status = "interrupted";
  room.interruptionReason = "host_disconnected";
  room.hostRecoveryDeadlineAt = null;
  room.countdownSeconds = null;
  room.questionStartedAt = null;
  room.questionClosedAt = Date.now();
  clearCountdownTimer(room);
  clearQuestionTimer(room);
  markRoomEvent(room);

  logger.warn(
    {
      pin,
      previousStatus,
      sessionId: room.sessionId,
    },
    "session.interrupted",
  );

  emitRoomSnapshot(io, pin, room);

  if (room.sessionId) {
    void notifyWebOfStateChange({
      pin,
      questionIndex: room.currentQuestionIndex ?? undefined,
      sessionId: room.sessionId,
      status: "interrupted",
    });
  }

  scheduleRoomCleanup(pin, room);
}

function resumeInterruptedRoom(
  io: Server,
  params: {
    pin: string;
    room: RoomState;
  },
) {
  const { pin, room } = params;

  if (room.status !== "interrupted") {
    return;
  }

  const previousStatus = room.interruptedFromStatus ?? "waiting";

  room.interruptedFromStatus = null;
  room.interruptionReason = null;
  room.hostRecoveryDeadlineAt = null;

  if (previousStatus === "playing") {
    const result = buildQuestionResult(room);
    room.status = result ? "question_result" : "waiting";
    room.currentQuestionResult = result;
    room.questionClosedAt = Date.now();
    room.questionStartedAt = null;
  } else if (previousStatus === "countdown") {
    room.status = "waiting";
    room.currentQuestionIndex = null;
    room.currentQuestionResult = null;
    room.questionClosedAt = null;
    room.questionStartedAt = null;
  } else {
    room.status = previousStatus;
  }

  markRoomEvent(room);

  logger.info(
    {
      pin,
      resumedStatus: room.status,
      sessionId: room.sessionId,
    },
    "session.resumed",
  );

  emitRoomSnapshot(io, pin, room);

  if (room.sessionId) {
    void notifyWebOfStateChange({
      pin,
      questionIndex: room.currentQuestionIndex ?? undefined,
      sessionId: room.sessionId,
      status: room.status,
    });
  }
}

function scheduleHostInterruption(io: Server, pin: string, room: RoomState) {
  clearHostInterruptionTimer(room);
  room.hostRecoveryDeadlineAt = Date.now() + HOST_RECOVERY_GRACE_MS;
  markRoomEvent(room);
  emitRoomSnapshot(io, pin, room);

  room.hostInterruptionTimer = setTimeout(() => {
    const currentRoom = getOrCreateRoom(pin);

    if (currentRoom.hostSocketIds.size === 0) {
      interruptRoom(io, { pin, room: currentRoom });
    }
  }, HOST_RECOVERY_GRACE_MS);
}

function startQuestion(
  io: Server,
  params: {
    pin: string;
    questionIndex: number;
    room: RoomState;
  },
) {
  const { pin, questionIndex, room } = params;
  const question = room.questions[questionIndex];

  if (!question) {
    return false;
  }

  clearQuestionTimer(room);
  clearCountdownTimer(room);

  room.status = "playing";
  room.countdownSeconds = null;
  room.currentQuestionIndex = questionIndex;
  room.currentQuestionResult = null;
  room.hostRecoveryDeadlineAt = null;
  room.questionClosedAt = null;
  room.questionStartedAt = Date.now();
  room.interruptedFromStatus = null;
  room.interruptionReason = null;
  markRoomEvent(room);

  const answerKey = getQuestionAnswerKey(question);
  if (!room.answersByQuestion.has(answerKey)) {
    room.answersByQuestion.set(answerKey, new Map());
  }

  io.to(pin).emit("session:state", buildSessionStatePayload(room));
  io.to(pin).emit("session:started", {
    questionIndex,
    status: room.status,
  });
  io.to(pin).emit("session:question", {
    question: serializeCurrentQuestion(room),
  });
  io.to(pin).emit("question:stats", {
    questionId: question.id,
    questionOrderIndex: question.orderIndex,
    submittedCount: getQuestionAnswers(room, question).size,
    totalParticipants: getConnectedParticipantCount(room),
  });
  io.to(pin).emit("leaderboard:update", {
    entries: buildLeaderboard(room, question),
  });

  room.activeQuestionTimer = setTimeout(() => {
    const currentRoom = getOrCreateRoom(pin);

    if (
      currentRoom.sessionId &&
      closeQuestion(io, { pin, room: currentRoom })
    ) {
      void notifyWebOfStateChange({
        pin,
        questionIndex,
        sessionId: currentRoom.sessionId,
        status: "question_result",
      });
    }
  }, question.timeLimitSeconds * 1000);

  return true;
}

function rejectAnswer(
  io: Server,
  params: {
    pin: string;
    reason:
      | "duplicate_answer"
      | "invalid_payload"
      | "participant_not_in_session"
      | "question_closed"
      | "session_interrupted";
    room: RoomState;
    socket: import("socket.io").Socket;
    meta?: Record<string, string | number | null | undefined>;
  },
) {
  const { pin, reason, room, socket, meta } = params;

  room.rejectedAnswersCount += 1;
  markRoomEvent(room);

  socket.emit("answer:ack", {
    accepted: false,
    reason,
  });

  io.to(pin).emit("session:state", buildSessionStatePayload(room));

  logger.warn(
    {
      ...meta,
      pin,
      reason,
      sessionId: room.sessionId,
      socketId: socket.id,
    },
    "answer.rejected",
  );
}

const httpServer = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "quizzy-realtime" }));
    return;
  }

  if (
    request.method === "POST" &&
    request.url === "/internal/session/terminate" &&
    request.headers["x-quizzy-internal-token"] === env.REALTIME_INTERNAL_TOKEN
  ) {
    try {
      const body = await parseJsonBody<TerminateSessionPayload>(request);
      const pin = body?.pin?.trim();
      const sessionId = body?.sessionId?.trim();

      if (!pin || !sessionId) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_payload" }));
        return;
      }

      const room = liveRooms.get(pin);

      if (!room || room.sessionId !== sessionId) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, roomPresent: false }));
        return;
      }

      finishSession(io, { pin, room });
      liveRooms.delete(pin);
      logger.info({ pin, sessionId }, "room.terminated");

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, roomPresent: true }));
      return;
    } catch (error) {
      logger.error({ error }, "Failed to terminate session");
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "internal_error" }));
      return;
    }
  }

  if (
    request.method === "POST" &&
    request.url === "/internal/session/start" &&
    request.headers["x-quizzy-internal-token"] === env.REALTIME_INTERNAL_TOKEN
  ) {
    try {
      const body = await parseJsonBody<StartSessionPayload>(request);
      const pin = body?.pin?.trim();
      const sessionId = body?.sessionId?.trim();
      const questions = Array.isArray(body?.questions) ? body.questions : [];

      if (!pin || !sessionId || questions.length === 0) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_payload" }));
        return;
      }

      const room = getOrCreateRoom(pin);
      clearQuestionTimer(room);
      clearCountdownTimer(room);
      clearHostInterruptionTimer(room);
      clearRoomCleanupTimer(room);
      room.sessionId = sessionId;
      room.questions = questions;
      room.answersByQuestion = new Map();
      room.status = "countdown";
      room.countdownSeconds = 3;
      room.currentQuestionIndex = null;
      room.currentQuestionResult = null;
      room.hostRecoveryDeadlineAt = null;
      room.questionClosedAt = null;
      room.questionStartedAt = null;
      room.interruptedFromStatus = null;
      room.interruptionReason = null;
      room.rejectedAnswersCount = 0;
      markRoomEvent(room);

      io.to(pin).emit("session:state", buildSessionStatePayload(room));
      io.to(pin).emit("session:countdown", { seconds: 3 });

      void notifyWebOfStateChange({
        pin,
        questionIndex: 0,
        sessionId,
        status: "countdown",
      });

      room.countdownTimer = setTimeout(() => {
        const currentRoom = getOrCreateRoom(pin);
        const started = startQuestion(io, {
          pin,
          questionIndex: 0,
          room: currentRoom,
        });

        if (started && currentRoom.sessionId) {
          void notifyWebOfStateChange({
            pin,
            questionIndex: 0,
            sessionId: currentRoom.sessionId,
            status: "playing",
          });
        }
      }, 3000);

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    } catch (error) {
      logger.error({ error }, "Failed to start session");
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "internal_error" }));
      return;
    }
  }

  if (
    request.method === "POST" &&
    request.url === "/internal/session/next" &&
    request.headers["x-quizzy-internal-token"] === env.REALTIME_INTERNAL_TOKEN
  ) {
    try {
      const body = await parseJsonBody<AdvanceSessionPayload>(request);
      const pin = body?.pin?.trim();
      const sessionId = body?.sessionId?.trim();

      if (!pin || !sessionId) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_payload" }));
        return;
      }

      const room = await ensureRoomHydrated(io, {
        pin,
        room: getOrCreateRoom(pin),
        sessionId,
      });
      if (room.sessionId !== sessionId || room.questions.length === 0) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "session_not_ready" }));
        return;
      }

      if (room.status === "interrupted") {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "session_interrupted" }));
        return;
      }

      if (room.status === "playing") {
        if (!closeQuestion(io, { pin, room })) {
          response.writeHead(409, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "question_not_active" }));
          return;
        }

        void notifyWebOfStateChange({
          pin,
          questionIndex: room.currentQuestionIndex ?? 0,
          sessionId,
          status: "question_result",
        });

        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, status: "question_result" }));
        return;
      }

      if (room.status === "question_result") {
        const nextQuestionIndex =
          room.currentQuestionIndex === null
            ? 0
            : room.currentQuestionIndex + 1;

        if (nextQuestionIndex >= room.questions.length) {
          finishSession(io, { pin, room });
          void notifyWebOfStateChange({
            pin,
            questionIndex: room.questions.length,
            sessionId,
            status: "finished",
          });
        } else {
          startQuestion(io, {
            pin,
            questionIndex: nextQuestionIndex,
            room,
          });

          void notifyWebOfStateChange({
            pin,
            questionIndex: nextQuestionIndex,
            sessionId,
            status: "playing",
          });
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, status: room.status }));
        return;
      }

      response.writeHead(409, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "invalid_state" }));
      return;
    } catch (error) {
      logger.error({ error }, "Failed to advance session");
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "internal_error" }));
      return;
    }
  }

  if (
    request.method === "POST" &&
    request.url === "/internal/session/skip" &&
    request.headers["x-quizzy-internal-token"] === env.REALTIME_INTERNAL_TOKEN
  ) {
    try {
      const body = await parseJsonBody<AdvanceSessionPayload>(request);
      const pin = body?.pin?.trim();
      const sessionId = body?.sessionId?.trim();

      if (!pin || !sessionId) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_payload" }));
        return;
      }

      const room = await ensureRoomHydrated(io, {
        pin,
        room: getOrCreateRoom(pin),
        sessionId,
      });

      if (
        room.sessionId !== sessionId ||
        room.questions.length === 0 ||
        room.status !== "playing"
      ) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "question_not_active" }));
        return;
      }

      clearQuestionTimer(room);
      const skippedQuestionIndex = room.currentQuestionIndex ?? 0;
      const nextQuestionIndex = skippedQuestionIndex + 1;

      io.to(pin).emit("question:closed", {
        questionId: room.questions[skippedQuestionIndex]?.id,
        questionOrderIndex:
          room.questions[skippedQuestionIndex]?.orderIndex ??
          skippedQuestionIndex,
        skipped: true,
      });

      if (nextQuestionIndex >= room.questions.length) {
        finishSession(io, { pin, room });
        void notifyWebOfStateChange({
          pin,
          questionIndex: room.questions.length,
          sessionId,
          status: "finished",
        });
      } else {
        startQuestion(io, {
          pin,
          questionIndex: nextQuestionIndex,
          room,
        });
        void notifyWebOfStateChange({
          pin,
          questionIndex: nextQuestionIndex,
          sessionId,
          status: "playing",
        });
      }

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, status: room.status }));
      return;
    } catch (error) {
      logger.error({ error }, "Failed to skip question");
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "internal_error" }));
      return;
    }
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

const io = new Server(httpServer, {
  cors: {
    methods: ["GET", "POST"],
    origin: env.WEB_ORIGIN,
  },
});

if (env.REDIS_URL) {
  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  pubClient.on("error", (error) => {
    logger.error({ error }, "Redis pub client error");
  });

  subClient.on("error", (error) => {
    logger.error({ error }, "Redis sub client error");
  });
} else {
  logger.warn(
    "REDIS_URL is not configured; running Socket.io without Redis adapter",
  );
}

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  socket.emit("system.ready", {
    serverTime: new Date().toISOString(),
    socketId: socket.id,
  });

  socket.on(
    "session:join",
    async (payload: {
      avatar?: string;
      currentStreak?: number;
      nickname?: string;
      participantId?: string;
      participantToken?: string;
      pin?: string;
      role?: "participant" | "host";
      score?: number;
      totalTimeMs?: number;
    }) => {
      const pin = payload.pin?.trim();
      const participantToken = payload.participantToken?.trim();
      const nickname = payload.nickname?.trim();

      if (!pin || !participantToken || !nickname) {
        return;
      }

      const room = await ensureRoomHydrated(io, {
        pin,
        room: getOrCreateRoom(pin),
      });
      clearRoomCleanupTimer(room);
      const previousParticipant = room.participants.get(participantToken);
      room.participants.set(participantToken, {
        avatar: payload.avatar?.trim() || previousParticipant?.avatar || "live",
        connected: true,
        currentStreak:
          previousParticipant?.currentStreak ?? payload.currentStreak ?? 0,
        id:
          payload.participantId?.trim() ||
          previousParticipant?.id ||
          participantToken,
        nickname,
        participantToken,
        score: previousParticipant?.score ?? payload.score ?? 0,
        socketId: socket.id,
        totalTimeMs:
          previousParticipant?.totalTimeMs ?? payload.totalTimeMs ?? 0,
      });

      socket.data.pin = pin;
      socket.data.participantToken = participantToken;
      socket.data.role = "participant";
      socket.join(pin);
      markRoomEvent(room);

      emitRoomSnapshot(io, pin, room);

      if (room.status === "playing") {
        const currentQuestion = getCurrentQuestion(room);

        if (currentQuestion) {
          const answer = getQuestionAnswers(room, currentQuestion).get(
            participantToken,
          );

          if (answer) {
            socket.emit("answer:ack", {
              accepted: true,
              answerIndex: answer.answerIndex,
              currentStreak:
                room.participants.get(participantToken)?.currentStreak ?? 0,
              isCorrect: answer.isCorrect,
              pointsEarned: answer.pointsEarned,
            });
          }
        }
      }
    },
  );

  socket.on("display:watch", async (payload: { pin?: string }) => {
    const pin = payload.pin?.trim();
    if (!pin) return;
    await socket.join(pin);
    const room = await ensureRoomHydrated(io, {
      pin,
      room: getOrCreateRoom(pin),
    });
    socket.emit("participant:list", {
      connectedCount: getConnectedParticipantCount(room),
      participants: serializeParticipants(room),
    });
    socket.emit("session:state", buildSessionStatePayload(room));
    socket.emit("leaderboard:update", { entries: buildLeaderboard(room) });
    if (room.status === "playing") {
      const currentQuestion = serializeCurrentQuestion(room);
      if (currentQuestion) {
        socket.emit("session:question", { question: currentQuestion });
      }
      const questionStats = getQuestionStats(room);
      if (questionStats) {
        socket.emit("question:stats", questionStats);
      }
    }
    if (room.status === "question_result" && room.currentQuestionResult) {
      socket.emit("question:result", { result: room.currentQuestionResult });
    }
  });

  socket.on(
    "host:watch",
    async (payload: { pin?: string; sessionId?: string }) => {
      const pin = payload.pin?.trim();
      const sessionId = payload.sessionId?.trim();

      if (!pin) {
        return;
      }

      const room = await ensureRoomHydrated(io, {
        pin,
        room: getOrCreateRoom(pin),
        sessionId,
      });
      clearRoomCleanupTimer(room);
      if (sessionId && !room.sessionId) {
        room.sessionId = sessionId;
      }

      const hostWasOffline = room.hostSocketIds.size === 0;

      room.hostSocketIds.add(socket.id);
      room.hostPresenceStatus = "online";
      room.hostLastSeenAt = Date.now();
      room.hostDisconnectedAt = null;
      room.hostRecoveryDeadlineAt = null;
      clearHostInterruptionTimer(room);
      markRoomEvent(room);

      socket.data.pin = pin;
      socket.data.role = "host";
      socket.join(pin);

      if (room.status === "interrupted") {
        resumeInterruptedRoom(io, { pin, room });
      } else {
        emitRoomSnapshot(io, pin, room);
      }

      if (hostWasOffline) {
        logger.info(
          {
            pin,
            sessionId: room.sessionId,
            socketId: socket.id,
          },
          "host.reconnected",
        );
      }
    },
  );

  socket.on(
    "answer:submit",
    async (payload: {
      answerIndex?: number;
      participantToken?: string;
      pin?: string;
      questionId?: string;
    }) => {
      const pin = payload.pin?.trim();
      const participantToken = payload.participantToken?.trim();
      const questionId = payload.questionId?.trim();
      const answerIndex = payload.answerIndex;

      if (
        !pin ||
        !participantToken ||
        !questionId ||
        typeof answerIndex !== "number"
      ) {
        const room = pin ? getOrCreateRoom(pin) : createEmptyRoom();
        rejectAnswer(io, {
          pin: pin ?? "unknown",
          reason: "invalid_payload",
          room,
          socket,
        });
        return;
      }

      const room = await ensureRoomHydrated(io, {
        pin,
        room: getOrCreateRoom(pin),
      });
      const currentQuestion = getCurrentQuestion(room);
      const participant = room.participants.get(participantToken);

      if (!participant) {
        rejectAnswer(io, {
          pin,
          reason: "participant_not_in_session",
          room,
          socket,
          meta: {
            participantToken,
            questionId,
          },
        });
        return;
      }

      if (room.status === "interrupted") {
        rejectAnswer(io, {
          pin,
          reason: "session_interrupted",
          room,
          socket,
          meta: {
            participantId: participant.id,
            questionId,
          },
        });
        return;
      }

      if (
        room.status !== "playing" ||
        !currentQuestion ||
        room.questionStartedAt === null ||
        currentQuestion.id !== questionId
      ) {
        rejectAnswer(io, {
          pin,
          reason: "question_closed",
          room,
          socket,
          meta: {
            participantId: participant.id,
            questionId,
          },
        });
        return;
      }

      const answerKey = getQuestionAnswerKey(currentQuestion);
      const questionAnswers =
        room.answersByQuestion.get(answerKey) ?? new Map<string, RoomAnswer>();

      if (questionAnswers.has(participantToken)) {
        rejectAnswer(io, {
          pin,
          reason: "duplicate_answer",
          room,
          socket,
          meta: {
            participantId: participant.id,
            questionId,
          },
        });
        return;
      }

      const timeSpentMs = Math.max(0, Date.now() - room.questionStartedAt);
      const questionTimeLimitMs = currentQuestion.timeLimitSeconds * 1000;

      if (timeSpentMs > questionTimeLimitMs) {
        rejectAnswer(io, {
          pin,
          reason: "question_closed",
          room,
          socket,
          meta: {
            participantId: participant.id,
            questionId,
          },
        });
        return;
      }

      const isCorrect = currentQuestion.correctIndex === answerIndex;
      const nextStreak = isCorrect ? participant.currentStreak + 1 : 0;
      const pointsEarned = computePoints({
        currentStreak: participant.currentStreak,
        isCorrect,
        pointsBase: currentQuestion.pointsBase,
        timeLimitSeconds: currentQuestion.timeLimitSeconds,
        timeSpentMs,
      });

      questionAnswers.set(participantToken, {
        answerIndex,
        isCorrect,
        pointsEarned,
        timeSpentMs,
      });
      room.answersByQuestion.set(answerKey, questionAnswers);

      participant.currentStreak = nextStreak;
      participant.score += pointsEarned;
      participant.totalTimeMs += timeSpentMs;
      room.participants.set(participantToken, participant);
      markRoomEvent(room);

      socket.emit("answer:ack", {
        accepted: true,
        answerIndex,
        currentStreak: nextStreak,
        isCorrect,
        pointsEarned,
      });

      io.to(pin).emit("participant:list", {
        connectedCount: getConnectedParticipantCount(room),
        participants: serializeParticipants(room),
      });
      const connectedCount = getConnectedParticipantCount(room);
      io.to(pin).emit("question:stats", {
        questionId: currentQuestion.id,
        questionOrderIndex: currentQuestion.orderIndex,
        submittedCount: questionAnswers.size,
        totalParticipants: connectedCount,
      });
      io.to(pin).emit("leaderboard:update", {
        entries: buildLeaderboard(room, currentQuestion),
      });
      io.to(pin).emit("session:state", buildSessionStatePayload(room));

      logger.info(
        {
          answerIndex,
          isCorrect,
          participantId: participant.id,
          pin,
          pointsEarned,
          questionId: currentQuestion.id,
          sessionId: room.sessionId,
          timeSpentMs,
        },
        "answer.accepted",
      );

      if (
        connectedCount > 0 &&
        questionAnswers.size >= connectedCount &&
        room.status === "playing"
      ) {
        if (closeQuestion(io, { pin, room }) && room.sessionId) {
          void notifyWebOfStateChange({
            pin,
            questionIndex: room.currentQuestionIndex ?? 0,
            sessionId: room.sessionId,
            status: "question_result",
          });
        }
      }

      if (room.sessionId) {
        queuePersistAnswer({
          answerIndex,
          currentStreak: nextStreak,
          isCorrect,
          participantToken,
          pin,
          pointsEarned,
          questionId: currentQuestion.id,
          questionOrderIndex: currentQuestion.orderIndex,
          sessionId: room.sessionId,
          timeSpentMs,
        });
      }
    },
  );

  socket.on("disconnect", () => {
    const pin = socket.data.pin as string | undefined;
    const participantToken = socket.data.participantToken as string | undefined;
    const role = socket.data.role as string | undefined;

    if (pin && participantToken && role === "participant") {
      const room = getOrCreateRoom(pin);
      const participant = room.participants.get(participantToken);

      if (participant) {
        room.participants.set(participantToken, {
          ...participant,
          connected: false,
          socketId: null,
        });
        markRoomEvent(room);

        io.to(pin).emit("participant:list", {
          connectedCount: getConnectedParticipantCount(room),
          participants: serializeParticipants(room),
        });
        io.to(pin).emit("session:state", buildSessionStatePayload(room));
      }
    }

    if (pin && role === "host") {
      const room = getOrCreateRoom(pin);
      room.hostSocketIds.delete(socket.id);

      if (room.hostSocketIds.size === 0) {
        room.hostPresenceStatus = "offline";
        room.hostDisconnectedAt = Date.now();
        room.hostLastSeenAt = room.hostDisconnectedAt;
        markRoomEvent(room);
        scheduleHostInterruption(io, pin, room);
        emitRoomSnapshot(io, pin, room);

        logger.warn(
          {
            pin,
            sessionId: room.sessionId,
            socketId: socket.id,
          },
          "host.disconnected",
        );
      }
    }

    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Quizzy realtime server listening");
});
