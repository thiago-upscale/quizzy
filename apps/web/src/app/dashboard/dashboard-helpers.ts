export const activeSessionStatuses = [
  "waiting",
  "countdown",
  "playing",
  "question_result",
  "interrupted",
] as const;

export const statusLabels: Record<string, string> = {
  playing: "AO VIVO",
  question_result: "RESULTADO",
  countdown: "CONTAGEM",
  interrupted: "INTERROMPIDA",
  waiting: "AGUARDANDO",
  finished: "ENCERRADA",
  published: "PUBLICADO",
  draft: "RASCUNHO",
};

export function getStatusLabel(status: string) {
  return statusLabels[status] ?? status.toUpperCase();
}

export function getSessionStatusTone(status: string) {
  if (status === "interrupted") {
    return "bg-[color:color-mix(in_srgb,var(--quizzy-warning)_10%,white)] text-[var(--quizzy-warning)]";
  }

  if (status === "playing" || status === "question_result") {
    return "bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] text-[var(--quizzy-success)]";
  }

  if (status === "countdown") {
    return "bg-[color:color-mix(in_srgb,var(--quizzy-navy)_10%,white)] text-[var(--quizzy-navy)]";
  }

  return "bg-[var(--quizzy-surface)] text-[var(--quizzy-muted)]";
}

export function formatDate(value: Date | null) {
  if (!value) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function formatEventType(eventType: string) {
  return eventType
    .split(".")
    .map((chunk) =>
      chunk.length > 0 ? chunk[0]!.toUpperCase() + chunk.slice(1) : chunk,
    )
    .join(" ");
}
