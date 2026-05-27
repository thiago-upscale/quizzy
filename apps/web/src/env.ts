import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  REALTIME_URL: z.string().url().default("http://localhost:4001"),
  SENTRY_DSN: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
