"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  EmptyStateCard,
  FieldPanel,
  MetricCard,
  SectionHeading,
  StatusAlert,
  SurfaceCard,
} from "@/components/phase-one-ui";
import type { SaveQuizState } from "../../actions";

type EditorQuestion = {
  id: string;
  type: "multiple_choice" | "true_false";
  imageUrl: string | null;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimitSeconds: number;
};

type BrandingState = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  backgroundImageUrl: string | null;
  logoUrl: string | null;
};

type QuizEditorProps = {
  branding: BrandingState;
  description: string;
  initialQuestions: EditorQuestion[];
  liveSessionAction: (formData: FormData) => void;
  quizId: string;
  saveAction: (
    state: SaveQuizState,
    formData: FormData,
  ) => Promise<SaveQuizState>;
  individualSessionDefaults: {
    maxAttempts: number;
    requireParticipantEmail?: boolean;
  };
  sessionSummary: {
    activeLiveCount: number;
    latestLivePin: string | null;
    latestShareToken: string | null;
  };
  startIndividualSessionAction: (formData: FormData) => void;
  status: string;
  title: string;
};

const initialSaveState: SaveQuizState = {
  status: "idle",
};

const fontOptions = [
  "DM Sans",
  "Montserrat",
  "Raleway",
  "Playfair Display",
  "Space Grotesk",
];

function buildDefaultIndividualEndsAtValue() {
  const value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const timezoneOffsetMs = value.getTimezoneOffset() * 60 * 1000;

  return new Date(value.getTime() - timezoneOffsetMs)
    .toISOString()
    .slice(0, 16);
}

const acceptedImageTypes =
  "image/png,image/jpeg,image/webp,image/gif,image/avif";

type ContrastWarning = {
  key: keyof Pick<
    BrandingState,
    "accentColor" | "primaryColor" | "secondaryColor"
  >;
  label: string;
  ratio: number;
  suggestion: string;
};

function normalizeHexColor(value: string) {
  const hex = value.trim().replace("#", "");

  if (hex.length !== 6) {
    return null;
  }

  const parsed = Number.parseInt(hex, 16);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return {
    blue: parsed & 255,
    green: (parsed >> 8) & 255,
    red: (parsed >> 16) & 255,
  };
}

function channelToLinear(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hex: string) {
  const rgb = normalizeHexColor(hex);

  if (!rgb) {
    return 0;
  }

  return (
    0.2126 * channelToLinear(rgb.red) +
    0.7152 * channelToLinear(rgb.green) +
    0.0722 * channelToLinear(rgb.blue)
  );
}

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mixColors(source: string, target: string, amount: number) {
  const sourceRgb = normalizeHexColor(source);
  const targetRgb = normalizeHexColor(target);

  if (!sourceRgb || !targetRgb) {
    return source;
  }

  return rgbToHex(
    sourceRgb.red + (targetRgb.red - sourceRgb.red) * amount,
    sourceRgb.green + (targetRgb.green - sourceRgb.green) * amount,
    sourceRgb.blue + (targetRgb.blue - sourceRgb.blue) * amount,
  );
}

function suggestAccessibleColor(source: string, background: string) {
  const targets = ["#0b1220", "#ffffff"];
  let bestCandidate = source;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const target of targets) {
    for (let step = 1; step <= 20; step += 1) {
      const candidate = mixColors(source, target, step / 20);
      const ratio = getContrastRatio(candidate, background);

      if (ratio >= 4.5 && step < bestDistance) {
        bestCandidate = candidate;
        bestDistance = step;
      }
    }
  }

  return bestCandidate;
}

function AssetUploadField({
  assetType,
  currentUrl,
  label,
  onClear,
  onUploaded,
  quizId,
  questionId,
}: {
  assetType: "branding-background" | "branding-logo" | "question-image";
  currentUrl: string | null;
  label: string;
  onClear: () => void;
  onUploaded: (url: string) => void;
  quizId: string;
  questionId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("assetType", assetType);
      formData.set("file", file);

      if (questionId) {
        formData.set("questionId", questionId);
      }

      const response = await fetch(`/api/quizzes/${quizId}/assets`, {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json()) as
        | { error?: string; url?: string }
        | undefined;

      if (!response.ok || !payload?.url) {
        const message =
          payload?.error === "unsupported_type"
            ? "Envie PNG, JPG, WEBP, GIF ou AVIF."
            : payload?.error === "invalid_size"
              ? "A imagem precisa ter ate 2 MB."
              : "Nao foi possivel concluir o upload agora.";

        throw new Error(message);
      }

      onUploaded(payload.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Nao foi possivel concluir o upload agora.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <FieldPanel className="space-y-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#22304a]">{label}</p>
          <p className="text-xs text-[#61708c]">
            PNG, JPG, WEBP, GIF ou AVIF com ate 2 MB.
          </p>
        </div>
        {currentUrl ? (
          <button
            className="rounded-full border border-[#d7e3f0] px-3 py-1 text-xs font-semibold text-[#22304a]"
            onClick={onClear}
            type="button"
          >
            Remover
          </button>
        ) : null}
      </div>

      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={label}
          className="max-h-48 w-full rounded-xl border border-[#d7e3f0] object-cover"
          src={currentUrl}
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[#cad5e3] bg-[#f8fbff] text-sm text-[#61708c]">
          Nenhuma imagem enviada
        </div>
      )}

      <label className="inline-flex cursor-pointer rounded-full bg-[#10233f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3557]">
        {isUploading ? "Enviando..." : "Escolher imagem"}
        <input
          accept={acceptedImageTypes}
          className="sr-only"
          disabled={isUploading}
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {error ? (
        <StatusAlert tone="error">{error}</StatusAlert>
      ) : null}
    </FieldPanel>
  );
}

function SubmitButton({
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
          ? "rounded-full bg-[#10233f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3557] disabled:opacity-60"
          : "rounded-full border border-[#d2d8e5] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-white disabled:opacity-60"
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

function SessionButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Preparando..." : children}
    </button>
  );
}

export function QuizEditor({
  branding: initialBranding,
  description,
  initialQuestions,
  individualSessionDefaults,
  liveSessionAction,
  quizId,
  saveAction,
  sessionSummary,
  startIndividualSessionAction,
  status,
  title,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [branding, setBranding] = useState(initialBranding);
  const [defaultIndividualEndsAt] = useState(buildDefaultIndividualEndsAtValue);
  const [saveState, saveFormAction] = useActionState(
    saveAction,
    initialSaveState,
  );

  const previewQuestion = questions[0] ?? {
    id: "preview",
    type: "multiple_choice" as const,
    imageUrl: null,
    question: "Sua primeira pergunta vai aparecer aqui.",
    options: ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
    correctIndex: 0,
    timeLimitSeconds: 20,
  };
  const contrastWarnings = useMemo<ContrastWarning[]>(() => {
    const warnings: ContrastWarning[] = [];
    const checks: Array<{
      background: string;
      foreground: string;
      key: ContrastWarning["key"];
      label: string;
    }> = [
      {
        background: branding.primaryColor,
        foreground: "#ffffff",
        key: "primaryColor",
        label: "Texto branco sobre a cor primaria",
      },
      {
        background: branding.secondaryColor,
        foreground: "#ffffff",
        key: "secondaryColor",
        label: "Texto branco sobre a cor secundaria",
      },
      {
        background: branding.accentColor,
        foreground: "#10233f",
        key: "accentColor",
        label: "Texto navy sobre a cor de destaque",
      },
    ];

    for (const check of checks) {
      const ratio = getContrastRatio(check.foreground, check.background);

      if (ratio < 4.5) {
        warnings.push({
          key: check.key,
          label: check.label,
          ratio,
          suggestion: suggestAccessibleColor(
            branding[check.key],
            check.foreground,
          ),
        });
      }
    }

    return warnings;
  }, [branding]);
  const warningsByKey = useMemo(() => {
    return contrastWarnings.reduce<
      Partial<Record<ContrastWarning["key"], ContrastWarning[]>>
    >((accumulator, warning) => {
      accumulator[warning.key] = [...(accumulator[warning.key] ?? []), warning];
      return accumulator;
    }, {});
  }, [contrastWarnings]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard>
          <SectionHeading
            eyebrow="Operar"
            helper="Publicacao, PIN live e sessao individual ficam juntos aqui para evitar que a criacao de conteudo se misture com a operacao."
            title="Publicar e iniciar"
            trailing={
              <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                {status}
              </span>
            }
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MetricCard
              helper="Quantidade de salas live que ainda pedem acompanhamento."
              label="Live ativo"
              value={sessionSummary.activeLiveCount}
            />
            <MetricCard
              accent="amber"
              helper="Ultimo codigo pronto para ser compartilhado com a sala."
              label="Ultimo PIN"
              value={sessionSummary.latestLivePin ?? "--"}
            />
            <MetricCard
              helper="Ultimo link individual gerado para tarefa assincrona."
              label="Sessao individual"
              value={
                sessionSummary.latestShareToken
                  ? `${sessionSummary.latestShareToken.slice(0, 12)}...`
                  : "Nenhuma"
              }
            />
          </div>
          <div className="mt-6 flex flex-col gap-4">
            <form action={liveSessionAction}>
              <input name="quizId" type="hidden" value={quizId} />
              <SessionButton>Iniciar sessao live</SessionButton>
            </form>
            <form
              action={startIndividualSessionAction}
              className="rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] p-4"
            >
              <input name="quizId" type="hidden" value={quizId} />
              <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <label className="space-y-2 text-sm font-medium text-[#22304a]">
                  <span>Prazo final</span>
                  <input
                    className="w-full rounded-xl border border-[#cad5e3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                    defaultValue={defaultIndividualEndsAt}
                    name="endsAt"
                    type="datetime-local"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-[#22304a]">
                  <span>Tentativas</span>
                  <select
                    className="w-full rounded-xl border border-[#cad5e3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                    defaultValue={String(individualSessionDefaults.maxAttempts)}
                    name="maxAttempts"
                  >
                    {[1, 2, 3].map((attempts) => (
                      <option key={attempts} value={attempts}>
                        {attempts}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[#cad5e3] bg-white px-4 py-3 text-sm font-medium text-[#22304a]">
                  <input
                    className="accent-[#0f766e]"
                    defaultChecked={
                      individualSessionDefaults.requireParticipantEmail ?? false
                    }
                    name="requireParticipantEmail"
                    type="checkbox"
                  />
                  Exigir email do participante
                </label>
                <SessionButton>Criar sessao individual</SessionButton>
              </div>
            </form>
          </div>
        </SurfaceCard>

        <div
          className={
            contrastWarnings.length > 0
              ? "overflow-hidden rounded-[1.75rem] border border-[#fca5a5] shadow-[0_28px_90px_rgba(16,35,63,0.12)] ring-2 ring-[#fecaca]"
              : "overflow-hidden rounded-[1.75rem] border border-white/50 shadow-[0_28px_90px_rgba(16,35,63,0.12)]"
          }
          style={{
            backgroundImage: branding.backgroundImageUrl
              ? `linear-gradient(145deg, rgba(16,35,63,0.72), rgba(15,118,110,0.72)), url(${branding.backgroundImageUrl})`
              : `linear-gradient(145deg, ${branding.secondaryColor}, ${branding.primaryColor})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            color: "#ffffff",
            fontFamily: branding.fontFamily,
          }}
        >
          <div className="border-b border-white/15 px-6 py-5">
            {contrastWarnings.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-white/10 bg-[#7f1d1d]/45 px-4 py-3 text-sm text-white">
                Contraste insuficiente detectado no preview. Ajuste as cores
                marcadas abaixo para chegar a pelo menos 4.5:1.
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                Preview — projetor e lobby
              </p>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Logo do quiz"
                  className="h-10 w-auto rounded-lg bg-white/10 p-2"
                  src={branding.logoUrl}
                />
              ) : null}
            </div>
            <h2 className="mt-3 text-3xl font-semibold">
              {title || "Novo quiz"}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              O branding precisa aparecer com clareza antes de chegar ao lobby,
              pergunta e ranking. Este preview e a referencia principal para a
              experiencia do participante.
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Fonte
                </p>
                <p className="mt-2 text-sm font-semibold">{branding.fontFamily}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Destaque
                </p>
                <p className="mt-2 text-sm font-semibold">{branding.accentColor}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Estrutura
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {questions.length} pergunta(s)
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-white/8 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  Pergunta 1
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  {previewQuestion.timeLimitSeconds}s
                </span>
              </div>
              {previewQuestion.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Imagem da pergunta"
                  className="mb-5 max-h-56 w-full rounded-2xl object-cover"
                  src={previewQuestion.imageUrl}
                />
              ) : null}
              <h3 className="text-2xl font-semibold leading-tight">
                {previewQuestion.question || "Digite o enunciado da pergunta"}
              </h3>
              <div className="mt-5 grid gap-3">
                {previewQuestion.options.map((option, optionIndex) => (
                  <div
                    key={`${previewQuestion.id}-${optionIndex}`}
                    className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-medium"
                  >
                    {option || `Opcao ${optionIndex + 1}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <form action={saveFormAction} className="space-y-6">
        <input name="quizId" type="hidden" value={quizId} />
        <input
          name="questionsPayload"
          type="hidden"
          value={JSON.stringify(questions)}
        />
        <input
          name="brandingPayload"
          type="hidden"
          value={JSON.stringify(branding)}
        />

        {saveState.status !== "idle" ? (
          <StatusAlert tone={saveState.status === "success" ? "success" : "error"}>
            {saveState.message}
          </StatusAlert>
        ) : null}

        <SurfaceCard>
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <SectionHeading
                eyebrow="Construir conteudo"
                helper="Defina titulo, descricao e estrutura do quiz antes de descer para cada pergunta individual."
                title="Base editorial"
              />
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-[#22304a]"
                  htmlFor="title"
                >
                  Titulo do quiz
                </label>
                <input
                  className="w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                  defaultValue={title}
                  id="title"
                  name="title"
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-[#22304a]"
                  htmlFor="description"
                >
                  Descricao
                </label>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                  defaultValue={description}
                  id="description"
                  name="description"
                />
              </div>
            </div>

            <FieldPanel className="space-y-4">
              <SectionHeading
                eyebrow="Aplicar marca"
                helper="Escolha cores, fonte e assets com foco na leitura final do participante, nao so no preenchimento tecnico."
                title="Identidade visual do quiz"
              />
              {(
                [
                  ["primaryColor", "Cor primaria", ["#0f766e","#1d4ed8","#7c3aed","#be123c","#b45309","#166534"]],
                  ["secondaryColor", "Cor secundaria", ["#10233f","#1e3a5f","#1e1b4b","#3b0764","#1c1917","#052e16"]],
                  ["accentColor", "Cor de destaque", ["#f59e0b","#f97316","#ef4444","#10b981","#3b82f6","#a855f7"]],
                ] as const
              ).map(([key, label, swatches]) => (
                <div
                  key={key}
                  className="space-y-3 rounded-2xl bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(216,226,238,0.92)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[#22304a]">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Native color picker */}
                      <div className="relative h-8 w-8 overflow-hidden rounded-full border border-[#d5deea]">
                        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ backgroundColor: branding[key] }} />
                        <input
                          className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer opacity-0"
                          type="color"
                          value={branding[key]}
                          onChange={(event) =>
                            setBranding((currentBranding) => ({
                              ...currentBranding,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      {/* Hex text input */}
                      <input
                        className="w-24 rounded-lg border border-[#d5deea] px-2 py-1 text-right font-mono text-sm text-[#22304a] outline-none focus:border-[#0f766e]"
                        maxLength={7}
                        type="text"
                        value={branding[key]}
                        onChange={(event) => {
                          const val = event.target.value;
                          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                            setBranding((currentBranding) => ({
                              ...currentBranding,
                              [key]: val,
                            }));
                          } else {
                            setBranding((currentBranding) => ({
                              ...currentBranding,
                              [key]: val,
                            }));
                          }
                        }}
                        onBlur={(event) => {
                          if (!/^#[0-9a-fA-F]{6}$/.test(event.target.value)) {
                            setBranding((currentBranding) => ({
                              ...currentBranding,
                              [key]: currentBranding[key],
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                  {/* Preset swatches */}
                  <div className="flex gap-2">
                    {swatches.map((swatch) => (
                      <button
                        key={swatch}
                        className="h-6 w-6 flex-shrink-0 rounded-full border-2 transition hover:scale-110"
                        style={{
                          backgroundColor: swatch,
                          borderColor: branding[key] === swatch ? "#0f766e" : "transparent",
                        }}
                        title={swatch}
                        type="button"
                        onClick={() =>
                          setBranding((currentBranding) => ({
                            ...currentBranding,
                            [key]: swatch,
                          }))
                        }
                      />
                    ))}
                  </div>
                  {(warningsByKey[key] ?? []).map((warning) => (
                    <div
                      key={`${warning.key}-${warning.label}`}
                      className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]"
                    >
                      <p className="font-semibold">
                        Contraste insuficiente: {warning.ratio.toFixed(2)}:1
                      </p>
                      <p className="mt-1 text-xs leading-5">
                        {warning.label}. Sugestao: {warning.suggestion}
                      </p>
                    </div>
                  ))}
                  {(warningsByKey[key] ?? []).length === 0 ? (
                    <p className="text-xs text-[#61708c]">
                      {key === "accentColor"
                        ? "Aparece em chips, botões e badges do lobby live."
                        : "Sem alerta de contraste no preview."}
                    </p>
                  ) : null}
                </div>
              ))}
              <label className="space-y-2 text-sm font-medium text-[#22304a]">
                <span>Fonte</span>
                <select
                  className="w-full rounded-xl border border-[#cad5e3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                  value={branding.fontFamily}
                  onChange={(event) =>
                    setBranding((currentBranding) => ({
                      ...currentBranding,
                      fontFamily: event.target.value,
                    }))
                  }
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <AssetUploadField
                assetType="branding-logo"
                currentUrl={branding.logoUrl}
                label="Logo"
                onClear={() =>
                  setBranding((currentBranding) => ({
                    ...currentBranding,
                    logoUrl: null,
                  }))
                }
                onUploaded={(url) =>
                  setBranding((currentBranding) => ({
                    ...currentBranding,
                    logoUrl: url,
                  }))
                }
                quizId={quizId}
              />
              <AssetUploadField
                assetType="branding-background"
                currentUrl={branding.backgroundImageUrl}
                label="Background"
                onClear={() =>
                  setBranding((currentBranding) => ({
                    ...currentBranding,
                    backgroundImageUrl: null,
                  }))
                }
                onUploaded={(url) =>
                  setBranding((currentBranding) => ({
                    ...currentBranding,
                    backgroundImageUrl: url,
                  }))
                }
                quizId={quizId}
              />
            </FieldPanel>
          </div>
        </SurfaceCard>

        <section className="space-y-4">
          <SectionHeading
            eyebrow="Perguntas"
            helper="Cada bloco abaixo representa uma etapa do quiz com tempo, resposta correta e assets opcionais."
            title="Construir o fluxo da sessao"
          />
          {questions.length === 0 ? (
            <EmptyStateCard
              description="Adicione a primeira pergunta para transformar o rascunho em uma sessao pronta para publicar e operar."
              title="Nenhuma pergunta no quiz ainda"
            />
          ) : null}
          {questions.map((question, index) => (
            <SurfaceCard
              key={question.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                    Pergunta {index + 1}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#132238]">
                    Editor da pergunta
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#61708c]">
                    Ajuste tipo, enunciado, tempo e resposta correta com foco em
                    clareza na tela do participante.
                  </p>
                </div>
                <button
                  className="rounded-full border border-[#f1c6c2] px-4 py-2 text-sm font-medium text-[#b42318] transition hover:bg-[#fff5f4]"
                  onClick={() =>
                    setQuestions((currentQuestions) =>
                      currentQuestions.length === 1
                        ? currentQuestions
                        : currentQuestions.filter(
                            (item) => item.id !== question.id,
                          ),
                    )
                  }
                  type="button"
                >
                  Remover
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="space-y-2 text-sm font-medium text-[#22304a]">
                  <span>Tipo</span>
                  <select
                    className="w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                    value={question.type}
                    onChange={(event) => {
                      const nextType = event.target
                        .value as EditorQuestion["type"];

                      setQuestions((currentQuestions) =>
                        currentQuestions.map((item) =>
                          item.id === question.id
                            ? {
                                ...item,
                                type: nextType,
                                options:
                                  nextType === "true_false"
                                    ? ["Verdadeiro", "Falso"]
                                    : item.options.length >= 2
                                      ? item.options
                                      : [
                                          "Opcao A",
                                          "Opcao B",
                                          "Opcao C",
                                          "Opcao D",
                                        ],
                                correctIndex: 0,
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    <option value="multiple_choice">Multipla escolha</option>
                    <option value="true_false">Verdadeiro / Falso</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-[#22304a]">
                  <span>Enunciado</span>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                    value={question.question}
                    onChange={(event) =>
                      setQuestions((currentQuestions) =>
                        currentQuestions.map((item) =>
                          item.id === question.id
                            ? { ...item, question: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>

                <AssetUploadField
                  assetType="question-image"
                  currentUrl={question.imageUrl}
                  label="Imagem opcional da pergunta"
                  onClear={() =>
                    setQuestions((currentQuestions) =>
                      currentQuestions.map((item) =>
                        item.id === question.id
                          ? { ...item, imageUrl: null }
                          : item,
                      ),
                    )
                  }
                  onUploaded={(url) =>
                    setQuestions((currentQuestions) =>
                      currentQuestions.map((item) =>
                        item.id === question.id
                          ? { ...item, imageUrl: url }
                          : item,
                      ),
                    )
                  }
                  questionId={question.id}
                  quizId={quizId}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-[#22304a]">
                    <span>Tempo limite</span>
                    <select
                      className="w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                      value={question.timeLimitSeconds}
                      onChange={(event) =>
                        setQuestions((currentQuestions) =>
                          currentQuestions.map((item) =>
                            item.id === question.id
                              ? {
                                  ...item,
                                  timeLimitSeconds: Number(event.target.value),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {[10, 20, 30, 60].map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {seconds}s
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-[#22304a]">
                    <span>Resposta correta</span>
                    <select
                      className="w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                      value={question.correctIndex}
                      onChange={(event) =>
                        setQuestions((currentQuestions) =>
                          currentQuestions.map((item) =>
                            item.id === question.id
                              ? {
                                  ...item,
                                  correctIndex: Number(event.target.value),
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {question.options.map((option, optionIndex) => (
                        <option
                          key={`${question.id}-${optionIndex}`}
                          value={optionIndex}
                        >
                          {option || `Opcao ${optionIndex + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <FieldPanel className="grid gap-3 bg-[color:color-mix(in_srgb,var(--quizzy-surface)_58%,white)]">
                  <p className="text-sm font-medium text-[#22304a]">
                    Alternativas
                  </p>
                  {question.options.map((option, optionIndex) => (
                    <input
                      key={`${question.id}-option-${optionIndex}`}
                      className="w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
                      disabled={question.type === "true_false"}
                      value={option}
                      onChange={(event) =>
                        setQuestions((currentQuestions) =>
                          currentQuestions.map((item) =>
                            item.id === question.id
                              ? {
                                  ...item,
                                  options: item.options.map(
                                    (currentOption, currentIndex) =>
                                      currentIndex === optionIndex
                                        ? event.target.value
                                        : currentOption,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                      placeholder={`Opcao ${optionIndex + 1}`}
                    />
                  ))}
                </FieldPanel>
              </div>
            </SurfaceCard>
          ))}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            className="rounded-full border border-dashed border-[#9db0ca] px-5 py-3 text-sm font-semibold text-[#10233f] transition hover:bg-white"
            onClick={() =>
              setQuestions((currentQuestions) => [
                ...currentQuestions,
                {
                  id: crypto.randomUUID(),
                  type: "multiple_choice",
                  imageUrl: null,
                  question: "",
                  options: ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
                  correctIndex: 0,
                  timeLimitSeconds: 20,
                },
              ])
            }
            type="button"
          >
            Adicionar pergunta
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton intent="draft">Salvar rascunho</SubmitButton>
            <SubmitButton intent="publish">Publicar versao</SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
