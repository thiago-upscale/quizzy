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
      description="Não foi possível carregar o quiz agora. Tente novamente — suas respostas já enviadas continuam registradas."
      error={error}
      retry={unstable_retry}
      title="Falha ao carregar o quiz"
    />
  );
}
