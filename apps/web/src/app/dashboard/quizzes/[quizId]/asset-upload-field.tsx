"use client";

import { useEffect, useState } from "react";
import { FieldPanel, StatusAlert } from "@/components/phase-one-ui";
import { acceptedImageTypes } from "./editor-types";

export function AssetUploadField({
  assetType,
  currentUrl,
  label,
  onClear,
  onUploaded,
  quizId,
  questionId,
}: {
  assetType: "branding-background" | "branding-logo" | "question-image";
  currentUrl: string | null;
  label: string;
  onClear: () => void;
  onUploaded: (url: string) => void;
  quizId: string;
  questionId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [assetBroken, setAssetBroken] = useState(false);

  useEffect(() => {
    if (!currentUrl) {
      setAssetBroken(false);
      return;
    }
    let cancelled = false;
    fetch(currentUrl, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setAssetBroken(!res.ok);
      })
      .catch(() => {
        if (!cancelled) setAssetBroken(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("assetType", assetType);
      formData.set("file", file);

      if (questionId) {
        formData.set("questionId", questionId);
      }

      const response = await fetch(`/api/quizzes/${quizId}/assets`, {
        body: formData,
        method: "POST",
      });

      const payload = (await response.json()) as
        | { error?: string; url?: string }
        | undefined;

      if (!response.ok || !payload?.url) {
        const message =
          payload?.error === "unsupported_type"
            ? "Envie PNG, JPG, WEBP, GIF ou AVIF."
            : payload?.error === "invalid_size"
              ? "A imagem precisa ter até 2 MB."
              : "Não foi possivel concluir o upload agora.";

        throw new Error(message);
      }

      onUploaded(payload.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possivel concluir o upload agora.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <FieldPanel className="space-y-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#22304a]">{label}</p>
          <p className="text-xs text-[#61708c]">
            PNG, JPG, WEBP, GIF ou AVIF com até 2 MB.
          </p>
        </div>
        {currentUrl ? (
          <button
            className="rounded-full border border-[#d7e3f0] px-3 py-1 text-xs font-semibold text-[#22304a] cursor-pointer hover:bg-slate-50 transition"
            onClick={onClear}
            type="button"
          >
            Remover
          </button>
        ) : null}
      </div>

      {currentUrl && assetBroken ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <p className="font-bold">Arquivo inacessível</p>
          <p className="mt-0.5 text-amber-700">
            O arquivo salvo não foi encontrado no servidor. Re-envie a imagem
            para restaurar.
          </p>
        </div>
      ) : currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={label}
          className="max-h-48 w-full rounded-xl border border-[#d7e3f0] object-cover"
          src={currentUrl}
        />
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[#cad5e3] bg-[#f8fbff] text-sm text-[#61708c]">
          Nenhuma imagem enviada
        </div>
      )}

      <label className="inline-flex cursor-pointer rounded-xl bg-[#10233f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d3557]">
        {isUploading ? "Enviando..." : "Escolher imagem"}
        <input
          accept={acceptedImageTypes}
          className="sr-only"
          disabled={isUploading}
          onChange={handleFileChange}
          type="file"
        />
      </label>

      {error ? <StatusAlert tone="error">{error}</StatusAlert> : null}
    </FieldPanel>
  );
}
