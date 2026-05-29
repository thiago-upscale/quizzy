"use client";

import { useActionState } from "react";
import {
  accountInitialState,
  type AccountActionState,
} from "@/app/dashboard/account/action-state";
import {
  requestPasswordReset,
} from "@/app/dashboard/account/actions";

function FeedbackMessage({ state }: { state: AccountActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-xl bg-[#ecfdf3] px-4 py-3 text-sm text-[#0f766e]"
          : "rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#9f1239]"
      }
    >
      <p>{state.message}</p>
      {state.previewUrl ? (
        <a
          className="mt-2 block break-all font-semibold underline"
          href={state.previewUrl}
        >
          {state.previewUrl}
        </a>
      ) : null}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    accountInitialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[#22304a]">Email</span>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
          name="email"
          placeholder="voce@empresa.com"
          required
          type="email"
        />
      </label>

      <FeedbackMessage state={state} />

      <button
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Gerando link..." : "Gerar link de recuperacao"}
      </button>
    </form>
  );
}
