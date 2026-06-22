"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { accountInitialState } from "@/app/dashboard/account/action-state";
import { resetPasswordWithToken } from "@/app/dashboard/account/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    resetPasswordWithToken,
    accountInitialState,
  );

  useEffect(() => {
    if (!pending && state.status === "success") {
      startTransition(() => {
        router.push("/login?reset=1");
      });
    }
  }, [pending, router, state.status]);

  return (
    <form action={formAction} className="space-y-4">
      <input name="token" type="hidden" value={token} />

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[#22304a]">Nova senha</span>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#10233f]"
          minLength={8}
          name="nextPassword"
          required
          type="password"
        />
      </label>

      <label className="block space-y-2">
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

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-xl bg-[#ecfdf3] px-4 py-3 text-sm text-[#0f766e]"
              : "rounded-xl bg-[var(--quizzy-error-bg)] px-4 py-3 text-sm text-[var(--quizzy-error)]"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="w-full rounded-xl bg-[#10233f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Redefinindo..." : "Redefinir senha"}
      </button>
    </form>
  );
}
