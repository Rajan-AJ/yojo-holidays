---
paths:
  - "src/server/**"
  - "src/app/**/route.ts"
  - "src/proxy.ts"
---

# Server / API design

- Layering: `validation` (Zod) → `services` (writes) / `repositories` (SQL reads via `@/lib/db`) → `queries` (cached) → pages.
- Repositories return plain serialisable view models from `src/types/content.ts` — never raw rows. Values always go through `$n` parameters; only constant SQL fragments are interpolated.
- Every file here starts with `import "server-only";`.
- Writes: accept `unknown`, `safeParse` with Zod, return a typed result; never retry writes.
- Reads: wrap in `"use cache"` + `cacheLife(...)` + `cacheTag(...)`; tag names must be reusable by admin `revalidateTag()`.
- Filter public reads with `live(alias)` (published, not scheduled, not deleted, `is_sample` rule).
- Writes run in `transaction(work, actorId)` so audit triggers record the staff member.
- Visa data: never expose fees/processing times for unverified guides (see `repositories/visa.ts`).
- Real 404/308 decisions for slugs belong in `src/proxy.ts`; pages keep `notFound()` as a fallback.
