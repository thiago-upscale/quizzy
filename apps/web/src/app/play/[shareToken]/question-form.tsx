"use client";

import { useActionState, useState } from "react";

import type { IndividualQuestionState } from "../actions";

const initialState: IndividualQuestionState = {
  status: "idle",
};

export function IndividualQuestionForm({
  answerAction,
  options,
  questionOrderIndex,
  shareToken,
}: {
  answerAction: (
    state: IndividualQuestionState,
    formData: FormData,
  ) => Promise<IndividualQuestionState>;
  options: string[];
  questionOrderIndex: number;
  shareToken: string;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [state, formAction] = useActionState(answerAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="shareToken" type="hidden" value={shareToken} />
      <input
        name="questionOrderIndex"
        type="hidden"
        value={String(questionOrderIndex)}
      />
      <input name="startedAt" type="hidden" value={String(startedAt)} />

      {state.status === "error" ? (
        <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-sm font-medium text-[#b42318]">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3">
        {options.map((option, optionIndex) => (
          <label
            key={`${questionOrderIndex}-${optionIndex}`}
            className={
              selectedOption === optionIndex
                ? "flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-4 text-[#10233f]"
                : "flex cursor-pointer items-start gap-3 rounded-2xl bg-white/10 px-4 py-4 text-white transition hover:bg-white/20"
            }
          >
            <input
              checked={selectedOption === optionIndex}
              className="mt-1 accent-[#0f766e]"
              name="answerIndex"
              onChange={() => setSelectedOption(optionIndex)}
              type="radio"
              value={String(optionIndex)}
            />
            <span className="text-sm font-medium">{option}</span>
          </label>
        ))}
      </div>

      <button
        className="w-full rounded-full bg-[#f59e0b] px-5 py-4 text-sm font-semibold text-[#10233f] transition hover:bg-[#fbbf24] disabled:opacity-60"
        disabled={selectedOption === null}
        type="submit"
      >
        Confirmar resposta
      </button>
    </form>
  );
}
