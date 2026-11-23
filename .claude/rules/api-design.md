---
paths:
  - "src/server/**"
  - "src/app/**/route.ts"
  - "src/proxy.ts"
---

# Server / API design

- Layering: `validation` (Zod) → `services` (writes) / `repositories` (Prisma reads) → `queries` (cached) → pages.
- Repositories return plain serialisable view models from `src/types/content.ts` — never `Decimal` or Prisma types.
- Every file here starts with `import "server-only";`.
- Writes: accept `unknown`, `safeParse` with Zod, return a typed result; never retry writes.
- Reads: wrap in `"use cache"` + `cacheLife(...)` + `cacheTag(...)`; tag names must be reusable by admin `revalidateTag()`.
- Filter public reads to `PUBLISHED`, and apply the `isSample` visibility rule.
- Visa data: never expose fees/processing times for unverified guides (see `repositories/visa.ts`).
- Real 404/308 decisions for slugs belong in `src/proxy.ts`; pages keep `notFound()` as a fallback.
