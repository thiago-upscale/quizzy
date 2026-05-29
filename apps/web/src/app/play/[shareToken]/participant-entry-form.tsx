"use client";

import { useActionState } from "react";

import type { IndividualEntryState } from "../actions";

const initialState: IndividualEntryState = {
  status: "idle",
};

export function IndividualParticipantEntryForm({
  joinAction,
  requireEmail,
  shareToken,
}: {
  joinAction: (
    state: IndividualEntryState,
    formData: FormData,
  ) => Promise<IndividualEntryState>;
  requireEmail: boolean;
  shareToken: string;
}) {
  const [state, formAction] = useActionState(joinAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input name="shareToken" type="hidden" value={shareToken} />

      {state.status === "error" ? (
        <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
          {state.message}
        </p>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white/80">Apelido</span>
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/92 px-5 py-4 text-base text-[#10233f] outline-none"
          maxLength={20}
          name="nickname"
          placeholder="Como voce quer aparecer"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white/80">
          {requireEmail ? "Email obrigatorio" : "Email opcional"}
        </span>
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/92 px-5 py-4 text-base text-[#10233f] outline-none"
          name="email"
          placeholder="voce@empresa.com"
          required={requireEmail}
          type="email"
        />
      </label>

      <button
        className="w-full rounded-full bg-[#f59e0b] px-5 py-4 text-sm font-semibold text-[#10233f] transition hover:bg-[#fbbf24]"
        type="submit"
      >
        Iniciar tentativa
      </button>
    </form>
  );
}
