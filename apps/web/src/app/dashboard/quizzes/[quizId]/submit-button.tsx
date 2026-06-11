"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  intent,
}: {
  children: React.ReactNode;
  intent: "draft" | "publish";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        intent === "publish"
          ? "rounded-xl bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557] disabled:opacity-60 cursor-pointer shadow-sm hover:shadow"
          : "rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer shadow-sm hover:shadow"
      }
      disabled={pending}
      name="intent"
      type="submit"
      value={intent}
    >
      {pending
        ? intent === "publish"
          ? "Publicando..."
          : "Salvando..."
        : children}
    </button>
  );
}
