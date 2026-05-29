import path from "node:path";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { quizzes } from "@/db/schema";
import { uploadStoredObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_ASSET_SIZE_BYTES = 2 * 1024 * 1024;

const assetMimeTypes = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AssetType = "branding-background" | "branding-logo" | "question-image";

function isAssetType(value: string): value is AssetType {
  return (
    value === "branding-background" ||
    value === "branding-logo" ||
    value === "question-image"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await requireAuthSession();
  const { quizId } = await params;

  const [quiz] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.organizationId, session.user.organizationId),
      ),
    )
    .limit(1);

  if (!quiz) {
    return NextResponse.json({ error: "quiz_not_found" }, { status: 404 });
  }

  const formData = await request.formData();
  const assetType = String(formData.get("assetType") ?? "");
  const questionId = String(formData.get("questionId") ?? "").trim();
  const file = formData.get("file");

  if (!isAssetType(assetType) || !(file instanceof File)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!(file.type in assetMimeTypes)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_ASSET_SIZE_BYTES) {
    return NextResponse.json({ error: "invalid_size" }, { status: 400 });
  }

  const extension = assetMimeTypes[file.type as keyof typeof assetMimeTypes];
  const suffix =
    assetType === "question-image" && questionId.length > 0
      ? questionId
      : crypto.randomUUID();
  const key = path.posix.join(
    "quiz-assets",
    session.user.organizationId,
    quizId,
    assetType,
    `${Date.now()}-${suffix}.${extension}`,
  );

  const uploaded = await uploadStoredObject({
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
    key,
  });

  return NextResponse.json({
    key: uploaded.key,
    url: uploaded.url,
  });
}
