import { createServer } from "node:http";
import { URL } from "node:url";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./env.js";
import { logger } from "./logger.js";

type RoomParticipant = {
  avatar: string;
  connected: boolean;
  id: string;
  nickname: string;
  participantToken: string;
  score: number;
  socketId: string | null;
  totalTimeMs: number;
};

type SerializedParticipant = {
  avatar: string;
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
  score: number;
  totalTimeMs: number;
};

type RoomQuestion = {
  correctIndex: number;
  id: string;
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
  leaderboard: LeaderboardEntry[];
  options: string[];
  prompt: string;
  questionId: string;
  questionOrderIndex: number;
  submittedCount: number;
  totalQuestions: number;
};

type RoomState = {
  activeQuestionTimer: NodeJS.Timeout | null;
  answersByQuestion: Map<string, Map<string, RoomAnswer>>;
  countdownSeconds: number | null;
  currentQuestionIndex: number | null;
  currentQuestionResult: QuestionResultSnapshot | null;
  participants: Map<string, RoomParticipant>;
  questionClosedAt: number | null;
  questionStartedAt: number | null;
  questions: RoomQuestion[];
  sessionId: string | null;
  status: "waiting" | "countdown" | "playing" | "question_result" | "finished";
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

type PersistAnswerPayload = {
  answerIndex: number;
  isCorrect: boolean;
  participantToken: string;
  pin: string;
  pointsEarned: number;
  questionId: string;
  questionOrderIndex: number;
  sessionId: string;
  timeSpentMs: number;
};

function createEmptyRoom(): RoomState {
  return {
    activeQuestionTimer: null,
    answersByQuestion: new Map(),
    countdownSeconds: null,
    currentQuestionIndex: null,
    currentQuestionResult: null,
    participants: new Map(),
    questionClosedAt: null,
    questionStartedAt: null,
    questions: [],
    sessionId: null,
    status: "waiting",
  };
}

const liveRooms = new Map<string, RoomState>();

function getOrCreateRoom(pin: string) {
  const existingRoom = liveRooms.get(pin);

  if (existingRoom) {
    return existingRoom;
  }

  const nextRoom = createEmptyRoom();
  liveRooms.set(pin, nextRoom);
  return nextRoom;
}

function clearQuestionTimer(room: RoomState) {
  if (room.activeQuestionTimer) {
    clearTimeout(room.activeQuestionTimer);
    room.activeQuestionTimer = null;
  }
}

function serializeParticipants(room: RoomState) {
  return [...room.participants.values()]
    .map(
      (participant) =>
        ({
          avatar: participant.avatar,
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
    leaderboard,
    options: currentQuestion.options,
    prompt: currentQuestion.prompt,
    questionId: currentQuestion.id,
    questionOrderIndex: currentQuestion.orderIndex,
    submittedCount: answers.size,
    totalQuestions: room.questions.length,
  } satisfies QuestionResultSnapshot;
}

async function notifyWebOfStateChange(params: {
  pin: string;
  questionIndex?: number;
  sessionId: string;
  status: "countdown" | "playing" | "question_result" | "finished";
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
    await fetch(new URL("/api/internal/live/answer", env.WEB_ORIGIN), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-quizzy-internal-token": env.REALTIME_INTERNAL_TOKEN,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.error({ error, payload }, "Failed to persist live answer");
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

function emitRoomSnapshot(io: Server, pin: string, room: RoomState) {
  const leaderboard = buildLeaderboard(room);
  const participants = serializeParticipants(room);
  const connectedCount = getConnectedParticipantCount(room);

  io.to(pin).emit("participant:list", {
    connectedCount,
    participants,
  });
  io.to(pin).emit("session:state", {
    countdownSeconds: room.countdownSeconds,
    status: room.status,
  });
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
  isCorrect: boolean;
  pointsBase: number;
  timeLimitSeconds: number;
  timeSpentMs: number;
}) {
  if (!params.isCorrect) {
    return 0;
  }

  const totalMs = Math.max(1, params.timeLimitSeconds * 1000);
  const speedFactor = Math.max(0.25, 1 - params.timeSpentMs / totalMs);
  return Math.max(100, Math.round(params.pointsBase * speedFactor));
}

function finishSession(io: Server, params: { pin: string; room: RoomState }) {
  const { pin, room } = params;

  clearQuestionTimer(room);

  room.status = "finished";
  room.countdownSeconds = null;
  room.currentQuestionIndex = null;
  room.questionStartedAt = null;
  room.questionClosedAt = Date.now();
  room.currentQuestionResult = null;

  const leaderboard = buildLeaderboard(room);

  io.to(pin).emit("session:state", {
    countdownSeconds: null,
    status: "finished",
  });
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

  io.to(pin).emit("session:state", {
    countdownSeconds: null,
    status: "question_result",
  });
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

  room.status = "playing";
  room.countdownSeconds = null;
  room.currentQuestionIndex = questionIndex;
  room.currentQuestionResult = null;
  room.questionClosedAt = null;
  room.questionStartedAt = Date.now();

  const answerKey = getQuestionAnswerKey(question);
  if (!room.answersByQuestion.has(answerKey)) {
    room.answersByQuestion.set(answerKey, new Map());
  }

  io.to(pin).emit("session:state", {
    countdownSeconds: null,
    status: room.status,
  });
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

const httpServer = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "quizzy-realtime" }));
    return;
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
      room.sessionId = sessionId;
      room.questions = questions;
      room.status = "countdown";
      room.countdownSeconds = 3;
      room.currentQuestionIndex = null;
      room.currentQuestionResult = null;
      room.questionClosedAt = null;
      room.questionStartedAt = null;

      io.to(pin).emit("session:state", {
        countdownSeconds: 3,
        status: "countdown",
      });
      io.to(pin).emit("session:countdown", { seconds: 3 });

      void notifyWebOfStateChange({
        pin,
        questionIndex: 0,
        sessionId,
        status: "countdown",
      });

      setTimeout(() => {
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

      const room = getOrCreateRoom(pin);
      if (room.sessionId !== sessionId || room.questions.length === 0) {
        response.writeHead(409, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "session_not_ready" }));
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
    (payload: {
      avatar?: string;
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

      const room = getOrCreateRoom(pin);
      const previousParticipant = room.participants.get(participantToken);
      room.participants.set(participantToken, {
        avatar: payload.avatar?.trim() || previousParticipant?.avatar || "live",
        connected: true,
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
              isCorrect: answer.isCorrect,
              pointsEarned: answer.pointsEarned,
            });
          }
        }
      }
    },
  );

  socket.on("host:watch", (payload: { pin?: string; sessionId?: string }) => {
    const pin = payload.pin?.trim();
    const sessionId = payload.sessionId?.trim();

    if (!pin) {
      return;
    }

    const room = getOrCreateRoom(pin);
    if (sessionId && !room.sessionId) {
      room.sessionId = sessionId;
    }

    socket.data.pin = pin;
    socket.data.role = "host";
    socket.join(pin);

    emitRoomSnapshot(io, pin, room);
  });

  socket.on(
    "answer:submit",
    (payload: {
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
        socket.emit("answer:ack", {
          accepted: false,
          reason: "invalid_payload",
        });
        return;
      }

      const room = getOrCreateRoom(pin);
      const currentQuestion = getCurrentQuestion(room);
      const participant = room.participants.get(participantToken);

      if (
        room.status !== "playing" ||
        !currentQuestion ||
        !participant ||
        room.questionStartedAt === null ||
        currentQuestion.id !== questionId
      ) {
        socket.emit("answer:ack", {
          accepted: false,
          reason: "question_not_active",
        });
        return;
      }

      const answerKey = getQuestionAnswerKey(currentQuestion);
      const questionAnswers =
        room.answersByQuestion.get(answerKey) ?? new Map<string, RoomAnswer>();

      if (questionAnswers.has(participantToken)) {
        socket.emit("answer:ack", {
          accepted: false,
          reason: "duplicate_answer",
        });
        return;
      }

      const timeSpentMs = Math.max(0, Date.now() - room.questionStartedAt);
      const questionTimeLimitMs = currentQuestion.timeLimitSeconds * 1000;

      if (timeSpentMs > questionTimeLimitMs) {
        socket.emit("answer:ack", {
          accepted: false,
          reason: "time_expired",
        });
        return;
      }

      const isCorrect = currentQuestion.correctIndex === answerIndex;
      const pointsEarned = computePoints({
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

      participant.score += pointsEarned;
      participant.totalTimeMs += timeSpentMs;
      room.participants.set(participantToken, participant);

      socket.emit("answer:ack", {
        accepted: true,
        answerIndex,
        isCorrect,
        pointsEarned,
      });

      io.to(pin).emit("participant:list", {
        connectedCount: getConnectedParticipantCount(room),
        participants: serializeParticipants(room),
      });
      io.to(pin).emit("question:stats", {
        questionId: currentQuestion.id,
        questionOrderIndex: currentQuestion.orderIndex,
        submittedCount: questionAnswers.size,
        totalParticipants: getConnectedParticipantCount(room),
      });
      io.to(pin).emit("leaderboard:update", {
        entries: buildLeaderboard(room, currentQuestion),
      });

      if (room.sessionId) {
        void persistAnswer({
          answerIndex,
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

        io.to(pin).emit("participant:list", {
          connectedCount: getConnectedParticipantCount(room),
          participants: serializeParticipants(room),
        });
      }
    }

    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Quizzy realtime server listening");
});
