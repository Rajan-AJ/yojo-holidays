-- =============================================================================
-- Yojo Holidays - step 2 of 4: permissions + Row Level Security
--
-- Model
--   * anon           = website visitors. Read published content only. Never writes.
--   * authenticated  = anyone signed in. Today only staff; LATER ALSO CUSTOMERS.
--                      Therefore no policy ever says "to authenticated using (true)":
--                      staff access always goes through has_permission().
--   * service_role / table owner = trusted server code (Next.js server, Prisma).
--                      Bypasses RLS; that code checks permissions itself.
--
--   has_permission(resource, action) reads user_roles + role_permissions for
--   auth.uid(). super_admin implicitly has every permission. Policies call it
--   as (select public.has_permission(...)) so it runs once per query, not per row.
--
-- Actions: read, write, publish, delete (soft delete = set deleted_at), purge (hard delete)
--          leads: read_all, read_assigned, update_all, update_assigned, create, export
--          testimonials: read_private
-- publish/delete are column-level rules (old vs new value), which RLS cannot
-- express; they are enforced by the guard trigger in step 3.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

-- Sample (development) content is visible only where the database says so:
--   alter database postgres set app.show_sample_content = 'true';   -- local/staging only
create or replace function public.show_sample_content()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.show_sample_content', true), '') = 'true'
$$;

-- "Publicly visible" in one place. Plain SQL with no SET clause so the planner
-- can inline it into policies and still use indexes.
create or replace function public.is_live(
  p_status       public.content_status,
  p_published_at timestamptz,
  p_deleted_at   timestamptz,
  p_is_sample    boolean default false
)
returns boolean
language sql
stable
as $$
  select p_status = 'published'::public.content_status
     and p_published_at <= now()
     and p_deleted_at is null
     and (not coalesce(p_is_sample, false) or public.show_sample_content())
$$;

create or replace function public.has_permission(p_resource text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    left join public.role_permissions rp
      on rp.role = ur.role and rp.resource = p_resource and rp.action = p_action
    where ur.user_id = auth.uid()
      and (ur.role = 'super_admin' or rp.role is not null)
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.user_id = auth.uid()
  )
$$;

revoke all on function public.has_permission(text, text) from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.has_permission(text, text) to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_live(public.content_status, timestamptz, timestamptz, boolean) to anon, authenticated, service_role;
grant execute on function public.show_sample_content() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Policy generators (private schema: not exposed through the Supabase API)
-- -----------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;

-- Staff policies for a table owned by one permission resource.
create or replace function private.staff_policies(p_table text, p_resource text)
returns void
language plpgsql
as $$
begin
  execute format(
    'create policy staff_select on public.%I for select to authenticated
       using ((select public.has_permission(%L, ''read'')))', p_table, p_resource);
  execute format(
    'create policy staff_insert on public.%I for insert to authenticated
       with check ((select public.has_permission(%L, ''write'')))', p_table, p_resource);
  execute format(
    'create policy staff_update on public.%I for update to authenticated
       using ((select public.has_permission(%L, ''write'')))
       with check ((select public.has_permission(%L, ''write'')))', p_table, p_resource, p_resource);
  execute format(
    'create policy staff_delete on public.%I for delete to authenticated
       using ((select public.has_permission(%L, ''purge'')))', p_table, p_resource);
end;
$$;

-- Child rows (itinerary days, prices, gallery...): visitors see them when they can
-- see the parent. The EXISTS sub-select is itself filtered by the parent's RLS,
-- so "published parent only" is decided in exactly one place. Staff edit children
-- with the parent's write permission (removing a day is an edit, not a purge).
create or replace function private.child_policies(
  p_table text, p_parent text, p_fk text, p_resource text, p_extra text default 'true'
)
returns void
language plpgsql
as $$
begin
  execute format(
    'create policy public_select on public.%I for select to anon, authenticated
       using ((%s) and exists (select 1 from public.%I parent where parent.id = %I.%I))',
    p_table, p_extra, p_parent, p_table, p_fk);
  execute format(
    'create policy staff_select on public.%I for select to authenticated
       using ((select public.has_permission(%L, ''read'')))', p_table, p_resource);
  execute format(
    'create policy staff_insert on public.%I for insert to authenticated
       with check ((select public.has_permission(%L, ''write'')))', p_table, p_resource);
  execute format(
    'create policy staff_update on public.%I for update to authenticated
       using ((select public.has_permission(%L, ''write'')))
       with check ((select public.has_permission(%L, ''write'')))', p_table, p_resource, p_resource);
  execute format(
    'create policy staff_delete on public.%I for delete to authenticated
       using ((select public.has_permission(%L, ''write'')))', p_table, p_resource);
end;
$$;

-- -----------------------------------------------------------------------------
-- Publishable content: public sees live rows; staff by permission
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('packages',           'packages'),
      ('destinations',       'destinations'),
      ('package_categories', 'categories'),
      ('blog_posts',         'blog'),
      ('blog_categories',    'blog'),
      ('authors',            'blog'),
      ('visa_guides',        'visa'),
      ('pages',              'pages'),
      ('faqs',               'faqs'),
      ('testimonials',       'testimonials')
    ) as t(tbl, resource)
  loop
    execute format(
      'create policy public_select on public.%I for select to anon, authenticated
         using (public.is_live(status, published_at, deleted_at, is_sample))', r.tbl);
    perform private.staff_policies(r.tbl, r.resource);
  end loop;
end;
$$;

-- Policies (terms/cancellation) have no is_sample flag.
create policy public_select on public.policies for select to anon, authenticated
  using (public.is_live(status, published_at, deleted_at));
select private.staff_policies('policies', 'policies');

-- Countries are reference data used across the site (names, currency, flags),
-- so every non-deleted row is readable; `status` only controls the country page.
create policy public_select on public.countries for select to anon, authenticated
  using (deleted_at is null);
select private.staff_policies('countries', 'geography');

create policy public_select on public.regions for select to anon, authenticated using (true);
select private.staff_policies('regions', 'geography');

create policy public_select on public.hotels for select to anon, authenticated
  using (deleted_at is null and (not is_sample or public.show_sample_content()));
select private.staff_policies('hotels', 'hotels');

create policy public_select on public.media_assets for select to anon, authenticated
  using (deleted_at is null);
select private.staff_policies('media_assets', 'media');

create policy public_select on public.seo_meta for select to anon, authenticated using (true);
select private.staff_policies('seo_meta', 'seo');

create policy public_select on public.tags for select to anon, authenticated using (true);
select private.staff_policies('tags', 'blog');

create policy public_select on public.inclusion_types for select to anon, authenticated using (is_active);
select private.staff_policies('inclusion_types', 'categories');

create policy public_select on public.social_links for select to anon, authenticated using (is_active);
select private.staff_policies('social_links', 'settings');

-- site_settings: one row, public read, update only (no insert/delete through the API).
create policy public_select on public.site_settings for select to anon, authenticated using (true);
create policy staff_update on public.site_settings for update to authenticated
  using ((select public.has_permission('settings', 'write')))
  with check ((select public.has_permission('settings', 'write')));

-- -----------------------------------------------------------------------------
-- Child tables (visible when the parent is visible)
-- -----------------------------------------------------------------------------

select private.child_policies('destination_travel_tips', 'destinations', 'destination_id', 'destinations');
select private.child_policies('destination_media',       'destinations', 'destination_id', 'destinations');

select private.child_policies('package_destinations',    'packages', 'package_id', 'packages');
select private.child_policies('package_category_links',  'packages', 'package_id', 'packages');
select private.child_policies('package_highlights',      'packages', 'package_id', 'packages');
select private.child_policies('itinerary_days',          'packages', 'package_id', 'packages');
select private.child_policies('itinerary_day_items',     'itinerary_days', 'itinerary_day_id', 'packages');
select private.child_policies('package_inclusions',      'packages', 'package_id', 'packages');
select private.child_policies('package_prices',          'packages', 'package_id', 'packages', 'is_active');
select private.child_policies('package_departures',      'packages', 'package_id', 'packages', $x$status <> 'cancelled'$x$);
select private.child_policies('package_hotels',          'packages', 'package_id', 'packages');
select private.child_policies('package_media',           'packages', 'package_id', 'packages');

select private.child_policies('blog_post_tags',          'blog_posts', 'post_id', 'blog');
select private.child_policies('blog_post_destinations',  'blog_posts', 'post_id', 'blog');
select private.child_policies('blog_post_packages',      'blog_posts', 'post_id', 'blog');

select private.child_policies('visa_types',              'visa_guides', 'visa_guide_id', 'visa', $x$status = 'published'$x$);
select private.child_policies('visa_documents',          'visa_types', 'visa_type_id', 'visa');
select private.child_policies('visa_process_steps',      'visa_types', 'visa_type_id', 'visa');
select private.child_policies('visa_fees',               'visa_types', 'visa_type_id', 'visa');

select private.child_policies('page_sections',           'pages', 'page_id', 'pages', 'is_visible');
select private.child_policies('faq_links',               'faqs', 'faq_id', 'faqs');

-- -----------------------------------------------------------------------------
-- Staff-only configuration
-- -----------------------------------------------------------------------------

select private.staff_policies('redirects',          'redirects');   -- read by the server only
select private.staff_policies('lead_stages',        'lead_config');
select private.staff_policies('marketing_channels', 'lead_config');

-- -----------------------------------------------------------------------------
-- Leads: never public. Sales see their own + unassigned leads.
-- No DELETE policy at all: leads are anonymized (DPDP), never deleted via the API.
-- -----------------------------------------------------------------------------

create policy staff_select on public.leads for select to authenticated
  using (
    (select public.has_permission('leads', 'read_all'))
    or ((select public.has_permission('leads', 'read_assigned'))
        and (assigned_to = (select auth.uid()) or assigned_to is null))
  );
create policy staff_insert on public.leads for insert to authenticated
  with check ((select public.has_permission('leads', 'create')));
create policy staff_update on public.leads for update to authenticated
  using (
    (select public.has_permission('leads', 'update_all'))
    or ((select public.has_permission('leads', 'update_assigned'))
        and (assigned_to = (select auth.uid()) or assigned_to is null))
  )
  with check (
    (select public.has_permission('leads', 'update_all'))
    or ((select public.has_permission('leads', 'update_assigned'))
        and (assigned_to = (select auth.uid()) or assigned_to is null))
  );

-- A contact is visible when one of its leads is (the sub-select obeys leads RLS).
create policy staff_select on public.contacts for select to authenticated
  using (
    (select public.has_permission('leads', 'read_all'))
    or exists (select 1 from public.leads l where l.contact_id = contacts.id)
  );
create policy staff_insert on public.contacts for insert to authenticated
  with check ((select public.has_permission('leads', 'create')));
create policy staff_update on public.contacts for update to authenticated
  using (
    (select public.has_permission('leads', 'update_all'))
    or ((select public.has_permission('leads', 'update_assigned'))
        and exists (select 1 from public.leads l where l.contact_id = contacts.id))
  )
  with check (true);

-- Attribution is written by the server only; staff read it with the lead.
create policy staff_select on public.lead_touchpoints for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_touchpoints.lead_id));

-- Timeline: append-only for staff who can see the lead.
create policy staff_select on public.lead_activities for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_activities.lead_id));
create policy staff_insert on public.lead_activities for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and type in ('note', 'call', 'whatsapp', 'email', 'meeting')
    and ((select public.has_permission('leads', 'update_all'))
         or (select public.has_permission('leads', 'update_assigned')))
    and exists (select 1 from public.leads l where l.id = lead_activities.lead_id)
  );

create policy staff_all on public.testimonial_private for all to authenticated
  using ((select public.has_permission('testimonials', 'read_private')))
  with check ((select public.has_permission('testimonials', 'read_private')));

-- -----------------------------------------------------------------------------
-- Identity and system tables
-- -----------------------------------------------------------------------------

create policy own_or_admin_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users', 'read')));
create policy own_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users', 'manage')))
  with check (id = (select auth.uid()) or (select public.has_permission('users', 'manage')));
-- Through the API a user may change only these columns on their own profile;
-- is_active and everything else is changed by trusted server code.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_media_id, last_seen_at) on public.profiles to authenticated;

create policy own_or_admin_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users', 'read')));
create policy manage_insert on public.user_roles for insert to authenticated
  with check ((select public.has_permission('users', 'manage')));
create policy manage_delete on public.user_roles for delete to authenticated
  using ((select public.has_permission('users', 'manage')));

create policy staff_select on public.role_permissions for select to authenticated
  using ((select public.is_staff()));
create policy manage_all on public.role_permissions for all to authenticated
  using ((select public.has_permission('users', 'manage')))
  with check ((select public.has_permission('users', 'manage')));

-- Written only by the audit trigger (security definer). Read by admins.
create policy staff_select on public.audit_log for select to authenticated
  using ((select public.has_permission('audit', 'read')));

create policy staff_select on public.content_revisions for select to authenticated
  using ((select public.is_staff()));
create policy staff_insert on public.content_revisions for insert to authenticated
  with check ((select public.is_staff()) and created_by = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Grants: defence in depth on top of RLS. Visitors (anon) can never write,
-- and never even see the private tables.
-- -----------------------------------------------------------------------------

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke all on
  public.leads, public.contacts, public.lead_touchpoints, public.lead_activities,
  public.lead_stages, public.marketing_channels, public.testimonial_private,
  public.profiles, public.user_roles, public.role_permissions,
  public.audit_log, public.content_revisions, public.redirects
from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke update, delete on public.audit_log from authenticated;
revoke usage on all sequences in schema public from anon;

alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon;

-- -----------------------------------------------------------------------------
-- Role matrix (editable later; super_admin is implicit and needs no rows)
-- -----------------------------------------------------------------------------

insert into public.role_permissions (role, resource, action)
select r.role::public.app_role, r.resource, a.action
from (values
  -- role        resource       actions
  ('admin',     'packages',     'read,write,publish,delete'),
  ('admin',     'destinations', 'read,write,publish,delete'),
  ('admin',     'categories',   'read,write,publish,delete'),
  ('admin',     'geography',    'read,write,publish,delete'),
  ('admin',     'policies',     'read,write,publish,delete'),
  ('admin',     'hotels',       'read,write,delete'),
  ('admin',     'blog',         'read,write,publish,delete'),
  ('admin',     'visa',         'read,write,publish,delete'),
  ('admin',     'faqs',         'read,write,publish,delete'),
  ('admin',     'testimonials', 'read,write,publish,delete,read_private'),
  ('admin',     'pages',        'read,write,publish,delete'),
  ('admin',     'media',        'read,write,delete'),
  ('admin',     'seo',          'read,write'),
  ('admin',     'redirects',    'read,write,purge'),
  ('admin',     'settings',     'read,write'),
  ('admin',     'lead_config',  'read,write'),
  ('admin',     'leads',        'read_all,update_all,create,export'),
  ('admin',     'users',        'read'),
  ('admin',     'audit',        'read'),

  ('editor',    'packages',     'read,write,publish,delete'),
  ('editor',    'destinations', 'read,write,publish,delete'),
  ('editor',    'categories',   'read,write,publish'),
  ('editor',    'geography',    'read,write'),
  ('editor',    'policies',     'read,write'),
  ('editor',    'hotels',       'read,write'),
  ('editor',    'blog',         'read,write,publish,delete'),
  ('editor',    'visa',         'read,write,publish,delete'),
  ('editor',    'faqs',         'read,write,publish,delete'),
  ('editor',    'testimonials', 'read,write,publish'),
  ('editor',    'pages',        'read,write'),
  ('editor',    'media',        'read,write,delete'),
  ('editor',    'seo',          'read,write'),
  ('editor',    'redirects',    'read,write'),

  ('marketing', 'packages',     'read'),
  ('marketing', 'destinations', 'read'),
  ('marketing', 'categories',   'read'),
  ('marketing', 'geography',    'read'),
  ('marketing', 'policies',     'read'),
  ('marketing', 'hotels',       'read'),
  ('marketing', 'visa',         'read'),
  ('marketing', 'blog',         'read,write,publish,delete'),
  ('marketing', 'faqs',         'read,write,publish'),
  ('marketing', 'testimonials', 'read,write,publish,read_private'),
  ('marketing', 'pages',        'read,write,publish'),
  ('marketing', 'media',        'read,write'),
  ('marketing', 'seo',          'read,write'),
  ('marketing', 'redirects',    'read,write'),
  ('marketing', 'lead_config',  'read'),
  ('marketing', 'leads',        'read_all,export'),

  ('sales',     'packages',     'read'),
  ('sales',     'destinations', 'read'),
  ('sales',     'categories',   'read'),
  ('sales',     'geography',    'read'),
  ('sales',     'policies',     'read'),
  ('sales',     'hotels',       'read'),
  ('sales',     'visa',         'read'),
  ('sales',     'faqs',         'read'),
  ('sales',     'media',        'read'),
  ('sales',     'lead_config',  'read'),
  ('sales',     'leads',        'read_assigned,update_assigned,create')
) as r(role, resource, actions)
cross join lateral unnest(string_to_array(r.actions, ',')) as a(action)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Supabase Storage
--   media    public bucket: website images (served by URL, listing needs staff)
--   private  private bucket: future passport scans / invoices; signed URLs only
-- SVG is not allowed: it can carry scripts.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media',   'media',   true,  10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('private', 'private', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy media_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.has_permission('media', 'read')));
create policy media_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.has_permission('media', 'write')));
create policy media_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.has_permission('media', 'write')))
  with check (bucket_id = 'media' and (select public.has_permission('media', 'write')));
create policy media_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.has_permission('media', 'delete')));

create policy private_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'private' and (select public.has_permission('private_files', 'read')));
create policy private_staff_write on storage.objects for insert to authenticated
  with check (bucket_id = 'private' and (select public.has_permission('private_files', 'write')));
