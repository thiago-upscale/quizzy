"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import {
  EmptyStateCard,
  FieldPanel,
  SectionHeading,
  SurfaceCard,
} from "@/components/phase-one-ui";
import type { EditorQuestion } from "./editor-types";
import { AssetUploadField } from "./asset-upload-field";

type QuestionsTabProps = {
  descriptionState: string;
  questions: EditorQuestion[];
  quizId: string;
  selectedQuestionId: string | null;
  setDescriptionState: React.Dispatch<React.SetStateAction<string>>;
  setQuestions: React.Dispatch<React.SetStateAction<EditorQuestion[]>>;
  setSelectedQuestionId: React.Dispatch<React.SetStateAction<string | null>>;
  setTitleState: React.Dispatch<React.SetStateAction<string>>;
  titleState: string;
};

type PendingDelete = {
  index: number;
  question: EditorQuestion;
};

function isQuestionComplete(q: EditorQuestion) {
  if (!q.question.trim()) return false;
  if (q.type === "multiple_choice") {
    return q.options.every((opt) => opt.trim().length > 0);
  }
  return true;
}

export function QuestionsTab({
  descriptionState,
  questions,
  quizId,
  selectedQuestionId,
  setDescriptionState,
  setQuestions,
  setSelectedQuestionId,
  setTitleState,
  titleState,
}: QuestionsTabProps) {
  // P3.4 — undo de exclusão
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function requestDelete(question: EditorQuestion, index: number) {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }
    setQuestions((current) => current.filter((q) => q.id !== question.id));
    setPendingDelete({ question, index });
    deleteTimerRef.current = setTimeout(() => {
      setPendingDelete(null);
      deleteTimerRef.current = null;
    }, 8000);
  }

  function undoDelete() {
    if (!pendingDelete) return;
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setQuestions((current) => [
      ...current.slice(0, pendingDelete.index),
      pendingDelete.question,
      ...current.slice(pendingDelete.index),
    ]);
    setSelectedQuestionId(pendingDelete.question.id);
    setPendingDelete(null);
  }

  // P3.3 — reordenar perguntas
  function moveQuestion(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    setQuestions((current) => {
      if (toIndex < 0 || toIndex >= current.length) return current;
      const next = [...current];
      const a = next[fromIndex]!;
      const b = next[toIndex]!;
      next[fromIndex] = b;
      next[toIndex] = a;
      return next;
    });
  }

  return (
    <div className="space-y-6">
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
              value={titleState}
              onChange={(e) => setTitleState(e.target.value)}
              id="title"
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
              value={descriptionState}
              onChange={(e) => setDescriptionState(e.target.value)}
              id="description"
            />
          </div>
        </div>
      </SurfaceCard>

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
          const isExpanded = selectedQuestionId === question.id;

          return (
            <div
              key={question.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow"
            >
              {/* Collapsible header */}
              <div
                onClick={() =>
                  setSelectedQuestionId(isExpanded ? null : question.id)
                }
                className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                  isExpanded
                    ? "bg-slate-50 border-b border-slate-100"
                    : "hover:bg-slate-50/50"
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
                        <span className="italic text-slate-400">
                          Pergunta sem enunciado
                        </span>
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

                <div className="flex items-center gap-2 shrink-0">
                  {/* P3.3 — botões de reordenação */}
                  <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="p-0.5 text-slate-400 hover:text-[#0f766e] disabled:opacity-25 transition-colors"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, -1)}
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-slate-400 hover:text-[#0f766e] disabled:opacity-25 transition-colors"
                      disabled={index === questions.length - 1}
                      onClick={() => moveQuestion(index, 1)}
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

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

              {/* Expanded content */}
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
                                              "Opção A",
                                              "Opção B",
                                              "Opção C",
                                              "Opção D",
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
                                      timeLimitSeconds: Number(
                                        event.target.value,
                                      ),
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

                  {/* P3.4 — botão de remoção com undo */}
                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                      onClick={() => requestDelete(question, index)}
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
          setSelectedQuestionId(newId);
        }}
        type="button"
      >
        <Plus className="w-4 h-4" />
        Adicionar pergunta
      </button>

      {/* P3.4 — toast de undo (acima da barra sticky de salvar) */}
      {pendingDelete ? (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-[#132238] px-5 py-3 shadow-xl">
          <span className="text-sm font-medium text-white">
            Pergunta removida
          </span>
          <button
            type="button"
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 transition cursor-pointer"
            onClick={undoDelete}
          >
            Desfazer
          </button>
        </div>
      ) : null}
    </div>
  );
}
