"use client";

import { useState } from "react";
import { Activity, Calendar, Play, Users } from "lucide-react";
import { SurfaceCard } from "@/components/phase-one-ui";
import type { QuizEditorProps } from "./editor-types";

type OperationTabProps = {
  individualSessionDefaults: QuizEditorProps["individualSessionDefaults"];
  liveSessionAction: (formData: FormData) => void;
  liveSessionDefaults?: QuizEditorProps["liveSessionDefaults"];
  quizId: string;
  sessionSummary: QuizEditorProps["sessionSummary"];
  startIndividualSessionAction: (formData: FormData) => void;
  status: string;
};

function buildDefaultIndividualEndsAtValue() {
  const value = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const timezoneOffsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function OperationTab({
  individualSessionDefaults,
  liveSessionAction,
  liveSessionDefaults,
  quizId,
  sessionSummary,
  startIndividualSessionAction,
  status,
}: OperationTabProps) {
  const [defaultIndividualEndsAt] = useState(buildDefaultIndividualEndsAtValue);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Status de Publicação
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            O status determina se participantes externos podem acessar o quiz.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            status === "published"
              ? "bg-[#ecfdf3] text-[#0f766e]"
              : "bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${status === "published" ? "bg-[#0f766e]" : "bg-slate-400"}`}
          />
          {status === "published" ? "Publicado e Ativo" : "Rascunho"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <Activity className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-bold text-slate-700">
          {sessionSummary.activeLiveCount}{" "}
          {sessionSummary.activeLiveCount === 1 ? "sala ativa" : "salas ativas"}
        </span>
        <span className="text-slate-300">•</span>
        <span>
          Último PIN:{" "}
          <strong className="font-bold text-slate-700">
            {sessionSummary.latestLivePin ?? "--"}
          </strong>
        </span>
        {sessionSummary.latestShareToken && (
          <>
            <span className="text-slate-300">•</span>
            <span>
              Link individual:{" "}
              <strong className="font-bold text-slate-700">
                {sessionSummary.latestShareToken.slice(0, 12)}...
              </strong>
            </span>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SurfaceCard className="flex flex-col justify-between h-full bg-white border border-slate-200">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[#0f766e] mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Sessão Live em Tempo Real
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Apresente as perguntas em um projetor ou tela compartilhada e
              permita que os participantes respondam simultaneamente em tempo
              real. Isso é ideal para eventos ao vivo e dinâmicas de grupo
              síncronas.
            </p>
          </div>
          <div className="mt-6">
            <form action={liveSessionAction}>
              <input name="quizId" type="hidden" value={quizId} />
              <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  className="accent-[#0f766e] h-3.5 w-3.5 rounded"
                  defaultChecked={
                    liveSessionDefaults?.requireParticipantEmail ?? false
                  }
                  name="requireParticipantEmail"
                  type="checkbox"
                />
                <span>Exigir email do participante</span>
              </label>
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
            <h3 className="text-lg font-bold text-slate-800">
              Sessão Individual (Assíncrona)
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Gere um link de compartilhamento para que os participantes
              respondam de forma independente até o prazo determinado. Perfeito
              para tarefas de casa, questionários de treinamento ou pesquisas
              assíncronas.
            </p>
          </div>
          <div className="mt-6">
            <form action={startIndividualSessionAction} className="space-y-4">
              <input name="quizId" type="hidden" value={quizId} />
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">
                    Prazo final
                  </span>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0f766e]"
                    defaultValue={defaultIndividualEndsAt}
                    name="endsAt"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">
                    Tentativas
                  </span>
                  <select
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-[#0f766e]"
                    defaultValue={String(
                      individualSessionDefaults.maxAttempts,
                    )}
                    name="maxAttempts"
                  >
                    {[1, 2, 3].map((attempts) => (
                      <option key={attempts} value={attempts}>
                        {attempts}{" "}
                        {attempts === 1 ? "tentativa" : "tentativas"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  className="accent-[#0f766e] h-3.5 w-3.5 rounded"
                  defaultChecked={
                    individualSessionDefaults.requireParticipantEmail ?? false
                  }
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
  );
}
