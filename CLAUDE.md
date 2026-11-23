# Yojo Holidays

@AGENTS.md

Travel discovery and enquiry platform. Full architecture notes live in @README.md.

## Commands

- `npm run dev` — dev server
- `npm run check` — lint + typecheck (run before saying work is done)
- `npm run build` — prisma generate + production build
- `npm run db:migrate` / `db:seed` / `db:verify` — database workflow

## Non-negotiables

- Components never import Prisma. Pages call `@/server/queries`, which wrap `@/server/repositories`.
- Everything in `src/server` and `src/lib/db.ts` imports `server-only`.
- Writes take `unknown` and validate with Zod (`src/server/validation`) before touching the DB.
- Public reads return only `PUBLISHED` content; respect the `isSample` rules.
- URLs are built with `src/lib/routes.ts` (trailing slashes, no DB ids).
- Never commit `.env*` (except `.env.example`) or `src/generated/`.

More focused rules live in `.claude/rules/`.
