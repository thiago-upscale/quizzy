import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/env";
import {
  deleteR2Object,
  getR2PublicUrl,
  uploadR2Object,
} from "@/lib/r2-storage";

type StoredObject = {
  key: string;
  url: string;
};

type UploadStoredObjectInput = {
  body: Buffer | Uint8Array;
  cacheControl?: string;
  contentType: string;
  key: string;
};

export function normalizeStorageKey(key: string) {
  const normalizedKey = key.replace(/^\/+/, "").trim();

  if (
    !normalizedKey ||
    normalizedKey.includes("..") ||
    normalizedKey.includes("\\")
  ) {
    throw new Error("Invalid storage object key.");
  }

  return normalizedKey;
}

function getStorageBasePath() {
  return path.resolve(env.STORAGE_BASE_PATH);
}

function getStorageFilePath(key: string) {
  const normalizedKey = normalizeStorageKey(key);
  const basePath = getStorageBasePath();
  const filePath = path.resolve(basePath, normalizedKey);

  if (!filePath.startsWith(`${basePath}${path.sep}`)) {
    throw new Error("Invalid storage object key.");
  }

  return {
    filePath,
    key: normalizedKey,
  };
}

function getVolumePublicUrl(key: string) {
  const basePath = env.STORAGE_PUBLIC_BASE_PATH.replace(/\/$/, "");
  const encodedKey = normalizeStorageKey(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${basePath}/${encodedKey}`;
}

async function uploadVolumeObject({
  body,
  key,
}: UploadStoredObjectInput): Promise<StoredObject> {
  const storagePath = getStorageFilePath(key);

  await mkdir(path.dirname(storagePath.filePath), { recursive: true });
  await writeFile(storagePath.filePath, body);

  return {
    key: storagePath.key,
    url: getVolumePublicUrl(storagePath.key),
  };
}

export async function uploadStoredObject(
  input: UploadStoredObjectInput,
): Promise<StoredObject> {
  if (env.STORAGE_DRIVER === "r2") {
    return uploadR2Object(input);
  }

  return uploadVolumeObject(input);
}

export async function deleteStoredObject(key: string) {
  if (env.STORAGE_DRIVER === "r2") {
    await deleteR2Object(key);
    return;
  }

  const storagePath = getStorageFilePath(key);

  try {
    await unlink(storagePath.filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export async function readVolumeStoredObject(key: string) {
  const storagePath = getStorageFilePath(key);
  const fileStat = await stat(storagePath.filePath);

  if (!fileStat.isFile()) {
    throw new Error("Storage object is not a file.");
  }

  return {
    body: await readFile(storagePath.filePath),
    fileStat,
    key: storagePath.key,
  };
}

export function getStoredObjectPublicUrl(key: string) {
  if (env.STORAGE_DRIVER === "r2") {
    return getR2PublicUrl(key);
  }

  return getVolumePublicUrl(key);
}
