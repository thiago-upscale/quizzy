"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Participant = {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
};

type LiveBranding = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
};

type SessionState = {
  status: string;
  countdownSeconds: number | null;
};

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
    nickname: string;
    participantToken: string;
  };
  pin: string;
  quizTitle: string;
  realtimeUrl: string;
}) {
  const [participants, setParticipants] =
    useState<Participant[]>(initialParticipants);
  const [sessionState, setSessionState] = useState<SessionState>({
    status: initialSessionStatus,
    countdownSeconds: initialSessionStatus === "countdown" ? 3 : null,
  });

  const roomLabel = useMemo(() => {
    if (sessionState.status === "playing") {
      return "Ao vivo";
    }

    if (sessionState.status === "countdown") {
      return "Comecando";
    }

    return "Aguardando inicio";
  }, [sessionState.status]);

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
    const socket: Socket = io(realtimeUrl, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("session:join", {
        nickname: participant.nickname,
        participantToken: participant.participantToken,
        pin,
        role: "participant",
      });
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
        setSessionState({
          status: payload.status,
          countdownSeconds: payload.countdownSeconds ?? null,
        });
      },
    );

    socket.on("session:countdown", (payload: { seconds: number }) => {
      setSessionState({
        status: "countdown",
        countdownSeconds: payload.seconds,
      });
    });

    socket.on("session:started", () => {
      setSessionState({
        status: "playing",
        countdownSeconds: null,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [participant.nickname, participant.participantToken, pin, realtimeUrl]);

  return (
    <main
      className="min-h-screen px-6 py-10 text-white"
      style={{
        background: `linear-gradient(180deg, ${branding.secondaryColor} 0%, ${branding.primaryColor} 100%)`,
        fontFamily: branding.fontFamily,
      }}
    >
      <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] bg-white/10 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.25)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
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

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[1.75rem] bg-white/10 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Sala pronta
            </p>
            <p className="mt-3 text-5xl font-semibold">{participants.length}</p>
            <p className="mt-3 text-sm leading-7 text-white/75">
              participantes conectados. Quando o host iniciar, todos avancam ao
              mesmo tempo.
            </p>

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

            {sessionState.status === "playing" ? (
              <div className="mt-8 rounded-[1.5rem] bg-white/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Primeira pergunta
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  A sessao ja comecou
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  O fluxo de resposta entra em seguida. Este placeholder garante
                  a transicao automatica do lobby para o estado de jogo.
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.75rem] bg-white/10 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Participantes
                </p>
                <h2 className="mt-3 text-2xl font-semibold">Quem ja entrou</h2>
              </div>
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                {participants.length} online
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                  <div>
                    <p className="text-sm font-semibold">
                      {currentParticipant.nickname}
                    </p>
                    <p className="text-xs text-white/65">
                      avatar {currentParticipant.avatar}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
