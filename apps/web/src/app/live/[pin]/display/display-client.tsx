"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type Participant = {
  id: string;
  nickname: string;
  presenceStatus: "offline" | "online";
};

export function DisplayClient({
  initialParticipants,
  pin,
  realtimeUrl,
}: {
  initialParticipants: Participant[];
  pin: string;
  realtimeUrl: string;
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [connectedCount, setConnectedCount] = useState(
    initialParticipants.filter((p) => p.presenceStatus === "online").length,
  );

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

    return () => {
      socket.disconnect();
    };
  }, [pin, realtimeUrl]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
          Participantes
        </p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
          {connectedCount}
        </span>
      </div>
      <div className="space-y-2">
        {participants.length === 0 ? (
          <p className="text-sm text-white/30">Aguardando participantes...</p>
        ) : (
          participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2"
            >
              <span
                className={
                  p.presenceStatus === "online"
                    ? "h-2 w-2 rounded-full bg-[#4ade80]"
                    : "h-2 w-2 rounded-full bg-white/20"
                }
              />
              <span className="text-sm font-medium text-white">
                {p.nickname}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
