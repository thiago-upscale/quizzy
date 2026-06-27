"use client";

import { useMemo, useState } from "react";
import { FieldPanel, SectionHeading } from "@/components/phase-one-ui";
import {
  ANSWER_PALETTE,
  brandingBackgroundStyle,
  brandingCssVars,
} from "@/lib/branding-theme";
import type { LiveBranding } from "@/lib/live";
import type {
  BrandingState,
  ContrastWarning,
  EditorQuestion,
} from "./editor-types";
import { fontOptions } from "./editor-types";
import { computeContrastWarnings } from "./color-utils";
import { AssetUploadField } from "./asset-upload-field";

const DIMMING_OPTIONS: Array<{
  value: BrandingState["backgroundDimming"];
  label: string;
}> = [
  { value: "leve", label: "Leve" },
  { value: "medio", label: "Médio" },
  { value: "forte", label: "Forte" },
];

// Faithful, theme-driven mockups: both consume the same brandingCssVars /
// ANSWER_PALETTE as the real display and mobile screens, so the preview matches
// what participants actually see.
function PreviewFrame({
  branding,
  children,
  className,
}: {
  branding: BrandingState;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden text-white ${className ?? ""}`}
      style={{
        ...brandingCssVars(branding as LiveBranding),
        ...brandingBackgroundStyle(branding as LiveBranding),
      }}
    >
      {children}
    </div>
  );
}

function AnswerTiles({ options }: { options: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.slice(0, 4).map((option, index) => {
        const tile = ANSWER_PALETTE[index % ANSWER_PALETTE.length]!;
        return (
          <div
            key={`tile-${index}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-bold leading-tight"
            style={{ backgroundColor: tile.bg, color: tile.fg }}
          >
            <span aria-hidden="true">{tile.icon}</span>
            <span className="line-clamp-2">
              {option || `Opção ${index + 1}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DisplayPreview({
  branding,
  question,
  questionNumber,
}: {
  branding: BrandingState;
  question: EditorQuestion;
  questionNumber: number;
}) {
  return (
    <PreviewFrame
      branding={branding}
      className="aspect-video w-full rounded-[1.5rem] border border-white/40 shadow-xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between bg-white px-4 py-2">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Logo"
              className="h-7 w-auto max-w-[120px] object-contain"
              src={branding.logoUrl}
            />
          ) : (
            <span className="text-xs font-bold text-slate-400">Projetor</span>
          )}
        </div>
        <div className="relative flex flex-1 items-center gap-3 px-4 py-3">
          <div className="flex flex-col items-center gap-1">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white shadow"
              style={{ backgroundColor: "var(--brand-secondary)" }}
            >
              {question.timeLimitSeconds}
            </div>
            <span className="text-[8px] uppercase tracking-widest text-white/60">
              tempo
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
              style={{
                backgroundColor: "var(--brand-accent)",
                color: "var(--brand-on-accent)",
              }}
            >
              {questionNumber > 0 ? `Pergunta ${questionNumber}` : "Pergunta"}
            </span>
            <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-tight">
              {question.question || "Digite o enunciado da pergunta"}
            </h3>
            <div className="mt-2">
              <AnswerTiles options={question.options} />
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ backgroundColor: "var(--brand-secondary)" }}
        >
          <span
            className="rounded px-3 py-1 text-[10px] font-black"
            style={{
              backgroundColor: "var(--brand-accent)",
              color: "var(--brand-on-accent)",
            }}
          >
            Entrar
          </span>
          <span className="text-[9px] text-white/60">PIN 000 000</span>
        </div>
      </div>
    </PreviewFrame>
  );
}

function MobilePreview({
  branding,
  question,
}: {
  branding: BrandingState;
  question: EditorQuestion;
}) {
  return (
    <div className="flex justify-center">
      <PreviewFrame
        branding={branding}
        className="w-[230px] rounded-[2rem] border-4 border-slate-800 shadow-xl"
      >
        <div className="flex min-h-[440px] flex-col gap-3 px-3 py-4">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Logo"
              className="mx-auto h-7 w-auto max-w-[120px] object-contain drop-shadow"
              src={branding.logoUrl}
            />
          ) : null}
          {branding.showQuestionOnMobile ? (
            <div
              className="rounded-2xl bg-white px-3 py-3 text-center"
              style={{ color: "var(--brand-secondary)" }}
            >
              <p className="line-clamp-3 text-sm font-black leading-tight">
                {question.question || "Enunciado da pergunta"}
              </p>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black text-white"
              style={{ backgroundColor: "var(--brand-secondary)" }}
            >
              {question.timeLimitSeconds}
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase"
              style={{
                backgroundColor: "var(--brand-accent)",
                color: "var(--brand-on-accent)",
              }}
            >
              Responda
            </span>
          </div>
          <div className="mt-1 flex-1">
            <AnswerTiles options={question.options} />
          </div>
          <div
            className="rounded-full px-3 py-2 text-center text-[10px] text-white/80"
            style={{ backgroundColor: "var(--brand-secondary)" }}
          >
            PIN 000 000
          </div>
        </div>
      </PreviewFrame>
    </div>
  );
}

type BrandingTabProps = {
  branding: BrandingState;
  questions: EditorQuestion[];
  quizId: string;
  selectedQuestionId: string | null;
  setBranding: React.Dispatch<React.SetStateAction<BrandingState>>;
  titleState: string;
};

const DEFAULT_PREVIEW_QUESTION: EditorQuestion = {
  id: "preview",
  type: "multiple_choice",
  imageUrl: null,
  question: "Sua primeira pergunta vai aparecer aqui.",
  options: ["Opção A", "Opção B", "Opção C", "Opção D"],
  correctIndex: 0,
  timeLimitSeconds: 20,
};

const COLOR_FIELDS = [
  [
    "primaryColor",
    "Cor primária",
    ["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#166534"],
  ],
  [
    "secondaryColor",
    "Cor secundária",
    ["#10233f", "#1e3a5f", "#1e1b4b", "#3b0764", "#1c1917", "#052e16"],
  ],
  [
    "accentColor",
    "Cor de destaque",
    ["#f59e0b", "#f97316", "#ef4444", "#10b981", "#3b82f6", "#a855f7"],
  ],
] as const;

export function BrandingTab({
  branding,
  questions,
  quizId,
  selectedQuestionId,
  setBranding,
}: BrandingTabProps) {
  const contrastWarnings = useMemo(
    () => computeContrastWarnings(branding),
    [branding],
  );

  const warningsByKey = useMemo(
    () =>
      contrastWarnings.reduce<
        Partial<Record<ContrastWarning["key"], ContrastWarning[]>>
      >((accumulator, warning) => {
        accumulator[warning.key] = [
          ...(accumulator[warning.key] ?? []),
          warning,
        ];
        return accumulator;
      }, {}),
    [contrastWarnings],
  );

  // P3.2 — preview reflects the selected/expanded question, not always Q1
  const previewQuestion =
    (selectedQuestionId
      ? questions.find((q) => q.id === selectedQuestionId)
      : undefined) ??
    questions[0] ??
    DEFAULT_PREVIEW_QUESTION;

  const previewQuestionNumber =
    questions.findIndex((q) => q.id === previewQuestion.id) + 1;

  const [previewMode, setPreviewMode] = useState<"display" | "mobile">(
    "display",
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:items-start">
      {/* Controls column */}
      <div className="min-w-0 space-y-6">
        <FieldPanel className="space-y-6">
          <SectionHeading
            eyebrow="Aplicar marca"
            helper="Escolha cores, fonte e imagens com foco na leitura final do participante."
            title="Identidade visual do quiz"
          />

          {COLOR_FIELDS.map(([key, label, swatches]) => (
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
                    <div
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{ backgroundColor: branding[key] }}
                    />
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
                      borderColor:
                        branding[key] === swatch ? "#0f766e" : "transparent",
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

          {branding.backgroundImageUrl ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-[#22304a]">
                Escurecimento do fundo
              </p>
              <p className="text-xs leading-6 text-[#61708c]">
                Controla o quanto a imagem de fundo é escurecida para manter o
                texto legível. Mais leve = imagem mais visível.
              </p>
              <div className="flex gap-2">
                {DIMMING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    aria-pressed={branding.backgroundDimming === option.value}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      branding.backgroundDimming === option.value
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : "border-slate-300 bg-white text-[#22304a] hover:bg-slate-50"
                    }`}
                    onClick={() =>
                      setBranding((currentBranding) => ({
                        ...currentBranding,
                        backgroundDimming: option.value,
                      }))
                    }
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#22304a]">
                  Mostrar enunciado no celular
                </p>
                <p className="text-xs leading-6 text-[#61708c]">
                  Quando desligado, o participante ve no mobile apenas
                  cronometro, progresso e respostas no mesmo esquema do display.
                </p>
              </div>
              <button
                aria-pressed={branding.showQuestionOnMobile}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border transition ${
                  branding.showQuestionOnMobile
                    ? "border-[#0f766e] bg-[#0f766e]"
                    : "border-slate-300 bg-slate-200"
                }`}
                onClick={() =>
                  setBranding((currentBranding) => ({
                    ...currentBranding,
                    showQuestionOnMobile: !currentBranding.showQuestionOnMobile,
                  }))
                }
                type="button"
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
                    branding.showQuestionOnMobile
                      ? "translate-x-7"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </FieldPanel>
      </div>

      {/* Preview column (sticky) — faithful Display/Mobile mockups */}
      <div className="min-w-0 space-y-4 xl:sticky xl:top-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Preview ao vivo
          </p>
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(
              [
                ["display", "Display"],
                ["mobile", "Mobile"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                aria-pressed={previewMode === mode}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  previewMode === mode
                    ? "bg-[#0f766e] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setPreviewMode(mode)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {previewMode === "display" ? (
          <DisplayPreview
            branding={branding}
            question={previewQuestion}
            questionNumber={previewQuestionNumber}
          />
        ) : (
          <MobilePreview branding={branding} question={previewQuestion} />
        )}

        <p className="text-center text-xs text-slate-400">
          {questions.length > 0
            ? "Expanda uma pergunta na aba Perguntas para pré-visualizá-la aqui."
            : "Adicione perguntas para ver o conteúdo real no preview."}
          {previewMode === "mobile" && !branding.showQuestionOnMobile
            ? " O enunciado está oculto no celular (ajuste no controle ao lado)."
            : ""}
        </p>
      </div>
    </div>
  );
}
