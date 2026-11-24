// Local development database: Postgres (PGlite) on 127.0.0.1:54322.
//
//   npm run db:local            start (applies new migrations, keeps data in .local-db/)
//   npm run db:local -- --reset wipe .local-db/ first, then start fresh
//
// On first start it loads supabase/local/supabase-shim.sql (roles, auth, storage
// stand-ins), then every file in supabase/migrations not applied yet, then
// supabase/seed.sql (sample content) when the database is new.
// Connection string: postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable
//
// NOT for production. Production is a Supabase project (see README).
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, ".local-db");
const port = Number(process.env.LOCAL_DB_PORT ?? 54322);

if (process.argv.includes("--reset") && existsSync(dataDir)) {
  rmSync(dataDir, { recursive: true, force: true });
  console.log("reset: removed .local-db/");
}
const isNew = !existsSync(dataDir);

const db = await PGlite.create({ dataDir, extensions: { pg_trgm, btree_gist } });

const run = async (label, sql) => {
  try {
    await db.exec(sql);
    console.log("  ✔", label);
  } catch (error) {
    console.error("  ✘", label, "\n   ", error.message, error.where ?? "");
    process.exit(1);
  }
};

await db.exec(`create schema if not exists local; create table if not exists local.migrations (name text primary key, applied_at timestamptz not null default now())`);
if (isNew) await run("supabase shim", readFileSync(join(root, "supabase/local/supabase-shim.sql"), "utf8"));

const applied = new Set((await db.query(`select name from local.migrations`)).rows.map((r) => r.name));
const migrationsDir = join(root, "supabase/migrations");
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  await run(`migration ${file}`, readFileSync(join(migrationsDir, file), "utf8"));
  await db.query(`insert into local.migrations (name) values ($1)`, [file]);
}

const seedFile = join(root, "supabase/seed.sql");
if (isNew && existsSync(seedFile)) await run("seed.sql (sample content)", readFileSync(seedFile, "utf8"));

// RLS policies use this for the anon/authenticated API roles. (The Next.js
// server connects as the owner and filters sample content in code.)
await db.exec(`set app.show_sample_content = 'true'`);

// Many clients (dev server, build workers, scripts); PGlite runs their queries one at a time.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 50 });
await server.start();
console.log(`\nLocal database ready: postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`);
console.log("Press Ctrl+C to stop.");

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
