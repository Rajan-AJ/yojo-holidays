# Yojo Holidays

@AGENTS.md

Travel discovery and enquiry platform. Full architecture notes live in @README.md.

## Commands

- `npm run db:local` — local Postgres on :54322 (applies `supabase/migrations` + `supabase/seed.sql`; `-- --reset` to wipe)
- `npm run dev` — dev server
- `npm run check` — lint + typecheck (run before saying work is done)
- `npm run build` — production build (needs the database reachable)
- `npm run db:test` — migrations + RLS + triggers test suite (in-memory, no server needed)
- `npm run db:verify` — every repository + the lead write path against `DATABASE_URL`
- `npm run db:verify-admin` — CMS engine: every content type round-trips, nested saves, guards

## Non-negotiables

- Schema lives in SQL: `supabase/migrations/*.sql` (new file per change, never edit an applied one).
- Components never import `@/lib/db`. Pages call `@/server/queries`, which wrap `@/server/repositories` (parameterised SQL via `pg`).
- Everything in `src/server` and `src/lib/db.ts` imports `server-only`.
- Writes take `unknown` and validate with Zod (`src/server/validation`) before touching the DB.
- Public reads use `live(alias)` from `repositories/shared.ts` (published, `published_at <= now()`, not deleted, `is_sample` rule).
- RLS is on for every table; new tables need policies in a migration. Never `to authenticated using (true)`.
- URLs are built with `src/lib/routes.ts` (trailing slashes, no DB ids).
- Never commit `.env*` (except `.env.example`) or `src/generated/`.

- Admin: content types are declared in `src/server/admin/resources.ts` (generic list/editor/save). Every page calls `requireStaff()`, every action `requirePermission()`; saves go through `transaction(work, session.id)`.

More focused rules live in `.claude/rules/`.
