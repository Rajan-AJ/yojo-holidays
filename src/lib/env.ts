import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 * Never import this file from a Client Component.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const serverEnv = serverEnvSchema.parse(process.env);
