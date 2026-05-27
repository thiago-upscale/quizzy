import { createServer } from "node:http";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "./env.js";
import { logger } from "./logger.js";

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "quizzy-realtime" }));
    return;
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

  socket.on("disconnect", (reason) => {
    logger.info({ socketId: socket.id, reason }, "Socket disconnected");
  });
});

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Realtime server listening");
});
