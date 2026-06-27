"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Edit3,
  MoreVertical,
  Palette,
  Play,
  Trash2,
} from "lucide-react";
import { StatusAlert } from "@/components/phase-one-ui";
import type { QuizEditorProps } from "./editor-types";
import { initialSaveState } from "./editor-types";
import { BrandingTab } from "./branding-tab";
import { OperationTab } from "./operation-tab";
import { QuestionsTab } from "./questions-tab";
import { SubmitButton } from "./submit-button";

export function QuizEditor({
  branding: initialBranding,
  description,
  initialQuestions,
  individualSessionDefaults,
  liveSessionAction,
  liveSessionDefaults,
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
  const [titleState, setTitleState] = useState(title);
  const [descriptionState, setDescriptionState] = useState(description);
  const [activeTab, setActiveTab] = useState<
    "questions" | "branding" | "operation"
  >("questions");
  // Shared: which question is expanded in the questions tab AND previewed in branding tab (P3.2)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    () => initialQuestions[0]?.id ?? null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveState, saveFormAction] = useActionState(
    saveAction,
    initialSaveState,
  );

  // The save action no longer revalidates this route (that remounted the editor
  // and wiped form state), so the published/draft badge is derived from the
  // action result instead of from a refreshed prop.
  const statusState =
    saveState.status === "success" && saveState.quizStatus
      ? saveState.quizStatus
      : status;

  const tabs = [
    { id: "questions" as const, label: "Perguntas", Icon: Edit3 },
    { id: "branding" as const, label: "Branding", Icon: Palette },
    { id: "operation" as const, label: "Operação", Icon: Play },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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
              {titleState || "Novo quiz"}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                statusState === "published"
                  ? "bg-[#ecfdf3] text-[#0f766e]"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {statusState === "published" ? "Publicado" : "Rascunho"}
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
                      `Tem certeza que deseja excluir o quiz "${title}"?\n\nEsta ação removerá permanentemente o quiz, todas as sessões e os resultados associados. Não há como desfazer.`,
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

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto scrollbar-none">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === id
                ? "border-[#0f766e] text-[#0f766e]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Save status alert */}
      {saveState.status !== "idle" ? (
        <StatusAlert
          tone={saveState.status === "success" ? "success" : "error"}
        >
          {saveState.message}
        </StatusAlert>
      ) : null}

      {/*
        P3.5 — questions + branding tabs are always rendered (CSS hidden when inactive)
        so scroll position and component state are preserved when switching between them.
        Operation tab stays conditional because it contains nested <form> elements.
      */}
      <form
        action={saveFormAction}
        className="space-y-6 pb-24"
        hidden={activeTab === "operation"}
      >
        <input name="quizId" type="hidden" value={quizId} />
        <input name="title" type="hidden" value={titleState} />
        <input name="description" type="hidden" value={descriptionState} />
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

        {/* P3.5: hidden attribute lets space-y-6 ignore hidden children */}
        <div hidden={activeTab !== "questions"}>
          <QuestionsTab
            descriptionState={descriptionState}
            questions={questions}
            quizId={quizId}
            selectedQuestionId={selectedQuestionId}
            setDescriptionState={setDescriptionState}
            setQuestions={setQuestions}
            setSelectedQuestionId={setSelectedQuestionId}
            setTitleState={setTitleState}
            titleState={titleState}
          />
        </div>

        <div hidden={activeTab !== "branding"}>
          <BrandingTab
            branding={branding}
            questions={questions}
            quizId={quizId}
            selectedQuestionId={selectedQuestionId}
            setBranding={setBranding}
            titleState={titleState}
          />
        </div>

        {/* Sticky bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/80 backdrop-blur-md py-4 px-6 shadow-lg">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <span>
                {questions.length}{" "}
                {questions.length === 1 ? "pergunta" : "perguntas"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="capitalize">
                {status === "published" ? "Publicado" : "Rascunho"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton intent="draft">Salvar rascunho</SubmitButton>
              <SubmitButton intent="publish">Publicar versão</SubmitButton>
            </div>
          </div>
        </div>
      </form>

      {activeTab === "operation" && (
        <OperationTab
          individualSessionDefaults={individualSessionDefaults}
          liveSessionAction={liveSessionAction}
          liveSessionDefaults={liveSessionDefaults}
          quizId={quizId}
          sessionSummary={sessionSummary}
          startIndividualSessionAction={startIndividualSessionAction}
          status={status}
        />
      )}
    </div>
  );
}
