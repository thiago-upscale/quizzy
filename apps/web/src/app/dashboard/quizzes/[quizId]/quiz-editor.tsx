"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  MoreVertical,
  ChevronLeft,
  Trash2,
  Edit3,
  Palette,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Activity,
  Plus
} from "lucide-react";
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
  deleteQuizAction: (formData: FormData) => Promise<void>;
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
            className="rounded-full border border-[#d7e3f0] px-3 py-1 text-xs font-semibold text-[#22304a] cursor-pointer hover:bg-slate-50 transition"
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

      <label className="inline-flex cursor-pointer rounded-xl bg-[#10233f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3557]">
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

export function QuizEditor({
  branding: initialBranding,
  description,
  initialQuestions,
  individualSessionDefaults,
  liveSessionAction,
  quizId,
  saveAction,
  deleteQuizAction,
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

  const [activeTab, setActiveTab] = useState<"questions" | "branding" | "operation">("questions");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    initialQuestions[0]?.id ?? null
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const isQuestionComplete = (q: EditorQuestion) => {
    if (!q.question.trim()) return false;
    if (q.type === "multiple_choice") {
      return q.options.every((opt) => opt.trim().length > 0);
    }
    return true;
  };

  const previewQuestion = questions[0] ?? {
    id: "preview",
    type: "multiple_choice" as const,
    imageUrl: null,
    question: "Sua primeira pergunta vai aparecer aqui.",
    options: ["Opção A", "Opção B", "Opção C", "Opção D"],
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
      {/* Header do Quiz — Simplificado */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#132238] max-w-[200px] sm:max-w-md truncate">
              {title}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              status === "published" 
                ? "bg-[#ecfdf3] text-[#0f766e]" 
                : "bg-slate-100 text-slate-700"
            }`}>
              {status === "published" ? "Publicado" : "Rascunho"}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            type="button"
            aria-label="Opções do quiz"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-20">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    const confirmed = window.confirm(
                      `Tem certeza que deseja excluir o quiz "${title}"?\n\nEsta ação removerá permanentemente o quiz, todas as sessões e os resultados associados. Não há como desfazer.`
                    );
                    if (confirmed) {
                      const formData = new FormData();
                      formData.set("quizId", quizId);
                      deleteQuizAction(formData);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#b91c1c] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir quiz
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "questions"
              ? "border-[#0f766e] text-[#0f766e]"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Perguntas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "branding"
              ? "border-[#0f766e] text-[#0f766e]"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Palette className="w-4 h-4" />
          Branding
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("operation")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "operation"
              ? "border-[#0f766e] text-[#0f766e]"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <Play className="w-4 h-4" />
          Operação
        </button>
      </div>

      {/* Save Action Status Alert */}
      {saveState.status !== "idle" ? (
        <StatusAlert tone={saveState.status === "success" ? "success" : "error"}>
          {saveState.message}
        </StatusAlert>
      ) : null}

      {/* Tabs Contents */}
      {(activeTab === "questions" || activeTab === "branding") ? (
        <form action={saveFormAction} className="space-y-6 pb-24">
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

          {/* --- ABA PERGUNTAS --- */}
          {activeTab === "questions" && (
            <div className="space-y-6">
              {/* Geral / Base Editorial */}
              <SurfaceCard>
                <SectionHeading
                  eyebrow="Construir conteúdo"
                  helper="Defina título e descrição do quiz antes de gerenciar as perguntas individuais."
                  title="Informações gerais"
                />
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold text-[#22304a]"
                      htmlFor="title"
                    >
                      Título do quiz
                    </label>
                    <input
                      className="w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
                      defaultValue={title}
                      id="title"
                      name="title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold text-[#22304a]"
                      htmlFor="description"
                    >
                      Descrição
                    </label>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-[#cad5e3] px-4 py-3 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20"
                      defaultValue={description}
                      id="description"
                      name="description"
                    />
                  </div>
                </div>
              </SurfaceCard>

              {/* Perguntas Section */}
              <section className="space-y-4">
                <SectionHeading
                  eyebrow="Perguntas"
                  helper="Cada bloco abaixo representa uma etapa do quiz com tempo, resposta e imagem opcionais."
                  title="Construir o fluxo da sessão"
                />
                {questions.length === 0 ? (
                  <EmptyStateCard
                    description="Adicione a primeira pergunta para transformar o rascunho em uma sessão pronta para operar."
                    title="Nenhuma pergunta no quiz ainda"
                  />
                ) : null}

                {questions.map((question, index) => {
                  const complete = isQuestionComplete(question);
                  const isExpanded = expandedQuestionId === question.id;

                  return (
                    <div
                      key={question.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow"
                    >
                      {/* Header Colapsável */}
                      <div
                        onClick={() =>
                          setExpandedQuestionId(isExpanded ? null : question.id)
                        }
                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                          isExpanded ? "bg-slate-50 border-b border-slate-100" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-sm font-semibold text-[#0f766e] shrink-0">
                            Q{index + 1}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800 truncate max-w-xs sm:max-w-md md:max-w-lg">
                              {question.question.trim() ? (
                                question.question
                              ) : (
                                <span className="italic text-slate-400">Pergunta sem enunciado</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                                {question.type === "true_false"
                                  ? "Verd. / Falso"
                                  : "Múltipla escolha"}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {question.timeLimitSeconds}s
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {complete ? (
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
                              title="Preenchida"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50"
                              title="Campos pendentes"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            </span>
                          )}
                          <button
                            type="button"
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Conteúdo Expandido */}
                      {isExpanded && (
                        <div className="p-5 space-y-5 bg-white border-t border-slate-100">
                          <div className="grid gap-4">
                            <label className="space-y-2 text-sm font-semibold text-[#22304a]">
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
                                <option value="multiple_choice">Múltipla escolha</option>
                                <option value="true_false">Verdadeiro / Falso</option>
                              </select>
                            </label>

                            <label className="space-y-2 text-sm font-semibold text-[#22304a]">
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
                                placeholder="Digite a pergunta..."
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
                              <label className="space-y-2 text-sm font-semibold text-[#22304a]">
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

                              <label className="space-y-2 text-sm font-semibold text-[#22304a]">
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
                                      {option || `Opção ${optionIndex + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <FieldPanel className="grid gap-3 bg-[color:color-mix(in_srgb,var(--quizzy-surface)_58%,white)]">
                              <p className="text-sm font-bold text-[#22304a]">
                                Alternativas de resposta
                              </p>
                              {question.options.map((option, optionIndex) => (
                                <input
                                  key={`${question.id}-option-${optionIndex}`}
                                  className="w-full rounded-xl border border-[#cad5e3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f766e]"
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
                                  placeholder={`Alternativa ${optionIndex + 1}`}
                                />
                              ))}
                            </FieldPanel>
                          </div>

                          <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                              onClick={() =>
                                setQuestions((currentQuestions) =>
                                  currentQuestions.length === 1
                                    ? currentQuestions
                                    : currentQuestions.filter(
                                        (item) => item.id !== question.id,
                                      ),
                                )
                              }
                              disabled={questions.length === 1}
                              type="button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remover pergunta
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>

              <button
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#9db0ca] bg-white px-5 py-4 text-sm font-semibold text-[#10233f] transition hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  const newId = crypto.randomUUID();
                  setQuestions((currentQuestions) => [
                    ...currentQuestions,
                    {
                      id: newId,
                      type: "multiple_choice",
                      imageUrl: null,
                      question: "",
                      options: ["Opção A", "Opção B", "Opção C", "Opção D"],
                      correctIndex: 0,
                      timeLimitSeconds: 20,
                    },
                  ]);
                  setExpandedQuestionId(newId);
                }}
                type="button"
              >
                <Plus className="w-4 h-4" />
                Adicionar pergunta
              </button>
            </div>
          )}

          {/* --- ABA BRANDING --- */}
          {activeTab === "branding" && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
              {/* Controles do Branding */}
              <FieldPanel className="space-y-6">
                <SectionHeading
                  eyebrow="Aplicar marca"
                  helper="Escolha cores, fonte e imagens com foco na leitura final do participante."
                  title="Identidade visual do quiz"
                />

                {(
                  [
                    ["primaryColor", "Cor primária", ["#0f766e","#1d4ed8","#7c3aed","#be123c","#b45309","#166534"]],
                    ["secondaryColor", "Cor secundária", ["#10233f","#1e3a5f","#1e1b4b","#3b0764","#1c1917","#052e16"]],
                    ["accentColor", "Cor de destaque", ["#f59e0b","#f97316","#ef4444","#10b981","#3b82f6","#a855f7"]],
                  ] as const
                ).map(([key, label, swatches]) => (
                  <div
                    key={key}
                    className="space-y-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-[#22304a]">
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
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
                        <input
                          className="w-24 rounded-lg border border-[#d5deea] px-2 py-1 text-right font-mono text-xs text-[#22304a] outline-none focus:border-[#0f766e]"
                          maxLength={7}
                          type="text"
                          value={branding[key]}
                          onChange={(event) => {
                            const val = event.target.value;
                            setBranding((currentBranding) => ({
                              ...currentBranding,
                              [key]: val,
                            }));
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

                    <div className="flex gap-2 flex-wrap">
                      {swatches.map((swatch) => (
                        <button
                          key={swatch}
                          className="h-6 w-6 flex-shrink-0 rounded-full border-2 transition hover:scale-110 cursor-pointer"
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
                        className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-xs text-[#9a3412]"
                      >
                        <p className="font-bold">
                          Contraste insuficiente: {warning.ratio.toFixed(2)}:1
                        </p>
                        <p className="mt-0.5 leading-relaxed text-[11px]">
                          {warning.label}. Sugestão: {warning.suggestion}
                        </p>
                      </div>
                    ))}
                    {(warningsByKey[key] ?? []).length === 0 ? (
                      <p className="text-[11px] text-[#61708c]">
                        {key === "accentColor"
                          ? "Aparece em chips, botões e badges do lobby live."
                          : "Nível de contraste adequado."}
                      </p>
                    ) : null}
                  </div>
                ))}

                <label className="space-y-2 text-sm font-medium text-[#22304a] block">
                  <span>Fonte da identidade</span>
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
                  label="Logo da marca"
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
                  label="Imagem de Fundo"
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

              {/* Preview (Sticky) */}
              <div className="lg:sticky lg:top-6 space-y-4">
                <div
                  className="overflow-hidden rounded-[1.75rem] border border-white/50 shadow-xl"
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
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
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
                    <h2 className="mt-3 text-2xl font-bold truncate">
                      {title || "Novo quiz"}
                    </h2>
                  </div>
                  <div className="space-y-4 px-6 py-5">
                    <div className="grid gap-2 grid-cols-3 text-center">
                      <div className="rounded-xl bg-white/10 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                          Fonte
                        </p>
                        <p className="mt-0.5 text-xs font-semibold truncate">{branding.fontFamily}</p>
                      </div>
                      <div className="rounded-xl bg-white/10 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                          Destaque
                        </p>
                        <p className="mt-0.5 text-xs font-semibold truncate">{branding.accentColor}</p>
                      </div>
                      <div className="rounded-xl bg-white/10 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                          Estrutura
                        </p>
                        <p className="mt-0.5 text-xs font-semibold">
                          {questions.length} perguntas
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#10233f]"
                          style={{ backgroundColor: branding.accentColor }}
                        >
                          Pergunta 1
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#10233f]"
                          style={{ backgroundColor: branding.accentColor }}
                        >
                          {previewQuestion.timeLimitSeconds}s
                        </span>
                      </div>
                      {previewQuestion.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt="Imagem da pergunta"
                          className="mb-3 max-h-40 w-full rounded-xl object-cover"
                          src={previewQuestion.imageUrl}
                        />
                      ) : null}
                      <h3 className="text-lg font-bold leading-snug truncate">
                        {previewQuestion.question || "Digite o enunciado da pergunta"}
                      </h3>
                      <div className="mt-3 grid gap-2">
                        {previewQuestion.options.map((option, optionIndex) => (
                          <div
                            key={`${previewQuestion.id}-${optionIndex}`}
                            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold"
                          >
                            {option || `Opção ${optionIndex + 1}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/80 backdrop-blur-md py-4 px-6 shadow-lg">
            <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <span>{questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}</span>
                <span className="text-slate-300">•</span>
                <span className="capitalize">{status === "published" ? "Publicado" : "Rascunho"}</span>
              </div>
              <div className="flex items-center gap-3">
                <SubmitButton intent="draft">Salvar rascunho</SubmitButton>
                <SubmitButton intent="publish">Publicar versão</SubmitButton>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* --- ABA OPERAÇÃO --- */
        <div className="space-y-6">
          {/* Status do Quiz */}
          <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Status de Publicação</h3>
              <p className="text-xs text-slate-500 mt-0.5">O status determina se participantes externos podem acessar o quiz.</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              status === "published" 
                ? "bg-[#ecfdf3] text-[#0f766e]" 
                : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status === "published" ? "bg-[#0f766e]" : "bg-slate-400"}`} />
              {status === "published" ? "Publicado e Ativo" : "Rascunho"}
            </span>
          </div>

          {/* Atividade Recente condensada */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-700">
              {sessionSummary.activeLiveCount} {sessionSummary.activeLiveCount === 1 ? "sala ativa" : "salas ativas"}
            </span>
            <span className="text-slate-300">•</span>
            <span>Último PIN: <strong className="font-bold text-slate-700">{sessionSummary.latestLivePin ?? "--"}</strong></span>
            {sessionSummary.latestShareToken && (
              <>
                <span className="text-slate-300">•</span>
                <span>Link individual: <strong className="font-bold text-slate-700">{sessionSummary.latestShareToken.slice(0, 12)}...</strong></span>
              </>
            )}
          </div>

          {/* Modos de Operação */}
          <div className="grid gap-6 md:grid-cols-2">
            <SurfaceCard className="flex flex-col justify-between h-full bg-white border border-slate-200">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[#0f766e] mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Sessão Live em Tempo Real</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Apresente as perguntas em um projetor ou tela compartilhada e permita que os participantes respondam simultaneamente em tempo real.
                  Isso é ideal para eventos ao vivo e dinâmicas de grupo síncronas.
                </p>
              </div>
              <div className="mt-6">
                <form action={liveSessionAction}>
                  <input name="quizId" type="hidden" value={quizId} />
                  <button 
                    type="submit" 
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0f766e] hover:bg-[#115e59] px-5 py-4 text-sm font-semibold text-white transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Sessão Live
                  </button>
                </form>
              </div>
            </SurfaceCard>

            <SurfaceCard className="flex flex-col justify-between h-full bg-white border border-slate-200">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#f59e0b] mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Sessão Individual (Assíncrona)</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Gere um link de compartilhamento para que os participantes respondam de forma independente até o prazo determinado.
                  Perfeito para tarefas de casa, questionários de treinamento ou pesquisas assíncronas.
                </p>
              </div>
              <div className="mt-6">
                <form action={startIndividualSessionAction} className="space-y-4">
                  <input name="quizId" type="hidden" value={quizId} />
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Prazo final</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0f766e]"
                        defaultValue={defaultIndividualEndsAt}
                        name="endsAt"
                        type="datetime-local"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Tentativas</span>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0f766e]"
                        defaultValue={String(individualSessionDefaults.maxAttempts)}
                        name="maxAttempts"
                      >
                        {[1, 2, 3].map((attempts) => (
                          <option key={attempts} value={attempts}>
                            {attempts} {attempts === 1 ? "tentativa" : "tentativas"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 cursor-pointer">
                    <input
                      className="accent-[#0f766e] h-3.5 w-3.5 rounded"
                      defaultChecked={individualSessionDefaults.requireParticipantEmail ?? false}
                      name="requireParticipantEmail"
                      type="checkbox"
                    />
                    <span>Exigir email do participante</span>
                  </label>

                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3.5 text-sm font-semibold text-slate-700 transition-all cursor-pointer"
                  >
                    Criar Link de Acesso
                  </button>
                </form>
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}
    </div>
  );
}
