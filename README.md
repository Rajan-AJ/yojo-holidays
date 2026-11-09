# Yojo Holidays

Travel discovery and enquiry platform: tours, destinations, itineraries, visa information, travel journal, lead management and a custom admin dashboard.

**Status:** Phases 1–5 complete (foundation, design system, database + content architecture, dynamic public pages, visa system). See "Roadmap" below.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, TypeScript, Cache Components + Partial Prefetching) |
| Styling | Tailwind CSS v4 (tokens in `src/app/globals.css`) |
| Animation | Motion (`motion/react`, LazyMotion), reduced-motion aware |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`, no Rust query engine) |
| Validation | Zod (all writes validated server-side) |
| Fonts | Playfair Display + Inter, self-hosted variable woff2 via `next/font/local` |
| Hosting | Vercel-compatible |

## Getting started

Requirements: Node.js 20.9+ (22 LTS recommended).

```bash
npm install                        # also runs `prisma generate`
cp .env.example .env.local         # Next.js reads this
cp .env.example .env               # Prisma CLI reads this
```

### Database

Any PostgreSQL 14+ works. For local development without installing PostgreSQL, use Prisma's built-in dev server:

```bash
npx prisma dev --name yojo --detach   # prints the connection details
npx prisma dev ls                     # shows them again
```

Put its **TCP** URL in `DATABASE_URL` and its shadow URL in `SHADOW_DATABASE_URL` (both `.env` and `.env.local`), e.g.
`postgres://postgres:postgres@localhost:51214/template1?sslmode=disable` and port `51215` for the shadow.
With a normal PostgreSQL server, leave `SHADOW_DATABASE_URL` empty.

```bash
npx prisma migrate dev     # apply migrations
npm run db:seed            # development sample data (refuses to run in production)
npm run db:verify          # checks every relationship, constraint and query
npm run dev                # http://localhost:3000
```

Production: `npm run db:deploy` applies migrations. Never seed production.

### Environment notes

| Variable | Purpose |
| --- | --- |
| `DATABASE_POOL_MAX` | Connections per server process (default 10). Use `1` with the local `prisma dev` database, which only handles one connection reliably. |
| `NEXT_BUILD_CPUS` | Optional cap on build workers. Pages prerender from the database at build time; `1` keeps the local database stable. Leave unset on a real PostgreSQL server. |
| `SHOW_SAMPLE_CONTENT` | `true` shows seeded sample content in production builds (local/staging). Must be `false`/unset on the live site. |

The database must be reachable during `next build` (pages are prerendered from it).
If the local `prisma dev` database starts dropping connections after many restarts, restart it: `npx prisma dev stop yojo && npx prisma dev --name yojo --detach`.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` / `npm run check` | ESLint / `tsc --noEmit` / both |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Load development sample data (idempotent) |
| `npm run db:verify` | End-to-end data-flow verification (cleans up after itself) |
| `npm run db:studio` | Browse the database |

## Project structure

```
prisma/
  schema.prisma          Data model
  migrations/            SQL migrations (incl. CHECK constraints)
  seed.ts                Development sample data
prisma.config.ts         Prisma 7 config (URLs from env, seed command)
scripts/verify-data.ts   Data-flow verification
src/
  app/                   Routes. (site)/ = public website shell
  components/            ui/, cards/, media/, motion/, sections/, layout/, home/
  config/site.ts         Business identity and navigation
  content/               Homepage placeholder data (replaced by queries in Phase 4)
  lib/                   db (Prisma singleton), env, routes, seo/, format, labels
  server/
    validation/          Zod schemas for every write (content, leads, enquiries)
    repositories/        Prisma queries -> typed view models (framework-agnostic)
    queries/             Cached ("use cache" + cacheTag) functions pages call
    services/            Write paths: createLead, createEnquiry
  types/content.ts       View models shared by UI and data layer
  generated/prisma/      Generated Prisma client (gitignored)
```

### Data access rules

- Components never import Prisma. Pages call `@/server/queries`; those wrap `@/server/repositories`.
- Repositories return plain serialisable objects (numbers, ISO strings), never `Decimal` or Prisma types.
- Everything under `src/server` and `src/lib/db.ts` imports `server-only`, so it cannot reach a client bundle.
- Public reads only return `PUBLISHED` content. Sample rows (`isSample`) show in development and are hidden in production unless `SHOW_SAMPLE_CONTENT=true`.
- Writes take `unknown` input and validate with Zod before touching the database.

## Content model (summary)

```
Region (self-tree) ─< Country ─< Destination (self-tree, related) ─< TourPackage
                                                   TourPackage >─< TourCategory
TourPackage ─< ItineraryDay (unique dayNumber) ─> Hotel / Destination / Media
TourPackage ─< PackageHotel >─ Hotel ─> Country
TourPackage ─< PackageHighlight / PackageInclusion / PackageExclusion / PackageImage
Country ─ VisaCountry ─< VisaType ─< VisaRequirement
                         VisaType ─< VisaEligibility >─ Country (passport)
Destination / Country ─< TravelGuide (self many-to-many "related")
FAQ ─> at most one of: package, destination, country, guide, visa country, visa type
Review ─> package / destination        Lead ─> package        Enquiry (standalone)
Region, Country, Destination, TourCategory, TourPackage, VisaCountry, TravelGuide ─ SeoMeta (1:1)
Media is referenced everywhere an image appears (alt text required)
```

## Architecture decisions

1. **Cache Components on.** Public content is cached with `"use cache"` + `cacheTag()` in `src/server/queries`; admin edits will call `revalidateTag()` so changes go live without a rebuild.
2. **Trailing slashes** (`trailingSlash: true`); the non-slash form 308-redirects, one canonical URL per page.
3. **`(site)` route group** so `/admin` can have its own shell.
4. **One `User` model with a `role`** (ADMIN / EDITOR). Server-side `Session` table; the cookie only carries an opaque token. (Auth itself: Phase 11.)
5. **Region is a table, not an enum**, with an optional parent (Southeast Asia → Asia).
6. **Destination covers country, region, city and place** (`type`), with a parent (Hanoi → Vietnam). `scope` (DOMESTIC / INTERNATIONAL) drives the URL. Domestic/International is therefore *not* a TourCategory, so a package can't be filed under the wrong one; categories are travel styles.
7. **One FAQ table** with optional owner columns and a CHECK constraint allowing at most one owner (no owner = site-wide/homepage FAQ). Visa FAQs are FAQ rows owned by a VisaType or VisaCountry, so FAQ schema/markup logic is written once.
8. **Reusable `SeoMeta` (one-to-one)** instead of SEO columns on every table. Absent = derive from content.
9. **Visa:** `VisaRequirement` = documents/conditions per visa type; `VisaEligibility` = what a given passport needs (powers the Visa Finder). The visa URL uses the country slug (`/visa/vietnam/`), no duplicate slug. `lastVerifiedAt` and `sourceUrl` exist because rules change.
10. **Lead vs Enquiry.** A Lead is a structured trip request in the sales pipeline (with UTM source/medium/campaign and an optional package). An Enquiry is a general contact message, kept out of the pipeline.
11. **Integrity in two layers:** Zod in the app, CHECK constraints in the database (ratings 1–5, star ratings, durations, positive prices, day numbers, single-owner FAQs, slug format).
12. **`isSample` flag** on editorial tables; seed data is always sample. No reviews are seeded, prices are null, visa content is explicit placeholders.
13. **Indexing is off by default** until `NEXT_PUBLIC_ALLOW_INDEXING=true` on the live domain.
14. **Self-hosted fonts**; accessibility baseline (skip link, native `<dialog>` menu, focus rings, reduced motion, landmarks).

## Public pages (Phase 4)

| Route | Source | Notes |
| --- | --- | --- |
| `/` | `app/(site)/page.tsx` | All travel content from the database; editorial copy in `src/content/home.ts` |
| `/tours/` | listing template | All tours, with filters |
| `/international-tours/`, `/domestic-tours/` | listing template | Scope listings, with filters |
| `/{style}-tours/` (e.g. `/family-tours/`) | `app/(site)/tour-styles/[category]` | Proxy rewrites the public URL to the internal route |
| `/{scope}-tours/{destination}/` | `components/templates/destination-page.tsx` | Shared by both scopes |
| `/{scope}-tours/{destination}/{package}/` | `components/templates/package-page.tsx` | Package must belong to the destination |
| `/destinations/` | `app/(site)/destinations` | Top-level destinations by scope |
| `/search/?q=` | `app/(site)/search` | Countries, destinations, tours (noindex) |

**Status codes.** With Cache Components + Partial Prefetching, a URL whose params weren't prerendered gets the route's App Shell immediately (HTTP 200), so `notFound()` in a page can only give a "soft" 404. `src/proxy.ts` therefore checks destination/package/style slugs before rendering (indexed lookup, memoised for 60 s per instance): unknown → real **404**, wrong scope → **308** to the canonical URL, `/tour-styles/…` → **308** to `/{style}-tours/`. Pages keep their own `notFound()` as a second line of defence.

**Filters** live in the URL (`?destination=vietnam&duration=week&category=family&maxPrice=…`): shareable, crawlable, no client JavaScript. Values are validated on the server; invalid ones are ignored. The results stream inside `<Suspense>`; the rest of each listing page is static.

**Caching.** Every query in `src/server/queries` is `"use cache"` + `cacheLife("hours")` + `cacheTag(...)`. Pages are prerendered at build (all published destinations/packages/styles via `generateStaticParams`); new slugs render on first visit and are then cached. Edits appear within about an hour today; the admin (Phase 11) will call `revalidateTag()` on save for immediate updates. Search results use `cacheLife("minutes")`.

**Structured data** (`src/lib/seo/schema.ts`): BreadcrumbList on every page with breadcrumbs; Organization on the homepage; TouristDestination, TouristTrip, Product/Offer (only with a real price), AggregateRating (only with real published reviews) and FAQPage (only with real FAQs). Sample content never gets entity schema.

**Database resilience.** One Prisma client per process (shared by the Proxy and the app). Reads are retried once if the connection was closed underneath them (common with poolers); writes are never retried. Streamed sections show a friendly error state and log the real error server-side.

## Visa system (Phase 5)

| Route | What it is |
| --- | --- |
| `/visa/` | Service page: hero, embedded Visa Finder, popular visa guides, how it works, common documents (counted from data), visa FAQs, visa guides, CTA |
| `/visa/finder/` | Passport → destination → purpose → result. Answers live in the URL (`?passport=IN&destination=vietnam&purpose=TOURISM`); the result is rendered on the server from the database. Canonical: `/visa/finder/` |
| `/visa/{country}/` | Guide for the default passport: answer-first quick answers, verification notice, visa types, documents, numbered steps, FAQs, related tours/guides/destinations |
| `/visa/{country}/{type}/` | Only for visa types with enough content to stand alone (≥2 types in the guide, ≥3 documents, ≥3 steps, a description or eligibility). Thinner types stay on the country page; their URLs 404 |

**Data model.** A `VisaCountry` (guide) is unique per destination **and passport** (`passportCountryId`), because requirements differ by passport. `visaConfig.defaultPassportIso` (`src/config/site.ts`, "IN") decides which guide `/visa/{country}/` shows; more passports are a data change. `VisaType.kind` (e-Visa, visa on arrival…), ordered `VisaProcessStep` rows, `VisaRequirement` documents and FAQs (owned by the guide or a type; `placement: VISA` for `/visa/`).

**Honesty rules (enforced in `src/server/repositories/visa.ts`).** A guide is *verified* only with `lastVerifiedAt` set and `isSample = false`. Fees and processing times are returned only for verified guides; otherwise pages show "Visa fees may vary. Contact our visa assistance team…". `kind` is never guessed. Unverified guides display a notice before any content. `Service` and `FAQPage` schema are never emitted for sample guides.

## URL scheme

| Content | URL |
| --- | --- |
| Destination | `/international-tours/vietnam/`, `/domestic-tours/kerala/` |
| Package | `/international-tours/vietnam/vietnam-7-days-6-nights/` |
| Tour style | `/family-tours/` |
| Visa | `/visa/vietnam/`, `/visa/japan/business-visa/`, `/visa/finder/` |
| Journal article | `/travel-journal/best-time-to-visit-vietnam/` |
| Journal category | `/travel-journal/category/visa-guides/` |

All built by `src/lib/routes.ts`; database ids never appear in URLs.

## Content placeholders

`src/config/site.ts` uses `[CLIENT PHONE]`, `[CLIENT WHATSAPP]`, `[CLIENT EMAIL]`, `[CLIENT ADDRESS]` and social URL placeholders. They render as plain text (never as links) until replaced.

## Roadmap

1. ~~Project foundation~~ · 2. ~~Design system~~ · 3. ~~Database + content architecture~~ · 4. ~~Dynamic homepage, destinations, packages, categories~~ · ~~Visa system + Visa Finder~~ · 5. Destination pages (content depth) · 6. Package details (gallery, enquiry) · 7. Itinerary system · 8. Visa system · 9. Travel Journal · 10. Plan Your Trip + leads · 11. Admin dashboard · 12. SEO/AEO/GEO · 13. Analytics · 14. Testing · 15. Deployment
