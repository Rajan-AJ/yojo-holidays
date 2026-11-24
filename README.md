# Yojo Holidays

Travel discovery and enquiry platform for Indian travellers: domestic and international packages, destinations, visa guides, a blog, and a lead pipeline with marketing attribution. Every page is generated from the database; nothing travel-related is hard-coded.

**Status:** database (Supabase Postgres + RLS), public site, enquiry flow with attribution, blog, CMS pages, and the admin CMS at `/admin/`. Next: real content, premium design pass, go-live. See [Roadmap](#roadmap).

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, TypeScript, Cache Components + Partial Prefetching) |
| Database | PostgreSQL on Supabase. Schema = SQL migrations in `supabase/migrations/` |
| Data access | `pg` with parameterised SQL in `src/server/repositories` (no ORM) |
| Auth / files | Supabase Auth (staff), Supabase Storage (`media` public bucket, `private` bucket) |
| Validation | Zod on every write (`src/server/validation`) + CHECK constraints / domains in the DB |
| Styling / motion | Tailwind CSS v4 (tokens in `src/app/globals.css`), Motion |
| Hosting | Vercel-compatible |

## Getting started (local)

Requirements: Node.js 24.

```bash
npm install
cp .env.example .env.local      # defaults point at the local database
npm run db:local                # terminal 1: Postgres on 127.0.0.1:54322
npm run dev                     # terminal 2: http://localhost:3000
```

`npm run db:local` runs a real Postgres (PGlite) with a small Supabase stand-in (`supabase/local/supabase-shim.sql`: API roles, `auth.uid()`, storage tables). On first start it applies every migration and `supabase/seed.sql` (sample content, all flagged `is_sample`). Data persists in `.local-db/`; `npm run db:local -- --reset` starts fresh. New migration files are applied on the next start.

| Command | What it does |
| --- | --- |
| `npm run check` | ESLint + TypeScript. Must pass. |
| `npm run db:test` | Applies all migrations to an in-memory database and tests RLS per role, triggers and constraints (65+ checks). |
| `npm run db:verify` | Calls every repository and the lead write path against `DATABASE_URL`. |
| `npm run db:verify-admin` | CMS engine: every content type round-trips through load/save, nested children, guards. |
| `npm run build` | Production build. Pages prerender from the database, so it must be reachable (`NEXT_BUILD_CPUS=1` with the local DB). |

## Going live on Supabase

1. Create a Supabase project (region: Mumbai `ap-south-1`).
2. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push` (runs `supabase/migrations/*` in order). **Never** run `supabase/seed.sql` or the local shim against production.
3. Environment (Vercel → Settings → Environment Variables):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **transaction pooler** string (port 6543). Server only. |
   | `DATABASE_POOL_MAX` | `5` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (public by design; RLS protects data) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key. **Server only**, never `NEXT_PUBLIC_` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<live domain>` |
   | `NEXT_PUBLIC_ALLOW_INDEXING` | `true` on the live domain only |
   | `NEXT_PUBLIC_GTM_ID` | GTM container (Google Ads + Meta conversion tags) |

4. Nightly job (Supabase → Database → Cron): `select public.refresh_all_starting_prices();` so expired price seasons drop out of "from" prices.
5. Create the first Super Admin: create the user in Supabase Auth (Authentication → Users), then in the SQL editor insert their `profiles` row and a `user_roles` row with role `super_admin`. After that, invite everyone else from **Admin → Team & roles**.

## Project structure

```
supabase/
  migrations/            100 schema · 200 RLS · 300 triggers · 400 reference data
  seed.sql               development sample content (never production)
  local/supabase-shim.sql  local stand-in for Supabase roles/auth/storage
scripts/
  local-db.mjs           local Postgres server
  test-db.mjs            RLS / trigger / constraint tests
  verify-data.ts         repository + write-path verification
src/
  app/(site)/            public pages (route list below)
  components/            ui/, cards/, sections/, templates/, package/, forms/, blog/...
  config/site.ts         brand + navigation (contact details move to site_settings)
  lib/                   db (pg pool), routes, media URLs, rich text, seo/
  server/
    validation/          Zod schemas for every write
    repositories/        SQL -> view models (src/types/content.ts)
    queries/             cached ("use cache" + cacheTag) functions pages call
    services/            write paths: leads + attribution
  proxy.ts               CMS redirects + real 404s for unknown slugs
```

### Data access rules

- Components never import `@/lib/db`. Pages call `@/server/queries`, which wrap `@/server/repositories`.
- SQL values always go through `$n` parameters. Only constant fragments from code (`live("p")`, `mediaJson(...)`) are interpolated.
- One query per page: nested data (itinerary, prices, gallery, FAQs) comes back as JSON from Postgres.
- Public reads use `live(alias)`: `published`, `published_at <= now()` (so future dates = scheduled), not soft-deleted, sample rule.
- The server connects with a privileged role, so it bypasses RLS and applies these rules itself. RLS is the wall for everything reachable with the public anon key (browser, Storage, future customer app).
- Writes run in `transaction(work, actorId)`; the actor id feeds `auth.uid()` so triggers fill `created_by`/`updated_by` and the audit log.

## Database architecture (summary)

```
regions ─< countries ─< destinations (tree) ─< packages (primary) >─< destinations (package_destinations)
packages ─< itinerary_days ─< itinerary_day_items · package_prices ─< package_departures
packages ─< package_inclusions (included/excluded, typed) · package_highlights · package_hotels >─ hotels
packages >─< package_categories · packages ─> policies (terms / cancellation / payment, reusable)
countries ─< visa_guides (per passport) ─< visa_types ─< visa_documents / visa_process_steps / visa_fees
blog_posts ─> authors, blog_categories · blog_posts >─< tags, destinations, packages
faqs ─< faq_links ─> exactly one of: package | destination | country | visa guide | post | page | category
contacts ─< leads ─< lead_touchpoints (first/last, UTMs, gclid, fbclid) ─> marketing_channels · lead_activities
media_assets (bucket + path, never URLs) · seo_meta (1:1) · redirects · site_settings · audit_log · content_revisions
```

- **Publishing:** `draft | published | unpublished | archived` + `published_at` (future = scheduled) + `deleted_at` (trash).
- **Slugs** are globally unique per type (partial unique index ignoring deleted rows). Changing a published slug creates a 301 automatically and collapses redirect chains.
- **Derived fields** kept by triggers: `scope` (India = domestic), `starting_price` (cheapest current price), primary destination link.
- **Roles:** `super_admin`, `admin`, `editor`, `marketing`, `sales`. Permissions are rows in `role_permissions`, checked by `has_permission(resource, action)`; publish/delete are enforced by trigger. Sales see only their own and unassigned leads.
- **Personal data** (contacts, leads) is never publicly readable; the audit log stores changed column names only (DPDP-friendly).

## Public pages

| Route | Notes |
| --- | --- |
| `/` | Homepage, all travel content from the database |
| `/tours/`, `/international-tours/`, `/domestic-tours/` | Listings with URL filters (destination, duration, style, price) |
| `/tours/{category}/` | Travel style (Family, Honeymoon, Gen Z...). Empty styles are noindex |
| `/destinations/`, `/destinations/{slug}/` | Destination pages (best months, tips, places, visa, tours, blog, FAQs) |
| `/packages/{slug}/` | Package pages (itinerary, prices by season, departures, hotels, inclusions, policies, FAQs) |
| `/visa/`, `/visa/{guide}/`, `/visa/{guide}/{type}/`, `/visa/finder/` | Visa system (fees and processing times only for verified guides) |
| `/blog/`, `/blog/{slug}/`, `/blog/category/{slug}/` | Blog with keyset pagination (`?before=`) |
| `/plan-your-trip/`, `/contact/`, `/thank-you/` | Enquiry flow (server action → `createLead`) |
| `/faq/`, `/search/`, `/sitemap.xml`, `/robots.txt` | |
| `/{slug}/` | CMS pages built from blocks (About, Privacy Policy, Terms, landing pages) |

All URLs come from `src/lib/routes.ts`, which must stay in sync with `public.content_path()` in the triggers migration.

## Admin CMS (`/admin/`)

| Area | What staff can do |
| --- | --- |
| Dashboard | New leads today / 7 / 30 days, leads by source, pipeline, own follow-ups, content counts |
| Leads | Inbox with filters (stage, owner, source, type, search incl. `YJ-000123`), lead page with contact links (call / WhatsApp), trip details, first/last-touch attribution, stage / owner / priority / follow-up, timeline notes, CSV export |
| Travel | Packages (itinerary with activities, prices by season, group departures, hotels, inclusions, gallery, FAQs, policies), destinations, travel styles, hotels, terms & policies |
| Content | Blog posts, categories, authors, tags, pages (block builder: text, image + text, numbers, CTA, FAQs, tours, destinations, testimonials), FAQs (write once, reuse), testimonials, media library |
| Visa | Guides with visa types, documents, steps and fees; fees/processing times show publicly only once "last verified" is set |
| Marketing / Settings | Redirects, website settings (contact, WhatsApp, logo, default SEO), social links, countries, lead stages, team & roles |

Every editor has draft / publish / unpublish / archive, scheduling (future publish date), trash with restore, a SEO panel with a Google preview and focus-keyword checks, and "View on website". Saving refreshes the affected public pages immediately (`updateTag`).

**How it's built:** each content type is a declaration in `src/server/admin/resources.ts`; one generic engine (`crud.ts`) builds validation and parameterised SQL from it, so a new content type needs no new screens. Auth is Supabase Auth (`/admin/login/`); roles and permissions come from `user_roles` / `role_permissions`, checked on every page and action and again by database triggers.

**Local development without Supabase:** `/admin/login/` offers a "local development sign-in" (create a local Super Admin, then pick any local staff account). It is enabled only when `NODE_ENV=development`, Supabase isn't configured and the database is on localhost. Uploads then go to `public/uploads/` (gitignored); with Supabase they go to the `media` Storage bucket.

## Leads and attribution

1. `AttributionCapture` (in the site layout) stores the first and the latest touch in the browser: UTMs, `gclid`/`gbraid`/`wbraid`, `fbclid`, Meta `_fbc`/`_fbp`, landing path and referrer.
2. The enquiry form sends them as JSON; `createLead` validates everything, deduplicates the contact by phone (E.164), ignores double submits, and classifies each touch into a channel on the server (`services/attribution.ts`).
3. The thank-you page pushes `generate_lead` (with the lead reference) to GTM, where Google Ads and Meta conversion tags are configured.

## Content placeholders

`src/config/site.ts` uses `[CLIENT PHONE]`-style placeholders until `site_settings` is filled from the admin. They render as plain text, never as links. Sample content is hidden in production unless `SHOW_SAMPLE_CONTENT=true`.

## Roadmap

1. ~~Foundation, design system~~ · 2. ~~Database architecture on Supabase (schema, RLS, triggers, reference data)~~ · 3. ~~Database-driven public site, flat URLs, redirects, sitemap~~ · 4. ~~Enquiry flow + attribution, blog~~ · 5. ~~Admin CMS~~ · ~~About / Privacy / Terms structure~~ · 6. Content entry + premium design pass · 7. Go-live (Supabase project, real content, GTM) · Later: bookings, payments, customer accounts, WhatsApp/CRM integrations (schema already allows them).
