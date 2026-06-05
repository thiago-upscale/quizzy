"use client";

import { useActionState } from "react";
import { StatusAlert } from "@/components/phase-one-ui";
import type { JoinLiveState } from "../actions";

const initialState: JoinLiveState = {
  status: "idle",
};

export function ParticipantEntryForm({
  joinAction,
  pin,
}: {
  joinAction: (
    state: JoinLiveState,
    formData: FormData,
  ) => Promise<JoinLiveState>;
  pin: string;
}) {
  const [state, formAction] = useActionState(joinAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input name="pin" type="hidden" value={pin} />

      {state.status === "error" ? (
        <StatusAlert tone="error">
          {state.message}
        </StatusAlert>
      ) : null}

      <label className="block space-y-2.5">
        <span className="text-sm font-semibold text-slate-500">
          Nickname
        </span>
        <input
          className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
          maxLength={20}
          name="nickname"
          placeholder="Seu nome na sala"
          required
        />
      </label>

      <label className="block space-y-2.5">
        <span className="text-sm font-semibold text-slate-500">
          Email opcional
        </span>
        <input
          className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
          name="email"
          placeholder="voce@empresa.com"
          type="email"
        />
      </label>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Antes de continuar
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Seu nome fica visivel para o host e para o ranking da sala. Se voce
          perder a conexao, o sistema tenta preservar seu progresso.
        </p>
      </div>

      <button
        className="w-full rounded-full bg-[var(--quizzy-accent)] px-5 py-4 text-base font-bold text-slate-950 shadow-[0_12px_30px_rgba(245,158,11,0.28)] transition hover:brightness-105 active:scale-[0.99]"
        type="submit"
      >
        Entrar na sala
      </button>
    </form>
  );
}
