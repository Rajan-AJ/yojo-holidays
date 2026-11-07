import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

/**
 * Single Prisma client for the whole app (all database access goes through
 * src/server/**, which imports this). In development, Next.js hot reload
 * would otherwise create a new connection pool on every change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (serverEnv.NODE_ENV !== "production") globalForPrisma.prisma = db;
