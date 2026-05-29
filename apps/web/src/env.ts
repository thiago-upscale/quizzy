import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  REALTIME_URL: z.string().url().default("http://localhost:4001"),
  REALTIME_INTERNAL_TOKEN: z.string().default("quizzy-internal-dev-token"),
  SENTRY_DSN: z.string().url().optional(),
  STORAGE_DRIVER: z.enum(["railway-volume", "r2"]).default("railway-volume"),
  STORAGE_BASE_PATH: z.string().min(1).default("./storage"),
  STORAGE_PUBLIC_BASE_PATH: z.string().min(1).default("/uploads"),
  R2_ACCOUNT_ID: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  R2_ACCESS_KEY_ID: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  R2_SECRET_ACCESS_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  R2_BUCKET_NAME: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).optional(),
  ),
  R2_PUBLIC_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url().optional(),
  ),
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/quizzy",
  NEXTAUTH_SECRET:
    process.env.NEXTAUTH_SECRET ?? "development-secret-development-secret",
  STORAGE_BASE_PATH:
    process.env.STORAGE_BASE_PATH ??
    process.env.RAILWAY_VOLUME_MOUNT_PATH ??
    "./storage",
});
