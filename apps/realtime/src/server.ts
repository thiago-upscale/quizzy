import { createServer } from "node:http";
import { URL } from "node:url";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./env.js";
import { logger } from "./logger.js";

type RoomParticipant = {
  avatar: string;
  id: string;
  nickname: string;
  participantToken: string;
  score: number;
  socketId: string;
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

type RoomState = {
  answersByQuestion: Map<string, Map<string, RoomAnswer>>;
  countdownSeconds: number | null;
  currentQuestionIndex: number | null;
  participants: Map<string, RoomParticipant>;
  questionStartedAt: number | null;
  questions: RoomQuestion[];
  sessionId: string | null;
  status: "waiting" | "countdown" | "finished" | "playing";
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
    answersByQuestion: new Map(),
    countdownSeconds: null,
    currentQuestionIndex: null,
    participants: new Map(),
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

function serializeParticipants(room: RoomState) {
  return [...room.participants.values()]
    .map((participant) => ({
      avatar: participant.avatar,
      id: participant.id,
      nickname: participant.nickname,
      score: participant.score,
    }))
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
    submittedCount:
      room.answersByQuestion.get(currentQuestion.id)?.size ??
      room.answersByQuestion.get(
        `${currentQuestion.orderIndex}:${currentQuestion.id}`,
      )?.size ??
      0,
    timeLimitSeconds: currentQuestion.timeLimitSeconds,
    totalQuestions: room.questions.length,
    type: currentQuestion.type,
  };
}

function getQuestionAnswerKey(question: RoomQuestion) {
  return `${question.orderIndex}:${question.id}`;
}

function getSubmittedCount(room: RoomState, question: RoomQuestion) {
  return room.answersByQuestion.get(getQuestionAnswerKey(question))?.size ?? 0;
}

function getQuestionStats(room: RoomState) {
  const currentQuestion = getCurrentQuestion(room);

  if (!currentQuestion) {
    return null;
  }

  return {
    questionId: currentQuestion.id,
    questionOrderIndex: currentQuestion.orderIndex,
    submittedCount: getSubmittedCount(room, currentQuestion),
    totalParticipants: room.participants.size,
  };
}

async function notifyWebOfStateChange(params: {
  pin: string;
  questionIndex?: number;
  sessionId: string;
  status: "countdown" | "finished" | "playing";
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
  io.to(pin).emit("participant:list", {
    participants: serializeParticipants(room),
  });
  io.to(pin).emit("session:state", {
    countdownSeconds: room.countdownSeconds,
    status: room.status,
  });

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

  room.status = "playing";
  room.countdownSeconds = null;
  room.currentQuestionIndex = questionIndex;
  room.questionStartedAt = Date.now();
  room.answersByQuestion.set(getQuestionAnswerKey(question), new Map());

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
    submittedCount: 0,
    totalParticipants: room.participants.size,
  });

  return true;
}

function finishSession(io: Server, params: { pin: string; room: RoomState }) {
  params.room.status = "finished";
  params.room.countdownSeconds = null;
  params.room.currentQuestionIndex = null;
  params.room.questionStartedAt = null;

  io.to(params.pin).emit("session:state", {
    countdownSeconds: null,
    status: "finished",
  });
  io.to(params.pin).emit("session:finished", {
    status: "finished",
  });
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
      room.sessionId = sessionId;
      room.questions = questions;
      room.status = "countdown";
      room.countdownSeconds = 3;
      room.currentQuestionIndex = null;
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

      const nextQuestionIndex =
        room.currentQuestionIndex === null ? 0 : room.currentQuestionIndex + 1;

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
      response.end(JSON.stringify({ ok: true }));
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
    origin: env.WEB_ORIGIN,
    methods: ["GET", "POST"],
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
    socketId: socket.id,
    serverTime: new Date().toISOString(),
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
    }) => {
      const pin = payload.pin?.trim();
      const participantToken = payload.participantToken?.trim();
      const nickname = payload.nickname?.trim();

      if (!pin || !participantToken || !nickname) {
        return;
      }

      const room = getOrCreateRoom(pin);
      room.participants.set(participantToken, {
        avatar: payload.avatar?.trim() || "live",
        id: payload.participantId?.trim() || participantToken,
        nickname,
        participantToken,
        score: payload.score ?? 0,
        socketId: socket.id,
      });

      socket.data.pin = pin;
      socket.data.participantToken = participantToken;
      socket.data.role = "participant";
      socket.join(pin);

      emitRoomSnapshot(io, pin, room);
    },
  );

  socket.on("host:watch", (payload: { pin?: string; sessionId?: string }) => {
    const pin = payload.pin?.trim();

    if (!pin) {
      return;
    }

    const room = getOrCreateRoom(pin);
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
      room.participants.set(participantToken, participant);

      socket.emit("answer:ack", {
        accepted: true,
        answerIndex,
        isCorrect,
        pointsEarned,
        questionId,
        submittedCount: questionAnswers.size,
      });

      io.to(pin).emit("participant:list", {
        participants: serializeParticipants(room),
      });
      io.to(pin).emit("question:stats", {
        questionId,
        questionOrderIndex: currentQuestion.orderIndex,
        submittedCount: questionAnswers.size,
        totalParticipants: room.participants.size,
      });

      if (room.sessionId) {
        void persistAnswer({
          answerIndex,
          isCorrect,
          participantToken,
          pin,
          pointsEarned,
          questionId,
          questionOrderIndex: currentQuestion.orderIndex,
          sessionId: room.sessionId,
          timeSpentMs,
        });
      }
    },
  );

  socket.on("disconnect", (reason) => {
    const pin = socket.data.pin as string | undefined;
    const participantToken = socket.data.participantToken as string | undefined;

    if (pin && participantToken) {
      const room = getOrCreateRoom(pin);
      room.participants.delete(participantToken);
      io.to(pin).emit("participant:list", {
        participants: serializeParticipants(room),
      });
    }

    logger.info({ socketId: socket.id, reason }, "Socket disconnected");
  });
});

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Realtime server listening");
});
