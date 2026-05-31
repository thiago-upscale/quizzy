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
    <form action={formAction} className="mt-8 space-y-4">
      <input name="pin" type="hidden" value={pin} />

      {state.status === "error" ? (
        <StatusAlert tone="error">
          {state.message}
        </StatusAlert>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--quizzy-muted)]">
          Nickname
        </span>
        <input
          className="w-full rounded-[1.35rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_65%,white)] px-5 py-4 text-base text-[var(--quizzy-navy)] outline-none transition focus:border-[var(--quizzy-teal)]"
          maxLength={20}
          name="nickname"
          placeholder="Seu nome na sala"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--quizzy-muted)]">
          Email opcional
        </span>
        <input
          className="w-full rounded-[1.35rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_65%,white)] px-5 py-4 text-base text-[var(--quizzy-navy)] outline-none transition focus:border-[var(--quizzy-teal)]"
          name="email"
          placeholder="voce@empresa.com"
          type="email"
        />
      </label>

      <div className="rounded-[1.35rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_72%,white)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
          Antes de continuar
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--quizzy-muted)]">
          Seu nome fica visivel para o host e para o ranking da sala. Se voce
          perder a conexao, o sistema tenta preservar seu progresso.
        </p>
      </div>

      <button
        className="w-full rounded-full bg-[var(--quizzy-accent)] px-5 py-4 text-sm font-semibold text-[var(--quizzy-navy)] transition hover:bg-[#f7b338]"
        type="submit"
      >
        Entrar na sala
      </button>
    </form>
  );
}
