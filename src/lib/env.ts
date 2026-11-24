import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 * Never import this file from a Client Component.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({
      error:
        "DATABASE_URL is not set. Add your PostgreSQL connection string to .env.local (local) or to the hosting provider's environment variables (e.g. Vercel → Settings → Environment Variables).",
    })
    .regex(/^(postgres|postgresql):\/\//, {
      error: "DATABASE_URL must be a PostgreSQL connection string (postgresql://…).",
    }),
  /** Supabase project URL, e.g. https://abcd.supabase.co (also exposed to the browser). */
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  /** anon / publishable key. Public by design; RLS protects the data. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  /** Server-only. Bypasses RLS: used for Auth admin calls (inviting staff) and Storage uploads. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = serverEnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Only the variable names and our messages are printed, never their values.
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid server environment:\n${problems}`);
}

export const serverEnv = parsed.data;
