"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-full border border-[#d2d8e5] px-4 py-2 text-sm font-medium text-[#324155] transition hover:bg-white"
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      Sair
    </button>
  );
}
