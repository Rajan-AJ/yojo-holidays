# Checklist

## Data boundary
- [ ] No `pg` / `@/lib/db` / `@/server/*` import reachable from a `"use client"` file
- [ ] SQL: user values only through `$n` parameters (no string-built SQL from input)
- [ ] New tables: RLS enabled + policies in the migration; no `to authenticated using (true)`; private data not on publicly readable tables
- [ ] `SUPABASE_SERVICE_ROLE_KEY` / `DATABASE_URL` never referenced from client code or `NEXT_PUBLIC_*`
- [ ] New server files import `server-only`
- [ ] Repositories don't leak internal fields (ids used in URLs, `isSample`, admin notes)

## Input
- [ ] Every write (lead, enquiry, admin edit) validated with Zod before DB access
- [ ] Search params / route params validated; invalid values ignored, not trusted
- [ ] No raw SQL built from user input (`$queryRawUnsafe`, string concatenation)

## Output
- [ ] No `dangerouslySetInnerHTML` with unsanitised content
- [ ] JSON-LD built from trusted data and escaped
- [ ] Unverified visa guides never show fees / processing times

## Secrets & config
- [ ] No secrets in `NEXT_PUBLIC_*` vars or committed files
- [ ] `.env*` stays gitignored; `.env.example` contains placeholders only
- [ ] Indexing stays off unless `NEXT_PUBLIC_ALLOW_INDEXING=true`

## Auth (Phase 11+)
- [ ] Admin routes check session + role server-side
- [ ] Session cookie: httpOnly, secure, sameSite, opaque token only
- [ ] Server actions verify the caller, not just the UI
