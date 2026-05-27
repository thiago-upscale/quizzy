"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { SaveQuizState } from "../../actions";

type EditorQuestion = {
  id: string;
  type: "multiple_choice" | "true_false";
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
  "Manrope",
  "Space Grotesk",
  "IBM Plex Sans",
  "Outfit",
  "Archivo",
];

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
  const [saveState, saveFormAction] = useActionState(
    saveAction,
    initialSaveState,
  );

  const previewQuestion = questions[0] ?? {
    id: "preview",
    type: "multiple_choice" as const,
    question: "Sua primeira pergunta vai aparecer aqui.",
    options: ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
    correctIndex: 0,
    timeLimitSeconds: 20,
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                Sessoes
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Publicar e iniciar
              </h2>
            </div>
            <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
              {status}
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-[#61708c]">
            Quando o quiz estiver publicado, podemos gerar um PIN live ou uma
            sessao individual para compartilhar.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#d7e3f0] bg-[#f8fbff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Live ativo
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#132238]">
                {sessionSummary.activeLiveCount}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d7e3f0] bg-[#fffaf0] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Ultimo PIN
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#132238]">
                {sessionSummary.latestLivePin ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#d7e3f0] bg-[#f7f7ff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                Sessao individual
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-[#132238]">
                {sessionSummary.latestShareToken
                  ? `${sessionSummary.latestShareToken.slice(0, 12)}...`
                  : "Nenhuma ainda"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <form action={liveSessionAction}>
              <input name="quizId" type="hidden" value={quizId} />
              <SessionButton>Iniciar sessao live</SessionButton>
            </form>
            <form action={startIndividualSessionAction}>
              <input name="quizId" type="hidden" value={quizId} />
              <SessionButton>Criar sessao individual</SessionButton>
            </form>
          </div>
        </div>

        <div
          className="overflow-hidden rounded-[1.75rem] border border-white/50 shadow-[0_28px_90px_rgba(16,35,63,0.12)]"
          style={{
            background: `linear-gradient(145deg, ${branding.secondaryColor}, ${branding.primaryColor})`,
            color: "#ffffff",
            fontFamily: branding.fontFamily,
          }}
        >
          <div className="border-b border-white/15 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              Preview live
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              {title || "Novo quiz"}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              O branding precisa aparecer com clareza antes de chegar ao lobby,
              pergunta e ranking.
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="rounded-3xl bg-white/8 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]">
                  Pergunta 1
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#10233f]"
                  style={{ backgroundColor: branding.accentColor }}
                >
                  {previewQuestion.timeLimitSeconds}s
                </span>
              </div>
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
          <p
            className={
              saveState.status === "success"
                ? "rounded-2xl bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#0f766e]"
                : "rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]"
            }
          >
            {saveState.message}
          </p>
        ) : null}

        <section className="rounded-[1.75rem] border border-[#dae4f0] bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
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

            <div className="space-y-4 rounded-[1.5rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61708c]">
                  Branding
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#132238]">
                  Identidade visual do quiz
                </h2>
              </div>
              {(
                [
                  ["primaryColor", "Cor primaria"],
                  ["secondaryColor", "Cor secundaria"],
                  ["accentColor", "Cor de destaque"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-[#22304a]">
                    {label}
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      className="h-10 w-10 rounded-full border border-[#d5deea] bg-transparent"
                      type="color"
                      value={branding[key]}
                      onChange={(event) =>
                        setBranding((currentBranding) => ({
                          ...currentBranding,
                          [key]: event.target.value,
                        }))
                      }
                    />
                    <span className="w-20 text-right text-sm font-semibold text-[#61708c]">
                      {branding[key]}
                    </span>
                  </div>
                </label>
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

                <div className="grid gap-3">
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
    </div>
  );
}
