"use client";

import { useActionState } from "react";
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
        <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
          {state.message}
        </p>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white/80">Nickname</span>
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/92 px-5 py-4 text-base text-[#10233f] outline-none"
          maxLength={20}
          name="nickname"
          placeholder="Seu nome na sala"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white/80">
          Email opcional
        </span>
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/92 px-5 py-4 text-base text-[#10233f] outline-none"
          name="email"
          placeholder="voce@empresa.com"
          type="email"
        />
      </label>

      <button
        className="w-full rounded-full bg-[#f59e0b] px-5 py-4 text-sm font-semibold text-[#10233f] transition hover:bg-[#fbbf24]"
        type="submit"
      >
        Entrar na sala
      </button>
    </form>
  );
}
