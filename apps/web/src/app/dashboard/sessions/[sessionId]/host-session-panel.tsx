"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { StartLiveSessionState } from "../../actions";

type Participant = {
  avatar: string;
  id: string;
  nickname: string;
  score: number;
};

const initialActionState: StartLiveSessionState = {
  status: "idle",
};

export function HostSessionPanel({
  initialParticipants,
  pin,
  publicUrl,
  qrCodeDataUrl,
  realtimeUrl,
  sessionId,
  sessionStatus,
  startAction,
}: {
  initialParticipants: Participant[];
  pin: string;
  publicUrl: string;
  qrCodeDataUrl: string;
  realtimeUrl: string;
  sessionId: string;
  sessionStatus: string;
  startAction: (
    state: StartLiveSessionState,
    formData: FormData,
  ) => Promise<StartLiveSessionState>;
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [status, setStatus] = useState(sessionStatus);
  const [actionState, formAction] = useActionState(
    startAction,
    initialActionState,
  );

  useEffect(() => {
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("host:watch", { pin, sessionId });
    });

    socket.on(
      "participant:list",
      (payload: { participants: Participant[] }) => {
        setParticipants(payload.participants);
      },
    );

    socket.on(
      "session:state",
      (payload: { countdownSeconds?: number; status: string }) => {
        setStatus(payload.status);
      },
    );

    socket.on("session:started", () => {
      setStatus("playing");
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, realtimeUrl, sessionId]);

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Entrada do participante
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
              QR Code e PIN
            </h2>
          </div>
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
            {status}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-3">
            <Image
              alt="QR Code da sessao live"
              className="h-auto w-full rounded-xl"
              height={160}
              src={qrCodeDataUrl}
              width={160}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                PIN
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-[0.18em] text-[#132238]">
                {pin}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Link publico
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-[#132238]">
                {publicUrl}
              </p>
            </div>
          </div>
        </div>

        <form action={formAction} className="mt-6 space-y-3">
          <input name="sessionId" type="hidden" value={sessionId} />
          {actionState.status !== "idle" ? (
            <p
              className={
                actionState.status === "success"
                  ? "rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#0f766e]"
                  : "rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]"
              }
            >
              {actionState.message}
            </p>
          ) : null}
          <button
            className="rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557] disabled:opacity-60"
            disabled={status !== "waiting"}
            type="submit"
          >
            {status === "waiting"
              ? "Iniciar contagem regressiva"
              : "Sessao em andamento"}
          </button>
        </form>
      </article>

      <article className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
              Presenca em tempo real
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[#132238]">
              Participantes na sala
            </h2>
          </div>
          <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
            {participants.length} conectados
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {participants.length === 0 ? (
            <p className="text-sm leading-7 text-[#61708c]">
              Assim que os participantes escanearem o QR Code ou entrarem pelo
              PIN, a lista aparece aqui.
            </p>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10233f] text-sm font-semibold text-white">
                  {participant.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#132238]">
                    {participant.nickname}
                  </p>
                  <p className="text-xs text-[#61708c]">
                    avatar {participant.avatar}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
