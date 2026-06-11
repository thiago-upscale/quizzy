"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusAlert, SurfaceCard } from "@/components/phase-one-ui";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
};

export function RouteError({
  error,
  retry,
  title = "Algo deu errado",
  description = "Encontramos um problema inesperado ao carregar esta tela. Tente novamente — se o erro continuar, volte ao início.",
  homeHref = "/",
  homeLabel = "Voltar ao início",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--quizzy-surface)] px-6 py-8 text-[var(--quizzy-text)]">
      <SurfaceCard className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
          {description}
        </p>
        <div className="mt-5">
          <StatusAlert tone="error">
            {error.digest
              ? `Código do erro: ${error.digest}`
              : "Erro inesperado na aplicação."}
          </StatusAlert>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-[var(--quizzy-teal)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
            onClick={() => retry()}
            type="button"
          >
            Tentar novamente
          </button>
          <Link
            className="rounded-full border border-[var(--quizzy-border)] px-5 py-2.5 text-sm font-semibold text-[var(--quizzy-text)] transition hover:bg-[var(--quizzy-surface)]"
            href={homeHref}
          >
            {homeLabel}
          </Link>
        </div>
      </SurfaceCard>
    </main>
  );
}
