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
      description="Não foi possível carregar a entrada por PIN. Tente novamente em alguns segundos."
      error={error}
      retry={unstable_retry}
      title="Falha ao carregar a entrada"
    />
  );
}
