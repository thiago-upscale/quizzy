"use client";

import { useActionState } from "react";
import {
  changeAccountPassword,
  requestPasswordReset,
  updateAccountProfile,
} from "./actions";
import {
  accountInitialState,
  type AccountActionState,
} from "./action-state";

function FeedbackMessage({ state }: { state: AccountActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <div
      className={
        state.status === "success"
          ? "rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#0f766e]"
          : "rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]"
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

export function ProfileForm({
  initialCompany,
  initialName,
}: {
  initialCompany: string;
  initialName: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateAccountProfile,
    accountInitialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#22304a]">Nome</span>
          <input
            className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
            defaultValue={initialName}
            name="name"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#22304a]">Empresa</span>
          <input
            className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
            defaultValue={initialCompany}
            name="company"
            placeholder="Sua empresa"
            type="text"
          />
        </label>
      </div>

      <FeedbackMessage state={state} />

      <button
        className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}

export function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState(
    changeAccountPassword,
    accountInitialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="space-y-2">
        <span className="text-sm font-medium text-[#22304a]">Senha atual</span>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#10233f]"
          name="currentPassword"
          required
          type="password"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#22304a]">Nova senha</span>
          <input
            className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#10233f]"
            minLength={8}
            name="nextPassword"
            required
            type="password"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#22304a]">
            Confirmar nova senha
          </span>
          <input
            className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#10233f]"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </label>
      </div>

      <FeedbackMessage state={state} />

      <button
        className="rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Atualizando..." : "Trocar senha"}
      </button>
    </form>
  );
}

export function PasswordResetRequestInline({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    accountInitialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="email" type="hidden" value={email} />
      <FeedbackMessage state={state} />
      <button
        className="rounded-full border border-[#d2d8e5] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Gerando link..." : "Gerar link interno de recuperacao"}
      </button>
    </form>
  );
}
