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
      description="Não foi possível carregar o dashboard agora. Tente novamente — seus quizzes e sessões continuam salvos."
      error={error}
      homeHref="/dashboard"
      homeLabel="Recarregar dashboard"
      retry={unstable_retry}
      title="Falha ao carregar o dashboard"
    />
  );
}
