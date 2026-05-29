import { NextResponse } from "next/server";

import { readVolumeStoredObject } from "@/lib/storage";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

function getContentType(key: string) {
  const extension = key.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];

  return extension ? contentTypes[extension] : undefined;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;

  try {
    const storedObject = await readVolumeStoredObject(key.join("/"));

    return new NextResponse(storedObject.body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(storedObject.fileStat.size),
        "Content-Type":
          getContentType(storedObject.key) ?? "application/octet-stream",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
