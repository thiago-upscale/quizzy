import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { env } from "@/env";

type R2Config = {
  accessKeyId: string;
  accountId: string;
  bucketName: string;
  endpoint: string;
  publicUrl: string;
  secretAccessKey: string;
};

type UploadR2ObjectInput = {
  body: PutObjectCommandInput["Body"];
  cacheControl?: string;
  contentType: string;
  key: string;
};

let client: S3Client | null = null;

function getMissingR2EnvKeys() {
  return [
    ["R2_ACCOUNT_ID", env.R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET_NAME", env.R2_BUCKET_NAME],
    ["R2_PUBLIC_URL", env.R2_PUBLIC_URL],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function isR2Configured() {
  return getMissingR2EnvKeys().length === 0;
}

function getR2Config(): R2Config {
  const missingKeys = getMissingR2EnvKeys();

  if (missingKeys.length > 0) {
    throw new Error(
      `Cloudflare R2 is not configured. Missing: ${missingKeys.join(", ")}`,
    );
  }

  const accountId = env.R2_ACCOUNT_ID!;

  return {
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    accountId,
    bucketName: env.R2_BUCKET_NAME!,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    publicUrl: env.R2_PUBLIC_URL!.replace(/\/$/, ""),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
  };
}

function getR2Client() {
  const config = getR2Config();

  if (!client) {
    client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      region: "auto",
    });
  }

  return client;
}

export function normalizeR2Key(key: string) {
  const normalizedKey = key.replace(/^\/+/, "").trim();

  if (
    !normalizedKey ||
    normalizedKey.includes("..") ||
    normalizedKey.includes("\\")
  ) {
    throw new Error("Invalid R2 object key.");
  }

  return normalizedKey;
}

export function getR2PublicUrl(key: string) {
  const config = getR2Config();
  const normalizedKey = normalizeR2Key(key)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${config.publicUrl}/${normalizedKey}`;
}

export async function uploadR2Object({
  body,
  cacheControl = "public, max-age=31536000, immutable",
  contentType,
  key,
}: UploadR2ObjectInput) {
  const config = getR2Config();
  const normalizedKey = normalizeR2Key(key);

  await getR2Client().send(
    new PutObjectCommand({
      Body: body,
      Bucket: config.bucketName,
      CacheControl: cacheControl,
      ContentType: contentType,
      Key: normalizedKey,
    }),
  );

  return {
    key: normalizedKey,
    url: getR2PublicUrl(normalizedKey),
  };
}

export async function deleteR2Object(key: string) {
  const config = getR2Config();

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: normalizeR2Key(key),
    }),
  );
}
