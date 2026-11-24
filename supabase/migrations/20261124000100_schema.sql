-- =============================================================================
-- Yojo Holidays - database schema (step 1 of 4: tables, constraints, indexes)
--
--   Step 1  this file   tables, types, constraints, indexes, updated_at plumbing
--   Step 2  rls.sql      permission helpers + Row Level Security policies
--   Step 3  triggers.sql derived fields, publish checks, redirects, audit log
--   Step 4  seed.sql     reference data (countries, categories, stages, channels)
--
-- Conventions
--   * uuid primary keys (gen_random_uuid()); bigint identity only for append-only logs
--   * snake_case, plural table names
--   * "content standard" columns on publishable content:
--       status, published_at, deleted_at, seo_meta_id, is_sample,
--       created_at, updated_at, created_by, updated_by
--   * publicly visible = status = 'published' AND published_at <= now() AND deleted_at IS NULL
--     (a future published_at = scheduled publishing)
--   * long-form text is rich-text JSON (Tiptap/ProseMirror) in jsonb; short text is text
--   * money is numeric(12,2) + currency_code; never float, never converted copies
--   * timestamps are timestamptz; travel dates are date
--   * NULL means "unknown / not provided"; never '' or 0 for unknown
--   * Every foreign key column is indexed (Postgres does not do this automatically)
--   * RLS is enabled on every table at the end of this file (deny-all until step 2)
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Domains (reusable validated types)
-- -----------------------------------------------------------------------------

create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(value) <= 120);

create domain public.currency_code as char(3)
  check (value ~ '^[A-Z]{3}$');

-- Site-relative path, e.g. /packages/vietnam-6-days-5-nights/
create domain public.url_path as text
  check (value ~ '^/' and length(value) <= 2048);

-- E.164 phone number, e.g. +919876543210
create domain public.phone_e164 as text
  check (value ~ '^\+[1-9][0-9]{7,14}$');

create domain public.email_address as text
  check (value ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(value) <= 254);

-- -----------------------------------------------------------------------------
-- Enums: only for system-stable states. Anything staff may extend is a table.
-- -----------------------------------------------------------------------------

create type public.content_status      as enum ('draft', 'published', 'unpublished', 'archived');
create type public.app_role            as enum ('super_admin', 'admin', 'editor', 'marketing', 'sales');
create type public.tour_scope          as enum ('domestic', 'international');
create type public.destination_type    as enum ('country', 'state', 'region', 'city', 'place');
create type public.departure_type      as enum ('flexible', 'fixed_departure');
create type public.departure_status    as enum ('open', 'filling_fast', 'sold_out', 'closed', 'cancelled');
create type public.media_role          as enum ('hero', 'gallery', 'thumbnail', 'banner');
create type public.itinerary_item_kind as enum ('activity', 'sightseeing', 'transfer', 'place');
create type public.price_basis         as enum ('per_person_twin_sharing', 'per_person', 'per_couple', 'per_group');
create type public.policy_kind         as enum ('terms', 'cancellation', 'payment');
create type public.visa_purpose        as enum ('tourism', 'business', 'transit', 'family_visit');
create type public.visa_kind           as enum ('visa_free', 'visa_on_arrival', 'e_visa', 'eta', 'visa_required');
create type public.visa_entries        as enum ('single', 'double', 'multiple');
create type public.visa_fee_kind       as enum ('government', 'service', 'express', 'other');
create type public.testimonial_source  as enum ('google', 'whatsapp', 'email', 'video', 'website', 'other');
create type public.enquiry_type        as enum ('package', 'custom_trip', 'visa', 'callback', 'general');
create type public.lead_stage_kind     as enum ('open', 'won', 'lost', 'spam');
create type public.lead_priority       as enum ('low', 'normal', 'high');
create type public.date_flexibility    as enum ('exact', 'flexible_week', 'flexible_month', 'undecided');
create type public.touch_type          as enum ('first', 'last');
create type public.lead_activity_type  as enum ('note', 'call', 'whatsapp', 'email', 'meeting', 'stage_change', 'assignment', 'system');
create type public.audit_action        as enum ('insert', 'update', 'delete');

-- =============================================================================
-- A. Identity and access
-- =============================================================================

-- Staff only. Customers (future) get their own table, never this one.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text not null check (length(full_name) between 1 and 200),
  avatar_media_id uuid,                                -- FK added after media_assets
  is_active       boolean not null default true,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_granted_by_idx on public.user_roles (granted_by);

-- resource.action pairs, e.g. ('editor','packages','publish'). Editable without a migration.
create table public.role_permissions (
  role     public.app_role not null,
  resource text not null check (resource ~ '^[a-z_]+$'),
  action   text not null check (action ~ '^[a-z_]+$'),
  primary key (role, resource, action)
);

-- =============================================================================
-- E. Media and SEO (created early: almost everything references them)
-- =============================================================================

-- Files live in Supabase Storage. We store the bucket + path, never a full URL.
create table public.media_assets (
  id               uuid primary key default gen_random_uuid(),
  bucket           text not null default 'media' check (bucket ~ '^[a-z0-9_-]+$'),
  storage_path     text not null check (storage_path !~ '^/' and length(storage_path) <= 1024),
  mime_type        text not null check (mime_type ~ '^[a-z]+/[a-z0-9.+-]+$'),
  width            integer check (width > 0),
  height           integer check (height > 0),
  size_bytes       bigint check (size_bytes > 0),
  blur_placeholder text,                               -- tiny base64 / blurhash for loading state
  alt_text         text not null default '',           -- '' only for purely decorative images
  title            text,
  caption          text,
  credit           text,
  folder           text,
  uploaded_by      uuid references public.profiles (id) on delete set null,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (bucket, storage_path)
);
create index media_assets_uploaded_by_idx on public.media_assets (uploaded_by);
create index media_assets_folder_idx      on public.media_assets (folder, created_at desc) where deleted_at is null;
create index media_assets_created_idx     on public.media_assets (created_at desc) where deleted_at is null;

alter table public.profiles
  add constraint profiles_avatar_media_id_fkey
  foreign key (avatar_media_id) references public.media_assets (id) on delete set null;
create index profiles_avatar_media_id_idx on public.profiles (avatar_media_id);

-- One row per SEO-bearing entity (1:1 via <entity>.seo_meta_id unique).
-- Empty fields fall back to the entity's own fields, then to site_settings defaults.
create table public.seo_meta (
  id               uuid primary key default gen_random_uuid(),
  seo_title        text check (length(seo_title) <= 120),
  meta_description text check (length(meta_description) <= 320),
  focus_keyword    text check (length(focus_keyword) <= 100),
  canonical_path   public.url_path,                     -- null = the page itself
  og_title         text check (length(og_title) <= 120),
  og_description   text check (length(og_description) <= 320),
  og_media_id      uuid references public.media_assets (id) on delete set null,
  noindex          boolean not null default false,
  nofollow         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index seo_meta_og_media_id_idx on public.seo_meta (og_media_id);

-- Public bylines for the blog. A guest author has no profile.
create table public.authors (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           public.slug not null,
  bio            text,
  photo_media_id uuid references public.media_assets (id) on delete set null,
  profile_id     uuid unique references public.profiles (id) on delete set null,
  social_links   jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  status         public.content_status not null default 'draft',
  published_at   timestamptz,
  deleted_at     timestamptz,
  seo_meta_id    uuid unique references public.seo_meta (id) on delete set null,
  is_sample      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,
  constraint authors_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index authors_slug_key       on public.authors (slug) where deleted_at is null;
create index authors_photo_media_id_idx    on public.authors (photo_media_id);
create index authors_created_by_idx        on public.authors (created_by);
create index authors_updated_by_idx        on public.authors (updated_by);

-- =============================================================================
-- B. Geography
-- =============================================================================

create table public.regions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        public.slug not null unique,
  description text,
  parent_id   uuid references public.regions (id) on delete set null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index regions_parent_id_idx on public.regions (parent_id);

-- All ISO countries (reference data). status governs only the optional public page.
create table public.countries (
  id                uuid primary key default gen_random_uuid(),
  iso2              char(2) not null unique check (iso2 ~ '^[A-Z]{2}$'),
  name              text not null unique,
  slug              public.slug not null,
  region_id         uuid references public.regions (id) on delete set null,
  currency_code     public.currency_code,
  languages         text[] not null default '{}',
  calling_code      text check (calling_code ~ '^\+[0-9]{1,4}$'),
  demonym           text,                              -- "Indian": "Vietnam visa for Indian travellers"
  short_description text,
  description       jsonb,
  hero_media_id     uuid references public.media_assets (id) on delete set null,
  status            public.content_status not null default 'draft',
  published_at      timestamptz,
  deleted_at        timestamptz,
  seo_meta_id       uuid unique references public.seo_meta (id) on delete set null,
  is_sample         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  constraint countries_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index countries_slug_key      on public.countries (slug) where deleted_at is null;
create index countries_region_id_idx        on public.countries (region_id);
create index countries_hero_media_id_idx    on public.countries (hero_media_id);
create index countries_status_idx           on public.countries (status, published_at) where deleted_at is null;
create index countries_created_by_idx       on public.countries (created_by);
create index countries_updated_by_idx       on public.countries (updated_by);

-- What travellers browse: country, state, region, city or place (a tree).
create table public.destinations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              public.slug not null,
  type              public.destination_type not null,
  country_id        uuid not null references public.countries (id) on delete restrict,
  parent_id         uuid references public.destinations (id) on delete set null,
  scope             public.tour_scope not null,        -- derived from country (step 3 trigger)
  short_description text,
  description       jsonb,
  hero_media_id     uuid references public.media_assets (id) on delete set null,
  best_time_to_visit text,
  best_months       smallint[] not null default '{}'
                    check (best_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  ideal_duration    text,                              -- "6 to 8 days"
  is_featured       boolean not null default false,
  sort_order        integer not null default 0,
  status            public.content_status not null default 'draft',
  published_at      timestamptz,
  deleted_at        timestamptz,
  seo_meta_id       uuid unique references public.seo_meta (id) on delete set null,
  is_sample         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  search_vector     tsvector generated always as (
                      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(short_description, '')), 'B')
                    ) stored,
  check (parent_id is distinct from id),
  constraint destinations_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index destinations_slug_key        on public.destinations (slug) where deleted_at is null;
create index destinations_country_status_idx     on public.destinations (country_id, status);
create index destinations_parent_id_idx          on public.destinations (parent_id);
create index destinations_scope_status_idx       on public.destinations (scope, status, sort_order) where deleted_at is null;
create index destinations_featured_idx           on public.destinations (sort_order) where is_featured and deleted_at is null;
create index destinations_best_months_idx        on public.destinations using gin (best_months);
create index destinations_search_idx             on public.destinations using gin (search_vector);
create index destinations_hero_media_id_idx      on public.destinations (hero_media_id);
create index destinations_created_by_idx         on public.destinations (created_by);
create index destinations_updated_by_idx         on public.destinations (updated_by);

create table public.destination_travel_tips (
  id             uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  title          text not null,
  body           text not null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index destination_travel_tips_dest_idx on public.destination_travel_tips (destination_id, sort_order);

create table public.destination_media (
  id             uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  media_id       uuid not null references public.media_assets (id) on delete cascade,
  role           public.media_role not null default 'gallery',
  sort_order     integer not null default 0,
  unique (destination_id, media_id, role)
);
create index destination_media_dest_idx  on public.destination_media (destination_id, role, sort_order);
create index destination_media_media_idx on public.destination_media (media_id);

-- =============================================================================
-- C. Taxonomy
-- =============================================================================

-- Family, Honeymoon, Senior Citizen, Women's, Long Weekend, Gen Z, Group Tour...
create table public.package_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          public.slug not null,
  description   text,
  hero_media_id uuid references public.media_assets (id) on delete set null,
  sort_order    integer not null default 0,
  status        public.content_status not null default 'draft',
  published_at  timestamptz,
  deleted_at    timestamptz,
  seo_meta_id   uuid unique references public.seo_meta (id) on delete set null,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  constraint package_categories_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index package_categories_slug_key on public.package_categories (slug) where deleted_at is null;
create unique index package_categories_name_key on public.package_categories (lower(name)) where deleted_at is null;
create index package_categories_status_idx      on public.package_categories (status, sort_order) where deleted_at is null;
create index package_categories_hero_media_idx  on public.package_categories (hero_media_id);
create index package_categories_created_by_idx  on public.package_categories (created_by);
create index package_categories_updated_by_idx  on public.package_categories (updated_by);

-- Flights, Hotels, Meals, Transfers, Sightseeing, Visa, Travel Insurance, Other
create table public.inclusion_types (
  id         uuid primary key default gen_random_uuid(),
  code       public.slug not null unique,
  label      text not null,
  icon       text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- D. Packages
-- =============================================================================

-- Reusable terms / cancellation / payment texts shared by many packages.
create table public.policies (
  id           uuid primary key default gen_random_uuid(),
  kind         public.policy_kind not null,
  title        text not null,
  body         jsonb not null,
  version      integer not null default 1 check (version >= 1),
  is_default   boolean not null default false,       -- used when a package names none
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  constraint policies_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index policies_one_default_per_kind on public.policies (kind) where is_default and deleted_at is null;
create index policies_kind_status_idx            on public.policies (kind, status);
create index policies_created_by_idx             on public.policies (created_by);
create index policies_updated_by_idx             on public.policies (updated_by);

create table public.hotels (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           public.slug not null,
  destination_id uuid references public.destinations (id) on delete set null,
  star_rating    smallint check (star_rating between 1 and 5),   -- official category, not a review score
  description    text,
  address        text,
  website        text check (website ~ '^https?://'),
  media_id       uuid references public.media_assets (id) on delete set null,
  deleted_at     timestamptz,
  is_sample      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null
);
create unique index hotels_slug_key         on public.hotels (slug) where deleted_at is null;
create index hotels_destination_id_idx      on public.hotels (destination_id);
create index hotels_media_id_idx            on public.hotels (media_id);
create index hotels_name_trgm_idx           on public.hotels using gin (name extensions.gin_trgm_ops);
create index hotels_created_by_idx          on public.hotels (created_by);
create index hotels_updated_by_idx          on public.hotels (updated_by);

create table public.packages (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (length(name) between 3 and 200),
  slug                   public.slug not null,                    -- /packages/{slug}/
  primary_destination_id uuid not null references public.destinations (id) on delete restrict,
  scope                  public.tour_scope not null,              -- derived (step 3 trigger)
  departure_type         public.departure_type not null default 'flexible',
  duration_days          smallint not null check (duration_days between 1 and 90),
  duration_nights        smallint not null,
  starting_price         numeric(12,2) check (starting_price > 0), -- derived from package_prices; null = on request
  currency               public.currency_code not null default 'INR',
  short_description      text check (length(short_description) <= 500),
  description            jsonb,
  important_notes        jsonb,
  terms_policy_id        uuid references public.policies (id) on delete restrict,
  cancellation_policy_id uuid references public.policies (id) on delete restrict,
  payment_policy_id      uuid references public.policies (id) on delete restrict,
  hero_media_id          uuid references public.media_assets (id) on delete set null,
  is_featured            boolean not null default false,
  sort_order             integer not null default 0,
  status                 public.content_status not null default 'draft',
  published_at           timestamptz,
  deleted_at             timestamptz,
  seo_meta_id            uuid unique references public.seo_meta (id) on delete set null,
  is_sample              boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references public.profiles (id) on delete set null,
  updated_by             uuid references public.profiles (id) on delete set null,
  search_vector          tsvector generated always as (
                           setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                           setweight(to_tsvector('english', coalesce(short_description, '')), 'B')
                         ) stored,
  constraint packages_nights_match_days check (duration_nights between greatest(duration_days - 1, 0) and duration_days),
  constraint packages_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index packages_slug_key           on public.packages (slug) where deleted_at is null;
create index packages_status_published_idx      on public.packages (status, published_at desc) where deleted_at is null;
create index packages_scope_price_idx           on public.packages (scope, status, starting_price) where deleted_at is null;
create index packages_primary_dest_idx          on public.packages (primary_destination_id, status);
create index packages_featured_idx              on public.packages (sort_order) where is_featured and deleted_at is null;
create index packages_duration_idx              on public.packages (duration_days) where deleted_at is null;
create index packages_search_idx                on public.packages using gin (search_vector);
create index packages_terms_policy_idx          on public.packages (terms_policy_id);
create index packages_cancellation_policy_idx   on public.packages (cancellation_policy_id);
create index packages_payment_policy_idx        on public.packages (payment_policy_id);
create index packages_hero_media_id_idx         on public.packages (hero_media_id);
create index packages_created_by_idx            on public.packages (created_by);
create index packages_updated_by_idx            on public.packages (updated_by);

-- M:N: every place the package covers ("Vietnam + Cambodia").
create table public.package_destinations (
  package_id     uuid not null references public.packages (id) on delete cascade,
  destination_id uuid not null references public.destinations (id) on delete restrict,
  nights         smallint check (nights >= 0),
  sort_order     integer not null default 0,
  primary key (package_id, destination_id)
);
create index package_destinations_dest_idx on public.package_destinations (destination_id, package_id);

-- M:N: package <-> categories.
create table public.package_category_links (
  package_id  uuid not null references public.packages (id) on delete cascade,
  category_id uuid not null references public.package_categories (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (package_id, category_id)
);
create index package_category_links_category_idx on public.package_category_links (category_id, package_id);

create table public.package_highlights (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid not null references public.packages (id) on delete cascade,
  title       text not null,
  description text,
  icon        text,
  sort_order  integer not null default 0
);
create index package_highlights_package_idx on public.package_highlights (package_id, sort_order);

create table public.itinerary_days (
  id                       uuid primary key default gen_random_uuid(),
  package_id               uuid not null references public.packages (id) on delete cascade,
  day_number               smallint not null check (day_number between 1 and 90),
  title                    text not null,
  description              text,
  breakfast                boolean not null default false,
  lunch                    boolean not null default false,
  dinner                   boolean not null default false,
  overnight_destination_id uuid references public.destinations (id) on delete set null,
  hotel_id                 uuid references public.hotels (id) on delete set null,
  accommodation_note       text,                                -- "Overnight on cruise", "Flight home"
  media_id                 uuid references public.media_assets (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (package_id, day_number)
);
create index itinerary_days_overnight_dest_idx on public.itinerary_days (overnight_destination_id);
create index itinerary_days_hotel_id_idx       on public.itinerary_days (hotel_id);
create index itinerary_days_media_id_idx       on public.itinerary_days (media_id);

-- Activities and places covered on a day.
create table public.itinerary_day_items (
  id               uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days (id) on delete cascade,
  kind             public.itinerary_item_kind not null default 'activity',
  title            text not null,
  destination_id   uuid references public.destinations (id) on delete set null,
  is_optional      boolean not null default false,
  sort_order       integer not null default 0
);
create index itinerary_day_items_day_idx  on public.itinerary_day_items (itinerary_day_id, sort_order);
create index itinerary_day_items_dest_idx on public.itinerary_day_items (destination_id);

-- Inclusions AND exclusions (same shape; is_included tells them apart).
create table public.package_inclusions (
  id                uuid primary key default gen_random_uuid(),
  package_id        uuid not null references public.packages (id) on delete cascade,
  is_included       boolean not null,
  inclusion_type_id uuid references public.inclusion_types (id) on delete set null,
  title             text not null,
  description       text,
  sort_order        integer not null default 0
);
create index package_inclusions_package_idx on public.package_inclusions (package_id, is_included, sort_order);
-- "packages that include flights" filter
create index package_inclusions_type_idx    on public.package_inclusions (inclusion_type_id, package_id) where is_included;

-- Price plans by season and hotel tier. Rows with the same plan_name are seasons
-- of one plan and may not overlap. NULL valid_from / valid_to = open-ended.
create table public.package_prices (
  id                   uuid primary key default gen_random_uuid(),
  package_id           uuid not null references public.packages (id) on delete cascade,
  plan_name            text not null default 'Standard',
  valid_from           date,
  valid_to             date,
  price_basis          public.price_basis not null default 'per_person_twin_sharing',
  adult_twin_sharing   numeric(12,2) check (adult_twin_sharing > 0),
  adult_triple_sharing numeric(12,2) check (adult_triple_sharing > 0),
  child_with_bed       numeric(12,2) check (child_with_bed >= 0),
  child_without_bed    numeric(12,2) check (child_without_bed >= 0),
  infant               numeric(12,2) check (infant >= 0),
  single_supplement    numeric(12,2) check (single_supplement >= 0),
  currency             public.currency_code not null default 'INR',
  includes_gst         boolean not null default false,
  min_travellers       smallint check (min_travellers >= 1),
  notes                text,
  is_active            boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references public.profiles (id) on delete set null,
  updated_by           uuid references public.profiles (id) on delete set null,
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint package_prices_no_overlap exclude using gist (
    package_id with =,
    plan_name with =,
    daterange(valid_from, valid_to, '[]') with &&
  ) where (is_active)
);
create index package_prices_package_idx    on public.package_prices (package_id, valid_from, valid_to) where is_active;
create index package_prices_created_by_idx on public.package_prices (created_by);
create index package_prices_updated_by_idx on public.package_prices (updated_by);

-- Fixed departure dates (group tours now; availability/booking later).
create table public.package_departures (
  id              uuid primary key default gen_random_uuid(),
  package_id      uuid not null references public.packages (id) on delete cascade,
  price_id        uuid references public.package_prices (id) on delete set null,
  departure_date  date not null,
  return_date     date,
  seats_total     smallint check (seats_total >= 0),
  seats_available smallint check (seats_available >= 0),
  price_override  numeric(12,2) check (price_override > 0),
  status          public.departure_status not null default 'open',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (return_date is null or return_date >= departure_date),
  check (seats_available is null or seats_total is null or seats_available <= seats_total)
);
create index package_departures_package_idx on public.package_departures (package_id, departure_date);
create index package_departures_date_idx    on public.package_departures (departure_date) where status in ('open', 'filling_fast');
create index package_departures_price_idx   on public.package_departures (price_id);

-- The same hotel may appear twice (back in Hanoi at the end): no unique pair.
create table public.package_hotels (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.packages (id) on delete cascade,
  hotel_id      uuid not null references public.hotels (id) on delete restrict,
  price_id      uuid references public.package_prices (id) on delete cascade,  -- tier-specific hotel
  nights        smallint not null default 1 check (nights >= 1),
  room_type     text,
  meal_plan     text,
  is_or_similar boolean not null default true,
  sort_order    integer not null default 0
);
create index package_hotels_package_idx on public.package_hotels (package_id, sort_order);
create index package_hotels_hotel_idx   on public.package_hotels (hotel_id);
create index package_hotels_price_idx   on public.package_hotels (price_id);

create table public.package_media (
  id         uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages (id) on delete cascade,
  media_id   uuid not null references public.media_assets (id) on delete cascade,
  role       public.media_role not null default 'gallery',
  sort_order integer not null default 0,
  unique (package_id, media_id, role)
);
create index package_media_package_idx on public.package_media (package_id, role, sort_order);
create index package_media_media_idx   on public.package_media (media_id);

-- =============================================================================
-- F. Blog
-- =============================================================================

create table public.blog_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          public.slug not null,
  description   text,
  parent_id     uuid references public.blog_categories (id) on delete set null,
  hero_media_id uuid references public.media_assets (id) on delete set null,
  sort_order    integer not null default 0,
  status        public.content_status not null default 'draft',
  published_at  timestamptz,
  deleted_at    timestamptz,
  seo_meta_id   uuid unique references public.seo_meta (id) on delete set null,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,
  check (parent_id is distinct from id),
  constraint blog_categories_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index blog_categories_slug_key    on public.blog_categories (slug) where deleted_at is null;
create index blog_categories_parent_idx         on public.blog_categories (parent_id);
create index blog_categories_status_idx         on public.blog_categories (status, sort_order) where deleted_at is null;
create index blog_categories_hero_media_idx     on public.blog_categories (hero_media_id);
create index blog_categories_created_by_idx     on public.blog_categories (created_by);
create index blog_categories_updated_by_idx     on public.blog_categories (updated_by);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       public.slug not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tags_name_key on public.tags (lower(name));

create table public.blog_posts (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null check (length(title) between 3 and 200),
  slug               public.slug not null,                     -- /blog/{slug}/
  excerpt            text check (length(excerpt) <= 600),
  content            jsonb not null default '{}'::jsonb,
  featured_media_id  uuid references public.media_assets (id) on delete set null,
  author_id          uuid references public.authors (id) on delete set null,
  category_id        uuid references public.blog_categories (id) on delete restrict,
  reading_minutes    smallint check (reading_minutes > 0),
  content_updated_at timestamptz,                             -- "Updated on" shown to readers
  status             public.content_status not null default 'draft',
  published_at       timestamptz,
  deleted_at         timestamptz,
  seo_meta_id        uuid unique references public.seo_meta (id) on delete set null,
  is_sample          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null,
  search_vector      tsvector generated always as (
                       setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                       setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
                     ) stored,
  constraint blog_posts_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index blog_posts_slug_key        on public.blog_posts (slug) where deleted_at is null;
create index blog_posts_status_published_idx   on public.blog_posts (status, published_at desc, id) where deleted_at is null;
create index blog_posts_category_idx           on public.blog_posts (category_id, status, published_at desc) where deleted_at is null;
create index blog_posts_author_idx             on public.blog_posts (author_id, published_at desc);
create index blog_posts_search_idx             on public.blog_posts using gin (search_vector);
create index blog_posts_featured_media_idx     on public.blog_posts (featured_media_id);
create index blog_posts_created_by_idx         on public.blog_posts (created_by);
create index blog_posts_updated_by_idx         on public.blog_posts (updated_by);

create table public.blog_post_tags (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);
create index blog_post_tags_tag_idx on public.blog_post_tags (tag_id, post_id);

create table public.blog_post_destinations (
  post_id        uuid not null references public.blog_posts (id) on delete cascade,
  destination_id uuid not null references public.destinations (id) on delete cascade,
  primary key (post_id, destination_id)
);
create index blog_post_destinations_dest_idx on public.blog_post_destinations (destination_id, post_id);

create table public.blog_post_packages (
  post_id    uuid not null references public.blog_posts (id) on delete cascade,
  package_id uuid not null references public.packages (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (post_id, package_id)
);
create index blog_post_packages_package_idx on public.blog_post_packages (package_id, post_id);

-- =============================================================================
-- G. Visa
-- =============================================================================

-- Visa information for travelling TO a country, FOR holders of one passport.
create table public.visa_guides (
  id                        uuid primary key default gen_random_uuid(),
  destination_country_id    uuid not null references public.countries (id) on delete restrict,
  passport_country_id       uuid not null references public.countries (id) on delete restrict,
  title                     text not null,
  slug                      public.slug not null,             -- /visa/{slug}/
  summary                   text,                             -- answer-first summary
  content                   jsonb,
  application_process_intro text,
  important_notes           text,
  hero_media_id             uuid references public.media_assets (id) on delete set null,
  last_verified_at          timestamptz,                      -- "rules last checked on"
  source_url                text check (source_url ~ '^https?://'),
  status                    public.content_status not null default 'draft',
  published_at              timestamptz,
  deleted_at                timestamptz,
  seo_meta_id               uuid unique references public.seo_meta (id) on delete set null,
  is_sample                 boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references public.profiles (id) on delete set null,
  updated_by                uuid references public.profiles (id) on delete set null,
  check (destination_country_id <> passport_country_id),
  constraint visa_guides_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index visa_guides_slug_key      on public.visa_guides (slug) where deleted_at is null;
create unique index visa_guides_country_pair  on public.visa_guides (destination_country_id, passport_country_id) where deleted_at is null;
create index visa_guides_passport_status_idx  on public.visa_guides (passport_country_id, status) where deleted_at is null;
create index visa_guides_hero_media_idx       on public.visa_guides (hero_media_id);
create index visa_guides_created_by_idx       on public.visa_guides (created_by);
create index visa_guides_updated_by_idx       on public.visa_guides (updated_by);

create table public.visa_types (
  id                  uuid primary key default gen_random_uuid(),
  visa_guide_id       uuid not null references public.visa_guides (id) on delete cascade,
  name                text not null,                          -- "Tourist e-Visa"
  slug                public.slug not null,
  purpose             public.visa_purpose not null default 'tourism',
  kind                public.visa_kind,                       -- null = not verified yet
  description         text,
  eligibility         text,
  processing_days_min smallint check (processing_days_min >= 0),
  processing_days_max smallint check (processing_days_max >= 0),
  processing_note     text,
  validity_days       smallint check (validity_days > 0),
  max_stay_days       smallint check (max_stay_days > 0),
  entries             public.visa_entries,
  status              public.content_status not null default 'draft',
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles (id) on delete set null,
  updated_by          uuid references public.profiles (id) on delete set null,
  unique (visa_guide_id, slug),
  check (processing_days_max is null or processing_days_min is null or processing_days_max >= processing_days_min)
);
create index visa_types_guide_idx      on public.visa_types (visa_guide_id, status, sort_order);
create index visa_types_created_by_idx on public.visa_types (created_by);
create index visa_types_updated_by_idx on public.visa_types (updated_by);

create table public.visa_documents (
  id           uuid primary key default gen_random_uuid(),
  visa_type_id uuid not null references public.visa_types (id) on delete cascade,
  title        text not null,
  description  text,
  is_mandatory boolean not null default true,
  applies_to   text,                                         -- "Self-employed applicants"
  sort_order   integer not null default 0
);
create index visa_documents_type_idx on public.visa_documents (visa_type_id, sort_order);

create table public.visa_process_steps (
  id           uuid primary key default gen_random_uuid(),
  visa_type_id uuid not null references public.visa_types (id) on delete cascade,
  title        text not null,
  description  text,
  sort_order   integer not null default 0
);
create index visa_process_steps_type_idx on public.visa_process_steps (visa_type_id, sort_order);

create table public.visa_fees (
  id           uuid primary key default gen_random_uuid(),
  visa_type_id uuid not null references public.visa_types (id) on delete cascade,
  label        text not null,
  fee_kind     public.visa_fee_kind not null default 'government',
  amount       numeric(12,2) check (amount >= 0),             -- null = varies / not published
  currency     public.currency_code,
  notes        text,
  sort_order   integer not null default 0,
  check (amount is null or currency is not null)
);
create index visa_fees_type_idx on public.visa_fees (visa_type_id, sort_order);

-- =============================================================================
-- H. Shared content: pages, FAQs, testimonials
-- =============================================================================

-- Home, About, Contact, FAQ page, marketing landing pages.
create table public.pages (
  id           uuid primary key default gen_random_uuid(),
  slug         public.slug not null,                         -- 'home' maps to /
  title        text not null,
  template     text not null default 'default' check (template ~ '^[a-z0-9_]+$'),
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  deleted_at   timestamptz,
  seo_meta_id  uuid unique references public.seo_meta (id) on delete set null,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  constraint pages_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index pages_slug_key        on public.pages (slug) where deleted_at is null;
create index pages_created_by_idx         on public.pages (created_by);
create index pages_updated_by_idx         on public.pages (updated_by);

-- Ordered blocks. `content` is validated in the app by a Zod schema per section_type.
create table public.page_sections (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references public.pages (id) on delete cascade,
  section_type text not null check (section_type ~ '^[a-z0-9_]+$'),
  content      jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  is_visible   boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index page_sections_page_idx on public.page_sections (page_id, sort_order);

-- FAQ text is written once and linked wherever it appears (faq_links).
create table public.faqs (
  id           uuid primary key default gen_random_uuid(),
  question     text not null check (length(question) between 5 and 300),
  answer       text not null,                                -- plain text: also used in FAQPage JSON-LD
  faq_group    text,                                         -- admin filter only: "Payments", "Visa"
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  deleted_at   timestamptz,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,
  updated_by   uuid references public.profiles (id) on delete set null,
  constraint faqs_published_has_date check (status <> 'published' or published_at is not null)
);
create index faqs_group_idx       on public.faqs (faq_group) where deleted_at is null;
create index faqs_question_trgm   on public.faqs using gin (question extensions.gin_trgm_ops);
create index faqs_created_by_idx  on public.faqs (created_by);
create index faqs_updated_by_idx  on public.faqs (updated_by);

-- Exactly one owner per link row (exclusive arc): real foreign keys, reusable FAQs.
create table public.faq_links (
  id             uuid primary key default gen_random_uuid(),
  faq_id         uuid not null references public.faqs (id) on delete cascade,
  package_id     uuid references public.packages (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete cascade,
  country_id     uuid references public.countries (id) on delete cascade,
  visa_guide_id  uuid references public.visa_guides (id) on delete cascade,
  blog_post_id   uuid references public.blog_posts (id) on delete cascade,
  page_id        uuid references public.pages (id) on delete cascade,
  category_id    uuid references public.package_categories (id) on delete cascade,
  sort_order     integer not null default 0,
  constraint faq_links_exactly_one_owner check (
    num_nonnulls(package_id, destination_id, country_id, visa_guide_id, blog_post_id, page_id, category_id) = 1
  )
);
create index faq_links_faq_idx on public.faq_links (faq_id);
create unique index faq_links_package_key     on public.faq_links (package_id, faq_id)     where package_id is not null;
create unique index faq_links_destination_key on public.faq_links (destination_id, faq_id) where destination_id is not null;
create unique index faq_links_country_key     on public.faq_links (country_id, faq_id)     where country_id is not null;
create unique index faq_links_visa_guide_key  on public.faq_links (visa_guide_id, faq_id)  where visa_guide_id is not null;
create unique index faq_links_blog_post_key   on public.faq_links (blog_post_id, faq_id)   where blog_post_id is not null;
create unique index faq_links_page_key        on public.faq_links (page_id, faq_id)        where page_id is not null;
create unique index faq_links_category_key    on public.faq_links (category_id, faq_id)    where category_id is not null;

-- Curated marketing testimonials (future booking-linked reviews get their own table).
-- Customer contact details live in testimonial_private (RLS is per row, not per column).
create table public.testimonials (
  id                  uuid primary key default gen_random_uuid(),
  customer_name       text not null,
  customer_city       text,
  rating              smallint not null check (rating between 1 and 5),
  title               text,
  content             text not null,
  photo_media_id      uuid references public.media_assets (id) on delete set null,
  package_id          uuid references public.packages (id) on delete set null,
  destination_id      uuid references public.destinations (id) on delete set null,
  travelled_on        date,                                  -- first of the month travelled
  source              public.testimonial_source not null default 'other',
  source_url          text check (source_url ~ '^https?://'),
  is_verified         boolean not null default false,
  consent_recorded_at timestamptz,                           -- name/photo use consent (DPDP)
  is_featured         boolean not null default false,
  sort_order          integer not null default 0,
  status              public.content_status not null default 'draft',
  published_at        timestamptz,
  deleted_at          timestamptz,
  is_sample           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles (id) on delete set null,
  updated_by          uuid references public.profiles (id) on delete set null,
  constraint testimonials_published_has_date check (status <> 'published' or published_at is not null)
);
create index testimonials_status_idx      on public.testimonials (status, is_featured, sort_order) where deleted_at is null;
create index testimonials_package_idx     on public.testimonials (package_id, status);
create index testimonials_destination_idx on public.testimonials (destination_id, status);
create index testimonials_photo_media_idx on public.testimonials (photo_media_id);
create index testimonials_created_by_idx  on public.testimonials (created_by);
create index testimonials_updated_by_idx  on public.testimonials (updated_by);

-- =============================================================================
-- I. Leads and attribution (never public)
-- =============================================================================

create table public.marketing_channels (
  id         uuid primary key default gen_random_uuid(),
  code       public.slug not null unique,                    -- 'google-ads', 'meta-ads', 'organic-search'...
  name       text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin-editable pipeline. `kind` stays fixed so reports and conversion uploads keep working.
create table public.lead_stages (
  id         uuid primary key default gen_random_uuid(),
  code       public.slug not null unique,
  name       text not null,
  kind       public.lead_stage_kind not null,
  sort_order integer not null default 0,
  is_default boolean not null default false,                 -- stage for new leads
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or kind = 'open')
);
create unique index lead_stages_one_default on public.lead_stages (is_default) where is_default;

-- The person, deduplicated by phone. CRM / customer-account anchor later.
create table public.contacts (
  id                     uuid primary key default gen_random_uuid(),
  full_name              text not null check (length(full_name) between 1 and 200),
  phone                  public.phone_e164,                  -- null only after anonymization
  whatsapp               public.phone_e164,                  -- null = not provided
  email                  public.email_address,
  city                   text,
  marketing_consent      boolean not null default false,
  whatsapp_opt_in        boolean not null default false,
  consent_at             timestamptz,
  consent_text_version   text,
  anonymized_at          timestamptz,                        -- DPDP erasure: PII cleared, row kept
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (phone is not null or anonymized_at is not null)
);
create unique index contacts_phone_key  on public.contacts (phone) where phone is not null;
create index contacts_email_idx         on public.contacts (lower(email::text)) where email is not null;
create index contacts_name_trgm_idx     on public.contacts using gin (full_name extensions.gin_trgm_ops);
create index contacts_phone_trgm_idx    on public.contacts using gin ((phone::text) extensions.gin_trgm_ops);

-- One row per enquiry. Name and phone live on the contact (NOT NULL there).
create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_number       bigint generated always as identity unique, -- shown as YJ-000123
  contact_id        uuid not null references public.contacts (id) on delete restrict,
  enquiry_type      public.enquiry_type not null,
  stage_id          uuid not null references public.lead_stages (id) on delete restrict,
  assigned_to       uuid references public.profiles (id) on delete set null,
  priority          public.lead_priority not null default 'normal',
  next_follow_up_at timestamptz,
  lost_reason       text,
  -- trip details: all nullable (null = form didn't ask / customer didn't say)
  destination_id    uuid references public.destinations (id) on delete set null,
  destination_text  text check (length(destination_text) <= 200),  -- exactly what they typed
  package_id        uuid references public.packages (id) on delete set null,
  departure_id      uuid references public.package_departures (id) on delete set null,
  departure_city    text check (length(departure_city) <= 100),
  travel_date       date,
  date_flexibility  public.date_flexibility,
  duration_nights   smallint check (duration_nights between 0 and 90),
  adults            smallint check (adults between 1 and 99),
  children          smallint check (children between 0 and 99),
  children_ages     smallint[] check (children_ages <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]::smallint[]),
  infants           smallint check (infants between 0 and 20),
  budget_min        numeric(12,2) check (budget_min >= 0),
  budget_max        numeric(12,2) check (budget_max >= 0),
  budget_currency   public.currency_code,
  message           text check (length(message) <= 5000),
  form_path         public.url_path not null,               -- page the form was submitted from
  anonymized_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles (id) on delete set null,  -- null = website form
  updated_by        uuid references public.profiles (id) on delete set null,
  check (budget_max is null or budget_min is null or budget_max >= budget_min),
  check ((budget_min is null and budget_max is null) or budget_currency is not null)
);
create index leads_stage_created_idx    on public.leads (stage_id, created_at desc);
create index leads_assigned_follow_idx  on public.leads (assigned_to, next_follow_up_at);
create index leads_created_idx          on public.leads (created_at desc);
create index leads_contact_idx          on public.leads (contact_id, created_at desc);
create index leads_package_idx          on public.leads (package_id);
create index leads_destination_idx      on public.leads (destination_id);
create index leads_departure_idx        on public.leads (departure_id);
create index leads_enquiry_type_idx     on public.leads (enquiry_type, created_at desc);
create index leads_created_by_idx       on public.leads (created_by);
create index leads_updated_by_idx       on public.leads (updated_by);

-- First-touch and last-touch attribution (more rows = multi-touch later).
create table public.lead_touchpoints (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads (id) on delete cascade,
  touch        public.touch_type not null,
  channel_id   uuid references public.marketing_channels (id) on delete set null,
  utm_source   text check (length(utm_source) <= 255),
  utm_medium   text check (length(utm_medium) <= 255),
  utm_campaign text check (length(utm_campaign) <= 255),
  utm_term     text check (length(utm_term) <= 255),
  utm_content  text check (length(utm_content) <= 255),
  gclid        text check (length(gclid) <= 255),           -- Google Ads
  gbraid       text check (length(gbraid) <= 255),
  wbraid       text check (length(wbraid) <= 255),
  fbclid       text check (length(fbclid) <= 500),          -- Meta
  fbc          text check (length(fbc) <= 500),
  fbp          text check (length(fbp) <= 255),
  landing_path text check (length(landing_path) <= 2048),
  referrer     text check (length(referrer) <= 2048),
  device_type  text check (device_type in ('mobile', 'tablet', 'desktop', 'other')),
  occurred_at  timestamptz not null default now(),
  unique (lead_id, touch)
);
create index lead_touchpoints_channel_idx  on public.lead_touchpoints (channel_id, occurred_at desc);
create index lead_touchpoints_campaign_idx on public.lead_touchpoints (utm_campaign, occurred_at desc) where utm_campaign is not null;

-- Timeline: notes, calls, WhatsApp, stage changes (step 3 trigger), assignments.
create table public.lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  type       public.lead_activity_type not null,
  body       text,
  metadata   jsonb not null default '{}'::jsonb,
  actor_id   uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_activities_lead_idx  on public.lead_activities (lead_id, created_at desc);
create index lead_activities_actor_idx on public.lead_activities (actor_id);

-- Private side of a testimonial: verification contact details. Admin-only.
create table public.testimonial_private (
  testimonial_id uuid primary key references public.testimonials (id) on delete cascade,
  phone          public.phone_e164,
  email          public.email_address,
  lead_id        uuid references public.leads (id) on delete set null,
  notes          text,
  updated_at     timestamptz not null default now()
);
create index testimonial_private_lead_idx on public.testimonial_private (lead_id);

-- =============================================================================
-- J. Site configuration
-- =============================================================================

-- Exactly one row. Publicly readable: NEVER store secrets or API keys here.
create table public.site_settings (
  id                         boolean primary key default true check (id),
  company_name               text not null,
  legal_name                 text,
  logo_media_id              uuid references public.media_assets (id) on delete set null,
  favicon_media_id           uuid references public.media_assets (id) on delete set null,
  phone                      public.phone_e164,
  whatsapp                   public.phone_e164,
  email                      public.email_address,
  address                    jsonb check (address is null or jsonb_typeof(address) = 'object'),
  google_maps_url            text check (google_maps_url ~ '^https://'),
  business_hours             jsonb,
  gst_number                 text check (gst_number ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  default_seo_title_template text not null default '%s | Yojo Holidays' check (position('%s' in default_seo_title_template) > 0),
  default_meta_description   text check (length(default_meta_description) <= 320),
  default_og_media_id        uuid references public.media_assets (id) on delete set null,
  updated_at                 timestamptz not null default now(),
  updated_by                 uuid references public.profiles (id) on delete set null
);
create index site_settings_logo_idx       on public.site_settings (logo_media_id);
create index site_settings_favicon_idx    on public.site_settings (favicon_media_id);
create index site_settings_og_idx         on public.site_settings (default_og_media_id);
create index site_settings_updated_by_idx on public.site_settings (updated_by);

create table public.social_links (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null unique check (platform ~ '^[a-z0-9_]+$'),  -- instagram, facebook, youtube...
  url        text not null check (url ~ '^https://'),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   public.url_path not null unique,
  to_path     text not null check (to_path ~ '^(/|https?://)'),
  status_code smallint not null default 301 check (status_code in (301, 302, 307, 308)),
  is_active   boolean not null default true,
  hit_count   bigint not null default 0,
  last_hit_at timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  check (from_path <> to_path)
);
create index redirects_active_idx     on public.redirects (from_path) where is_active;
create index redirects_to_path_idx    on public.redirects (to_path);       -- chain collapsing
create index redirects_created_by_idx on public.redirects (created_by);
create index redirects_updated_by_idx on public.redirects (updated_by);

-- =============================================================================
-- K. System
-- =============================================================================

-- Append-only. actor_id has no FK so history survives staff removal.
create table public.audit_log (
  id             bigint generated always as identity primary key,
  table_name     text not null,
  record_id      uuid,
  action         public.audit_action not null,
  actor_id       uuid,
  changed_fields jsonb,
  occurred_at    timestamptz not null default now()
);
create index audit_log_record_idx   on public.audit_log (table_name, record_id, occurred_at desc);
create index audit_log_actor_idx    on public.audit_log (actor_id, occurred_at desc);
create index audit_log_occurred_brin on public.audit_log using brin (occurred_at);

-- Full snapshots for "restore previous version" (and future draft-of-published).
create table public.content_revisions (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type ~ '^[a-z_]+$'),
  entity_id       uuid not null,
  revision_number integer not null check (revision_number >= 1),
  snapshot        jsonb not null,
  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  unique (entity_type, entity_id, revision_number)
);
create index content_revisions_created_by_idx on public.content_revisions (created_by);

-- =============================================================================
-- Plumbing: updated_at on every table that has the column
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and tb.table_type = 'BASE TABLE'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t.table_name
    );
  end loop;
end;
$$;

-- =============================================================================
-- Deny-all by default: RLS on for every table. Policies arrive in step 2.
-- Until then only the server (service_role / table owner) can read or write.
-- =============================================================================

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;
