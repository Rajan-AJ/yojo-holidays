---
paths:
  - "src/**/*.{ts,tsx}"
  - "supabase/**"
  - "scripts/**"
---

# Testing & verification

There is no unit-test framework yet. Verify changes with:

1. `npm run check` — ESLint + `tsc --noEmit`. Must pass.
2. `npm run db:test` after any change in `supabase/migrations/` (RLS + trigger tests in `scripts/test-db.mjs`; add cases for new rules).
3. `npm run db:verify` after changes to repositories, queries or the seed.
4. `npm run build` for routing, caching (`"use cache"`) or proxy changes.

When reporting results, paste the failing output; don't claim success without running the command.
If a test framework is added later, colocate tests as `*.test.ts` next to the code.
