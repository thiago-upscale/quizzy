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
        <p className="rounded-2xl bg-[var(--quizzy-error-bg)] px-4 py-3 text-sm font-medium text-[var(--quizzy-error)]">
          {state.message}
        </p>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white/80">Apelido</span>
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/92 px-5 py-4 text-base text-[#10233f] outline-none focus:ring-2 focus:ring-[#f59e0b]/60 focus:border-[#f59e0b]"
          maxLength={20}
          name="nickname"
          placeholder="Como você quer aparecer"
          required
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-white/80">
          {requireEmail ? "Email obrigatório" : "Email opcional"}
        </span>
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/92 px-5 py-4 text-base text-[#10233f] outline-none focus:ring-2 focus:ring-[#f59e0b]/60 focus:border-[#f59e0b]"
          name="email"
          placeholder="você@empresa.com"
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
