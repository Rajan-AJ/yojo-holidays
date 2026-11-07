# Yojo Holidays

Travel discovery and enquiry platform: tours, destinations, itineraries, visa information, travel journal, lead management and a custom admin dashboard.

**Status:** Phase 1 (foundation) complete. See "Roadmap" below.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, TypeScript, Cache Components + Partial Prefetching) |
| Styling | Tailwind CSS v4 (tokens in `src/app/globals.css`) |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`, no Rust query engine) |
| Validation | Zod |
| Fonts | Playfair Display + Inter, self-hosted variable woff2 via `next/font/local` |
| Hosting | Vercel-compatible |

## Getting started

Requirements: Node.js 20.9+ (22 LTS recommended), PostgreSQL 14+.

```bash
npm install                        # also runs `prisma generate`
cp .env.example .env.local         # Next.js reads this
cp .env.example .env               # Prisma CLI reads this
# edit DATABASE_URL in both files

npm run db:migrate -- --name init  # creates prisma/migrations/ and the tables
npm run dev                        # http://localhost:3000
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | lint + typecheck |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:studio` | Browse the database |

## Project structure

```
prisma/
  schema.prisma          Data model (all content is database-driven)
prisma.config.ts         Prisma 7 config (database URL from env)
public/brand/            Client logo
src/
  app/
    layout.tsx           Root: fonts, global metadata, noindex guard
    globals.css          Design tokens (colour, type scale, spacing, motion)
    (site)/              Public website (Header + Footer shell)
      page.tsx           Homepage skeleton
    not-found.tsx
    robots.ts
    fonts/               Self-hosted woff2 + OFL licences
  components/
    layout/              Header, Footer, Wordmark
    ui/                  Container, ButtonLink, SectionHeading
  config/site.ts         Business identity, navigation, placeholders
  lib/                   db (Prisma singleton), env (validated), cn
  generated/prisma/      Generated Prisma client (gitignored)
```

Planned additions, each in its own phase: `src/server/queries/*` and `src/server/actions/*` (all database access and business logic, kept out of components), `src/app/admin/` (separate layout, auth-protected), `src/lib/seo/` (metadata + JSON-LD helpers).

## Architecture decisions

1. **Cache Components on.** Pages are dynamic by default; public content will be cached with `"use cache"` + `cacheTag()` in the query layer, and admin edits will call `revalidateTag()` so changes go live immediately without rebuilding.
2. **Trailing slashes** (`trailingSlash: true`) to match the brief's URL scheme. The non-slash form 308-redirects, so there is one canonical URL per page.
3. **`(site)` route group** so `/admin` can have its own shell without the public header/footer.
4. **One `User` model with a `role`** (ADMIN / EDITOR) instead of separate User and Admin tables. Server-side `Session` table; the cookie only carries an opaque token.
5. **Lead vs Enquiry.** A Lead is a person moving through the pipeline (New → Contacted → … → Confirmed / Lost). Each form submission is an Enquiry attached to a Lead, with UTM data and the raw validated payload.
6. **Visa Finder data model.** `VisaCountry` (the page) → `VisaType` (Tourist e-Visa, Business Visa) → `VisaRequirement` per passport country, plus `VisaDocument` and `VisaFAQ`. `lastVerifiedAt` and `sourceUrl` exist because visa rules change.
7. **`isSample` flag** on packages and reviews marks development data so it can never be published as real.
8. **Indexing is off by default.** Every deployment sends `noindex` and a blocking robots.txt until `NEXT_PUBLIC_ALLOW_INDEXING=true` is set on the live domain.
9. **Self-hosted fonts** (~125 KB, latin only): no third-party request, no layout shift.
10. **Accessibility baseline:** skip link, native `<dialog>` mobile menu (focus trap + Esc), visible focus rings, reduced-motion override, semantic landmarks, one H1 per page.

## Content placeholders

`src/config/site.ts` uses `[CLIENT PHONE]`, `[CLIENT WHATSAPP]`, `[CLIENT EMAIL]` and `[CLIENT ADDRESS]`. They render as plain text (never as links) until replaced. The brand name and tagline come from the supplied logo.

## Roadmap

1. ~~Project foundation~~ · 2. Design system · 3. Homepage · 4. Tour listing · 5. Destination pages · 6. Package details · 7. Itinerary system · 8. Visa system · 9. Travel Journal · 10. Plan Your Trip + leads · 11. Admin dashboard · 12. SEO/AEO/GEO · 13. Analytics · 14. Testing · 15. Deployment
