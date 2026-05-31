"use client";

import { useRef } from "react";

export function DeleteQuizButton({
  quizId,
  quizTitle,
  deleteAction,
  alwaysVisible = false,
}: {
  quizId: string;
  quizTitle: string;
  deleteAction: (formData: FormData) => Promise<void>;
  alwaysVisible?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o quiz "${quizTitle}"?\n\nEsta ação removerá permanentemente o quiz, todas as sessões e os resultados associados. Não há como desfazer.`,
    );

    if (confirmed) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={deleteAction}>
      <input type="hidden" name="quizId" value={quizId} />
      <button
        aria-label={`Excluir quiz ${quizTitle}`}
        className={`flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1.5 text-xs font-semibold text-[#b91c1c] transition-all hover:bg-[#fee2e2] ${
          alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        title="Excluir quiz"
        type="button"
        onClick={handleClick}
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="13"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Excluir
      </button>
    </form>
  );
}

