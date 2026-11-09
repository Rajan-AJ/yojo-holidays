import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

/**
 * One Prisma client (one connection pool) per server process. It is kept on
 * globalThis because the same process loads this module more than once: the
 * Proxy (src/proxy.ts) and the app are bundled separately, and in development
 * hot reload re-evaluates modules. Without sharing, each copy would open its
 * own pool and multiply connections.
 */

/** Read operations: safe to repeat if the connection dropped mid-flight. */
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

/**
 * True when Postgres (or a pooler in front of it) closed the connection.
 * Pools can hand out such dead connections after idle periods; a fresh one works.
 */
function isClosedConnection(error: unknown) {
  const e = error as { code?: string; meta?: { driverAdapterError?: { cause?: { kind?: string } } } };
  return e?.code === "P1017" || e?.meta?.driverAdapterError?.cause?.kind === "ConnectionClosed";
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: serverEnv.DATABASE_URL,
    // Connections per process. `next build` prerenders in several workers at
    // once, so small databases (local `prisma dev`, entry-level hosted plans)
    // need a low value; see DATABASE_POOL_MAX in .env.example.
    max: serverEnv.DATABASE_POOL_MAX,
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      // Retry a READ once when its connection was closed underneath it.
      // Writes are never retried: a dropped write may already have applied.
      async $allOperations({ operation, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!READ_OPERATIONS.has(operation) || !isClosedConnection(error)) throw error;
          return query(args);
        }
      },
    },
  });
}

type Db = ReturnType<typeof createClient>;
const globalForPrisma = globalThis as unknown as { prisma?: Db };

export const db = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = db;
