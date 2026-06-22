"use client";

import { useActionState, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeleteSessionsState } from "../actions";
import { deleteSessions } from "../actions";
import {
  activeSessionStatuses,
  formatDate,
  getSessionStatusTone,
  getStatusLabel,
} from "../dashboard-helpers";

type ManagedSession = {
  createdAt: string;
  endsAt: string | null;
  expiresAt: string | null;
  finishedAt: string | null;
  id: string;
  mode: "individual" | "live";
  participantCount: number;
  pin: string | null;
  quizTitle: string;
  shareToken: string | null;
  startsAt: string | null;
  status: string;
};

type DeleteScope = "filtered" | "selected";

const initialDeleteState: DeleteSessionsState = {
  status: "idle",
};

const destructiveConfirmationText = "APAGAR";

function isActiveStatus(status: string) {
  return activeSessionStatuses.includes(
    status as (typeof activeSessionStatuses)[number],
  );
}

function getModeLabel(mode: ManagedSession["mode"]) {
  return mode === "live" ? "Live" : "Individual";
}

function describeSessionAccess(session: ManagedSession) {
  if (session.mode === "live") {
    return `PIN ${session.pin ?? "sem PIN"}`;
  }

  return session.shareToken ? "Link individual" : "Sessão individual";
}

function buildDeleteSummary(sessions: ManagedSession[]) {
  return {
    activeCount: sessions.filter((session) => isActiveStatus(session.status)).length,
    finishedCount: sessions.filter((session) => session.status === "finished").length,
    interruptedCount: sessions.filter((session) => session.status === "interrupted")
      .length,
    participantCount: sessions.reduce(
      (total, session) => total + session.participantCount,
      0,
    ),
  };
}

export function OperationSessionManager({
  sessions,
}: {
  sessions: ManagedSession[];
}) {
  const router = useRouter();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSessions,
    initialDeleteState,
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmationText, setConfirmationText] = useState("");
  const [modalScope, setModalScope] = useState<DeleteScope | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredSessions = sessions.filter((session) => {
    const matchesQuery =
      deferredQuery.length === 0 ||
      session.quizTitle.toLowerCase().includes(deferredQuery) ||
      (session.pin ?? "").toLowerCase().includes(deferredQuery) ||
      (session.shareToken ?? "").toLowerCase().includes(deferredQuery);
    const matchesStatus =
      statusFilter === "all" || session.status === statusFilter;
    const matchesMode = modeFilter === "all" || session.mode === modeFilter;

    return matchesQuery && matchesStatus && matchesMode;
  });

  const filteredIds = filteredSessions.map((session) => session.id);
  const selectedSessions = sessions.filter((session) =>
    selectedIds.includes(session.id),
  );
  const modalSessions =
    modalScope === "filtered"
      ? filteredSessions
      : sessions.filter((session) => selectedIds.includes(session.id));
  const allFilteredSelected =
    filteredIds.length > 0 &&
    filteredIds.every((sessionId) => selectedIds.includes(sessionId));
  const deleteSummary = buildDeleteSummary(modalSessions);

  useEffect(() => {
    if (deleteState.status !== "success") {
      return;
    }

    setSelectedIds([]);
    setConfirmationText("");
    setModalScope(null);
    router.refresh();
  }, [deleteState.status, router]);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, statusFilter, modeFilter]);

  useEffect(() => {
    if (!modalScope) return;

    cancelButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmationText("");
        setModalScope(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modalScope]);

  function toggleSelection(sessionId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(sessionId)
        ? currentIds.filter((currentId) => currentId !== sessionId)
        : [...currentIds, sessionId],
    );
  }

  function toggleAllFiltered() {
    setSelectedIds((currentIds) => {
      if (allFilteredSelected) {
        return currentIds.filter((sessionId) => !filteredIds.includes(sessionId));
      }

      return [...new Set([...currentIds, ...filteredIds])];
    });
  }

  function openDeleteModal(scope: DeleteScope) {
    if (scope === "filtered" && filteredSessions.length === 0) {
      return;
    }

    if (scope === "selected" && selectedIds.length === 0) {
      return;
    }

    setConfirmationText("");
    setModalScope(scope);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 rounded-[1.4rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-4 md:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,0.8fr))]">
        <label className="grid gap-2 text-sm text-[var(--quizzy-muted)]">
          <span className="font-semibold text-[var(--quizzy-text)]">Buscar</span>
          <input
            className="rounded-2xl border border-[var(--quizzy-border)] bg-white px-4 py-3 text-sm text-[var(--quizzy-text)] outline-none transition focus:border-[var(--quizzy-teal)]"
            placeholder="Título, PIN ou token"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-[var(--quizzy-muted)]">
          <span className="font-semibold text-[var(--quizzy-text)]">Status</span>
          <select
            className="rounded-2xl border border-[var(--quizzy-border)] bg-white px-4 py-3 text-sm text-[var(--quizzy-text)] outline-none transition focus:border-[var(--quizzy-teal)]"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="waiting">Aguardando</option>
            <option value="countdown">Contagem</option>
            <option value="playing">Ao vivo</option>
            <option value="question_result">Resultado</option>
            <option value="interrupted">Interrompida</option>
            <option value="finished">Encerrada</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-[var(--quizzy-muted)]">
          <span className="font-semibold text-[var(--quizzy-text)]">Modo</span>
          <select
            className="rounded-2xl border border-[var(--quizzy-border)] bg-white px-4 py-3 text-sm text-[var(--quizzy-text)] outline-none transition focus:border-[var(--quizzy-teal)]"
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="live">Live</option>
            <option value="individual">Individual</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--quizzy-muted)]">
        <span className="rounded-full bg-[var(--quizzy-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
          {sessions.length} totais
        </span>
        <span className="rounded-full bg-[var(--quizzy-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
          {filteredSessions.length} filtradas
        </span>
        <span className="rounded-full bg-[color:color-mix(in_srgb,var(--quizzy-accent)_12%,white)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-text)]">
          {selectedIds.length} selecionadas
        </span>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[color:color-mix(in_srgb,var(--quizzy-accent)_45%,white)] bg-[color:color-mix(in_srgb,var(--quizzy-accent)_8%,white)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--quizzy-text)]">
            {selectedIds.length}{" "}
            {selectedIds.length === 1
              ? "sessão selecionada"
              : "sessões selecionadas"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-full border border-[var(--quizzy-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--quizzy-text)] transition hover:bg-[var(--quizzy-surface)]"
              type="button"
              onClick={() => setSelectedIds([])}
            >
              Limpar seleção
            </button>
            <button
              className="rounded-full border border-[#fecaca] bg-[#fff1f2] px-4 py-2 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6]"
              type="button"
              onClick={() => openDeleteModal("selected")}
            >
              Apagar selecionadas
            </button>
          </div>
        </div>
      ) : null}

      {deleteState.message ? (
        <div
          className={`rounded-[1.2rem] border px-4 py-3 text-sm ${
            deleteState.status === "error"
              ? "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]"
              : "border-[color:color-mix(in_srgb,var(--quizzy-success)_35%,white)] bg-[color:color-mix(in_srgb,var(--quizzy-success)_10%,white)] text-[var(--quizzy-success)]"
          }`}
        >
          {deleteState.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 text-sm text-[var(--quizzy-text)]">
          <input
            checked={allFilteredSelected}
            className="h-4 w-4 rounded border-[var(--quizzy-border)]"
            type="checkbox"
            onChange={toggleAllFiltered}
          />
          Selecionar todas as filtradas
        </label>

        <button
          className="rounded-full border border-[#fecaca] bg-[#fff1f2] px-4 py-2 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={filteredSessions.length === 0}
          type="button"
          onClick={() => openDeleteModal("filtered")}
        >
          Apagar tudo filtrado
        </button>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] p-6 text-sm text-[var(--quizzy-muted)]">
          Nenhuma sessão encontrada com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.slice(0, page * PAGE_SIZE).map((session) => (
            <div
              key={session.id}
              className="rounded-[1.4rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-4"
            >
              <div className="flex flex-wrap items-start gap-4">
                <input
                  aria-label={`Selecionar sessão ${session.quizTitle}`}
                  checked={selectedIds.includes(session.id)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--quizzy-border)]"
                  type="checkbox"
                  onChange={() => toggleSelection(session.id)}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[var(--quizzy-text)]">
                      {session.quizTitle}
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getSessionStatusTone(
                        session.status,
                      )}`}
                    >
                      {getStatusLabel(session.status)}
                    </span>
                    <span className="rounded-full bg-[var(--quizzy-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                      {getModeLabel(session.mode)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[var(--quizzy-muted)]">
                    {describeSessionAccess(session)} • {session.participantCount}{" "}
                    participantes
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--quizzy-muted)]">
                    <span>Criada em {formatDate(new Date(session.createdAt))}</span>
                    <span>
                      Início {formatDate(session.startsAt ? new Date(session.startsAt) : null)}
                    </span>
                    <span>
                      Expira em{" "}
                      {formatDate(
                        session.expiresAt
                          ? new Date(session.expiresAt)
                          : session.endsAt
                            ? new Date(session.endsAt)
                            : null,
                      )}
                    </span>
                    <span>
                      Encerrada em{" "}
                      {formatDate(
                        session.finishedAt ? new Date(session.finishedAt) : null,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredSessions.length > page * PAGE_SIZE ? (
            <button
              className="w-full rounded-[1.4rem] border border-dashed border-[var(--quizzy-border)] bg-[var(--quizzy-surface)] py-4 text-sm font-semibold text-[var(--quizzy-muted)] transition hover:border-[var(--quizzy-teal)] hover:text-[var(--quizzy-teal)]"
              type="button"
              onClick={() => setPage((p) => p + 1)}
            >
              Carregar mais · {filteredSessions.length - page * PAGE_SIZE}{" "}
              {filteredSessions.length - page * PAGE_SIZE === 1
                ? "restante"
                : "restantes"}
            </button>
          ) : null}
        </div>
      )}

      {modalScope ? (
        <div
          aria-labelledby="delete-modal-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#10233f]/50 px-4"
          role="dialog"
        >
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--quizzy-border)] bg-white p-6 shadow-[0_24px_80px_rgba(16,35,63,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b91c1c]">
              Confirmação destrutiva
            </p>
            <h3 id="delete-modal-title" className="mt-3 text-2xl font-semibold text-[var(--quizzy-text)]">
              {modalScope === "filtered"
                ? "Apagar todas as sessões filtradas"
                : "Apagar sessões selecionadas"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--quizzy-muted)]">
              Esta ação remove permanentemente sessões, participantes,
              tentativas, respostas e eventos relacionados. Não há como
              desfazer.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] bg-[var(--quizzy-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                  Lote
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--quizzy-text)]">
                  {modalSessions.length}
                </p>
                <p className="mt-1 text-sm text-[var(--quizzy-muted)]">
                  sessões prontas para exclusão
                </p>
              </div>
              <div className="rounded-[1.2rem] bg-[var(--quizzy-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
                  Impacto
                </p>
                <p className="mt-2 text-3xl font-semibold text-[var(--quizzy-text)]">
                  {deleteSummary.participantCount}
                </p>
                <p className="mt-1 text-sm text-[var(--quizzy-muted)]">
                  participantes serão removidos junto
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-[color:color-mix(in_srgb,var(--quizzy-warning)_10%,white)] px-3 py-1 text-[var(--quizzy-warning)]">
                {deleteSummary.activeCount} ativas
              </span>
              <span className="rounded-full bg-[var(--quizzy-surface)] px-3 py-1 text-[var(--quizzy-muted)]">
                {deleteSummary.interruptedCount} interrompidas
              </span>
              <span className="rounded-full bg-[var(--quizzy-surface)] px-3 py-1 text-[var(--quizzy-muted)]">
                {deleteSummary.finishedCount} encerradas
              </span>
            </div>

            {modalScope === "filtered" ? (
              <label className="mt-6 grid gap-2 text-sm text-[var(--quizzy-muted)]">
                <span className="font-semibold text-[var(--quizzy-text)]">
                  Digite {destructiveConfirmationText} para confirmar
                </span>
                <input
                  className="rounded-2xl border border-[var(--quizzy-border)] bg-white px-4 py-3 text-sm text-[var(--quizzy-text)] outline-none transition focus:border-[var(--quizzy-teal)]"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                />
              </label>
            ) : null}

            <form action={deleteAction} className="mt-6 flex flex-wrap justify-end gap-3">
              <input
                name="confirmationText"
                type="hidden"
                value={confirmationText}
              />
              <input name="scope" type="hidden" value={modalScope} />
              <input
                name="sessionIds"
                type="hidden"
                value={JSON.stringify(modalSessions.map((session) => session.id))}
              />

              <button
                ref={cancelButtonRef}
                className="cursor-pointer rounded-full border border-[var(--quizzy-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--quizzy-text)] transition hover:bg-[var(--quizzy-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quizzy-teal)] focus-visible:ring-offset-2"
                type="button"
                onClick={() => {
                  setConfirmationText("");
                  setModalScope(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="cursor-pointer rounded-full bg-[#b91c1c] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  deletePending ||
                  modalSessions.length === 0 ||
                  (modalScope === "filtered" &&
                    confirmationText !== destructiveConfirmationText)
                }
                type="submit"
              >
                {deletePending ? "Apagando..." : "Confirmar exclusão"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
