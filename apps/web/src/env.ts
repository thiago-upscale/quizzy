import { z } from "zod";

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
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/quizzy",
  NEXTAUTH_SECRET:
    process.env.NEXTAUTH_SECRET ?? "development-secret-development-secret",
});
