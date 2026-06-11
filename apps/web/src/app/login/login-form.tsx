"use client";

import { startTransition, useActionState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginState = {
  error?: string;
  success?: boolean;
};

async function authenticate(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  const result = await signIn("credentials", {
    email,
    password,
    callbackUrl,
    redirect: false,
  });

  if (!result) {
    return { error: "Não foi possivel iniciar a sessão." };
  }

  if (result.error) {
    return { error: "Email ou senha invalidos." };
  }

  return { success: true };
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [state, formAction, pending] = useActionState(authenticate, {});

  useEffect(() => {
    if (!pending && state.success) {
      startTransition(() => {
        router.push(callbackUrl);
        router.refresh();
      });
    }
  }, [callbackUrl, pending, router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <input name="callbackUrl" type="hidden" value={callbackUrl} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#22304a]" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
          id="email"
          name="email"
          placeholder="você@empresa.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[#22304a]"
          htmlFor="password"
        >
          Senha
        </label>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      <div className="flex justify-end">
        <a
          className="text-sm font-semibold text-[#0f766e]"
          href="/forgot-password"
        >
          Esqueci minha senha
        </a>
      </div>
      {state.error ? (
        <p className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#9f1239]">
          {state.error}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
