"use client";

import { RouteError } from "@/components/route-error";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      description="Não foi possível carregar a sala ao vivo. Tente novamente — se o problema continuar, confirme o PIN com o apresentador."
      error={error}
      homeHref="/join"
      homeLabel="Digitar PIN novamente"
      retry={unstable_retry}
      title="Falha ao entrar na sala"
    />
  );
}
