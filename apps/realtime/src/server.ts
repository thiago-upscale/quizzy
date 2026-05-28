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

type RoomState = {
  countdownSeconds: number | null;
  participants: Map<string, RoomParticipant>;
  status: "waiting" | "countdown" | "playing";
};

const liveRooms = new Map<string, RoomState>();

function getOrCreateRoom(pin: string) {
  const existingRoom = liveRooms.get(pin);

  if (existingRoom) {
    return existingRoom;
  }

  const nextRoom: RoomState = {
    countdownSeconds: null,
    participants: new Map<string, RoomParticipant>(),
    status: "waiting",
  };

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

async function notifyWebOfStateChange(params: {
  pin: string;
  sessionId: string;
  status: "countdown" | "playing";
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

async function parseJsonBody(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    pin?: string;
    sessionId?: string;
  };
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
      const body = await parseJsonBody(request);
      const pin = body?.pin?.trim();
      const sessionId = body?.sessionId?.trim();

      if (!pin || !sessionId) {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "invalid_payload" }));
        return;
      }

      const room = getOrCreateRoom(pin);
      room.status = "countdown";
      room.countdownSeconds = 3;

      io.to(pin).emit("session:state", {
        countdownSeconds: 3,
        status: "countdown",
      });
      io.to(pin).emit("session:countdown", { seconds: 3 });

      void notifyWebOfStateChange({
        pin,
        sessionId,
        status: "countdown",
      });

      setTimeout(() => {
        const currentRoom = getOrCreateRoom(pin);
        currentRoom.status = "playing";
        currentRoom.countdownSeconds = null;

        io.to(pin).emit("session:state", {
          countdownSeconds: null,
          status: "playing",
        });
        io.to(pin).emit("session:started", {
          status: "playing",
        });

        void notifyWebOfStateChange({
          pin,
          sessionId,
          status: "playing",
        });
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
      nickname?: string;
      participantToken?: string;
      pin?: string;
      role?: "participant" | "host";
    }) => {
      const pin = payload.pin?.trim();
      const participantToken = payload.participantToken?.trim();
      const nickname = payload.nickname?.trim();

      if (!pin || !participantToken || !nickname) {
        return;
      }

      const room = getOrCreateRoom(pin);
      room.participants.set(participantToken, {
        avatar: "live",
        id: participantToken,
        nickname,
        participantToken,
        score: 0,
        socketId: socket.id,
      });

      socket.data.pin = pin;
      socket.data.participantToken = participantToken;
      socket.data.role = "participant";
      socket.join(pin);

      io.to(pin).emit("participant:list", {
        participants: serializeParticipants(room),
      });
      socket.emit("session:state", {
        countdownSeconds: room.countdownSeconds,
        status: room.status,
      });
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

    socket.emit("participant:list", {
      participants: serializeParticipants(room),
    });
    socket.emit("session:state", {
      countdownSeconds: room.countdownSeconds,
      status: room.status,
    });
  });

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
