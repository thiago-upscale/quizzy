"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type EditorQuestion = {
  id: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correctIndex: number;
  timeLimitSeconds: number;
};

type QuizEditorProps = {
  description: string;
  initialQuestions: EditorQuestion[];
  saveAction: (formData: FormData) => void;
  title: string;
  quizId: string;
};

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

export function QuizEditor({
  description,
  initialQuestions,
  quizId,
  saveAction,
  title,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState(initialQuestions);

  return (
    <form action={saveAction} className="space-y-6">
      <input name="quizId" type="hidden" value={quizId} />
      <input
        name="questionsPayload"
        type="hidden"
        value={JSON.stringify(questions)}
      />

      <section className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
        <div className="grid gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#22304a]" htmlFor="title">
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
      </section>

      <section className="space-y-4">
        {questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                  Pergunta {index + 1}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#132238]">
                  Editor da pergunta
                </h2>
              </div>
              <button
                className="rounded-full border border-[#f1c6c2] px-4 py-2 text-sm font-medium text-[#b42318] transition hover:bg-[#fff5f4]"
                onClick={() =>
                  setQuestions((currentQuestions) =>
                    currentQuestions.length === 1
                      ? currentQuestions
                      : currentQuestions.filter((item) => item.id !== question.id),
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
                    const nextType = event.target.value as EditorQuestion["type"];

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
                                    : ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
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
                            ? { ...item, correctIndex: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  >
                    {question.options.map((option, optionIndex) => (
                      <option key={`${question.id}-${optionIndex}`} value={optionIndex}>
                        {option || `Opcao ${optionIndex + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3">
                <p className="text-sm font-medium text-[#22304a]">Alternativas</p>
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
                                options: item.options.map((currentOption, currentIndex) =>
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
              </div>
            </div>
          </article>
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
  );
}
