"use client";

import { useActionState } from "react";
import type { RegisterState } from "./actions";
import { registerCreator } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerCreator,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#22304a]" htmlFor="name">
          Nome
        </label>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c2410c]"
          id="name"
          name="name"
          placeholder="Thiago Santos"
          required
          type="text"
        />
      </div>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-[#22304a]"
          htmlFor="company"
        >
          Empresa
        </label>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c2410c]"
          id="company"
          name="company"
          placeholder="Upscale Live"
          required
          type="text"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#22304a]" htmlFor="email">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c2410c]"
          id="email"
          name="email"
          placeholder="voce@empresa.com"
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
          className="w-full rounded-xl border border-[#c9d5e7] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c2410c]"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#9f1239]">
          {state.error}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-[#c2410c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
