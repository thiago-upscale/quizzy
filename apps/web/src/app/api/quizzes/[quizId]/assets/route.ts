import path from "node:path";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAuthSession } from "@/auth/session";
import { db } from "@/db/client";
import { quizzes } from "@/db/schema";
import { uploadStoredObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;

const assetMimeTypes = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function detectMimeFromBytes(buf: Uint8Array): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38)
    return "image/gif";
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return "image/webp";
  // AVIF/HEIF: ftyp box at offset 4
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70)
    return "image/avif";
  return null;
}

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

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detectedMime = detectMimeFromBytes(bytes);
  if (detectedMime !== file.type) {
    return NextResponse.json(
      { error: "content_type_mismatch" },
      { status: 400 },
    );
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
