import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4001),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  REDIS_URL: z.string().url().optional(),
  REALTIME_INTERNAL_TOKEN: z.string().default("quizzy-internal-dev-token"),
  LOG_LEVEL: z.string().default("info"),
});

export const env = envSchema.parse(process.env);
