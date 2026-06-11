"use client";

import { useMemo } from "react";
import { FieldPanel, SectionHeading } from "@/components/phase-one-ui";
import type { BrandingState, ContrastWarning, EditorQuestion } from "./editor-types";
import { fontOptions } from "./editor-types";
import { computeContrastWarnings } from "./color-utils";
import { AssetUploadField } from "./asset-upload-field";

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
  titleState,
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
                    showQuestionOnMobile:
                      !currentBranding.showQuestionOnMobile,
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

      {/* Preview column (sticky) */}
      <div className="min-w-0 space-y-4 xl:sticky xl:top-6">
        <div
          className="w-full max-w-full overflow-hidden rounded-[1.75rem] border border-white/50 shadow-xl"
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
            <h2 className="mt-3 text-2xl font-bold break-words">
              {titleState || "Novo quiz"}
            </h2>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                  Fonte
                </p>
                <p className="mt-0.5 text-xs font-semibold truncate">
                  {branding.fontFamily}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                  Destaque
                </p>
                <p className="mt-0.5 text-xs font-semibold truncate">
                  {branding.accentColor}
                </p>
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
                {/* P3.2 — exibe o número real da pergunta selecionada */}
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#10233f]"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  {previewQuestionNumber > 0
                    ? `Pergunta ${previewQuestionNumber}`
                    : "Pergunta"}
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
              <h3 className="text-lg font-bold leading-snug break-words">
                {previewQuestion.question || "Digite o enunciado da pergunta"}
              </h3>
              <div className="mt-3 grid gap-2">
                {previewQuestion.options.map((option, optionIndex) => (
                  <div
                    key={`${previewQuestion.id}-${optionIndex}`}
                    className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold break-words"
                  >
                    {option || `Opção ${optionIndex + 1}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* P3.2 — dica contextual */}
        {questions.length > 0 && (
          <p className="text-center text-xs text-slate-400">
            Expanda uma pergunta na aba Perguntas para pré-visualizá-la aqui.
          </p>
        )}
      </div>
    </div>
  );
}
