const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
const BRAZILIAN_LOCALE = "pt-BR";

export function formatDateTime(value: Date | number | null) {
  if (!value) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat(BRAZILIAN_LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(value);
}

export function formatTime(value: Date | number | null) {
  if (!value) {
    return "Não definido";
  }

  return new Intl.DateTimeFormat(BRAZILIAN_LOCALE, {
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(value);
}

export { SAO_PAULO_TIME_ZONE, BRAZILIAN_LOCALE };
