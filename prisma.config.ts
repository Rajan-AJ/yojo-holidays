import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Development data only. See prisma/seed.ts.
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Optional here so `prisma generate` (run on `npm install`, e.g. on Vercel)
    // works without a database. Migrate/seed/studio still need it set.
    url: process.env.DATABASE_URL,
    // Optional: only `migrate dev` uses it, and only when the database user
    // cannot create a temporary shadow database itself (e.g. `prisma dev`).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
