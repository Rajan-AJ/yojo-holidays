-- =============================================================================
-- Yojo Holidays - step 3 of 4: business triggers
--
--   1. Audit columns       created_by/updated_by from auth.uid(); created_* immutable
--   2. Publish guard       publish/unpublish needs "publish", soft delete needs "delete";
--                          published_at defaults to now() on first publish
--   3. Derived scope       destination.scope from its country; package.scope from
--                          its primary destination (India = domestic)
--   4. Primary destination always listed in package_destinations
--   5. starting_price      cheapest current adult price (twin sharing), kept in sync
--   6. Slug redirects      changing a published slug creates a 301 and collapses chains
--   7. Leads               default stage; stage/assignment changes go to the timeline
--   8. Last super admin    cannot be removed
--   9. Audit log           insert/update/delete on important tables
--
-- Trusted server code (no auth.uid()) passes through the guards: it checks
-- permissions itself and sets created_by/updated_by explicitly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- URL paths. MUST stay in sync with src/lib/routes.ts.
-- -----------------------------------------------------------------------------
create or replace function public.content_path(p_entity text, p_slug text)
returns text
language sql
immutable
as $$
  select case p_entity
    when 'packages'           then '/packages/' || p_slug || '/'
    when 'destinations'       then '/destinations/' || p_slug || '/'
    when 'package_categories' then '/tours/' || p_slug || '/'
    when 'blog_posts'         then '/blog/' || p_slug || '/'
    when 'blog_categories'    then '/blog/category/' || p_slug || '/'
    when 'visa_guides'        then '/visa/' || p_slug || '/'
    when 'authors'            then '/authors/' || p_slug || '/'
    when 'pages'              then case when p_slug = 'home' then '/' else '/' || p_slug || '/' end
  end
$$;

-- -----------------------------------------------------------------------------
-- 1. Audit columns
-- -----------------------------------------------------------------------------
create or replace function private.set_audit_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if uid is not null then
      new.created_by := uid;
      new.updated_by := uid;
    else
      new.updated_by := coalesce(new.updated_by, new.created_by);
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if uid is not null then
      new.updated_by := uid;
    end if;
  end if;
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
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'created_by'
      and exists (select 1 from information_schema.columns u
                  where u.table_schema = 'public' and u.table_name = c.table_name and u.column_name = 'updated_by')
  loop
    execute format(
      'create trigger set_audit_columns before insert or update on public.%I
         for each row execute function private.set_audit_columns()', t.table_name);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Publish guard (tg_argv[0] = permission resource)
-- -----------------------------------------------------------------------------
create or replace function private.guard_publishing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  res text := tg_argv[0];
  is_api_user boolean := auth.uid() is not null;
begin
  -- first publish without a date: publish now
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  if not is_api_user then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'published' and not public.has_permission(res, 'publish') then
      raise exception 'permission denied: % publish', res using errcode = '42501';
    end if;
    if new.deleted_at is not null then
      raise exception 'cannot create a deleted row' using errcode = '22023';
    end if;
    return new;
  end if;

  if (new.status is distinct from old.status
        and (new.status = 'published' or old.status = 'published'))
     or (new.status = 'published' and new.published_at is distinct from old.published_at)
  then
    if not public.has_permission(res, 'publish') then
      raise exception 'permission denied: % publish', res using errcode = '42501';
    end if;
  end if;

  if new.deleted_at is distinct from old.deleted_at and not public.has_permission(res, 'delete') then
    raise exception 'permission denied: % delete', res using errcode = '42501';
  end if;

  return new;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('packages', 'packages'), ('destinations', 'destinations'), ('countries', 'geography'),
      ('package_categories', 'categories'), ('policies', 'policies'),
      ('blog_posts', 'blog'), ('blog_categories', 'blog'), ('authors', 'blog'),
      ('visa_guides', 'visa'), ('pages', 'pages'), ('faqs', 'faqs'), ('testimonials', 'testimonials')
    ) as t(tbl, resource)
  loop
    execute format(
      'create trigger guard_publishing before insert or update on public.%I
         for each row execute function private.guard_publishing(%L)', r.tbl, r.resource);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Derived scope
-- -----------------------------------------------------------------------------
create or replace function private.set_destination_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select case when c.iso2 = 'IN' then 'domestic' else 'international' end::public.tour_scope
    into new.scope
  from public.countries c
  where c.id = new.country_id;
  return new;
end;
$$;

create trigger set_destination_scope
  before insert or update of country_id on public.destinations
  for each row execute function private.set_destination_scope();

create or replace function private.set_package_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select d.scope into new.scope
  from public.destinations d
  where d.id = new.primary_destination_id;
  return new;
end;
$$;

create trigger set_package_scope
  before insert or update of primary_destination_id on public.packages
  for each row execute function private.set_package_scope();

-- A destination moving country (rare) re-derives its packages' scope.
create or replace function private.cascade_destination_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scope is distinct from old.scope then
    update public.packages set scope = new.scope where primary_destination_id = new.id;
  end if;
  return null;
end;
$$;

create trigger cascade_destination_scope
  after update of scope on public.destinations
  for each row execute function private.cascade_destination_scope();

-- -----------------------------------------------------------------------------
-- 4. The primary destination is always one of the package's destinations
-- -----------------------------------------------------------------------------
create or replace function private.ensure_primary_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.package_destinations (package_id, destination_id, sort_order)
  values (new.id, new.primary_destination_id, 0)
  on conflict do nothing;
  return null;
end;
$$;

create trigger ensure_primary_destination
  after insert or update of primary_destination_id on public.packages
  for each row execute function private.ensure_primary_destination();

-- -----------------------------------------------------------------------------
-- 5. starting_price = cheapest active, not-yet-expired adult twin-sharing price
--    in the package's currency. Run refresh_all_starting_prices() nightly
--    (pg_cron) so expired seasons drop out.
-- -----------------------------------------------------------------------------
create or replace function public.refresh_package_starting_price(p_package_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.packages p
  set starting_price = (
    select min(pp.adult_twin_sharing)
    from public.package_prices pp
    where pp.package_id = p.id
      and pp.is_active
      and pp.currency = p.currency
      and (pp.valid_to is null or pp.valid_to >= current_date)
  )
  where p.id = p_package_id
    and p.starting_price is distinct from (
      select min(pp.adult_twin_sharing)
      from public.package_prices pp
      where pp.package_id = p.id
        and pp.is_active
        and pp.currency = p.currency
        and (pp.valid_to is null or pp.valid_to >= current_date)
    );
$$;

create or replace function public.refresh_all_starting_prices()
returns void
language sql
security definer
set search_path = ''
as $$
  select public.refresh_package_starting_price(p.id) from public.packages p where p.deleted_at is null;
$$;

revoke all on function public.refresh_package_starting_price(uuid) from public, anon, authenticated;
revoke all on function public.refresh_all_starting_prices() from public, anon, authenticated;

create or replace function private.on_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_package_starting_price(old.package_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.package_id is distinct from old.package_id) then
    perform public.refresh_package_starting_price(new.package_id);
  end if;
  return null;
end;
$$;

create trigger on_price_change
  after insert or update or delete on public.package_prices
  for each row execute function private.on_price_change();

-- Changing the package currency re-derives the price.
create or replace function private.on_package_currency_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_package_starting_price(new.id);
  return null;
end;
$$;

create trigger on_package_currency_change
  after update of currency on public.packages
  for each row execute function private.on_package_currency_change();

-- -----------------------------------------------------------------------------
-- 6. Slug change on content that has ever been public -> automatic 301
-- -----------------------------------------------------------------------------
create or replace function private.redirect_on_slug_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_path text := public.content_path(tg_table_name, old.slug);
  new_path text := public.content_path(tg_table_name, new.slug);
begin
  if old.slug = new.slug or old.published_at is null or old_path is null then
    return null;
  end if;

  -- the new URL is live again: drop any redirect away from it
  delete from public.redirects where from_path = new_path;
  -- collapse chains: anything pointing at the old URL now points at the new one
  update public.redirects set to_path = new_path where to_path = old_path;
  insert into public.redirects (from_path, to_path, status_code, note)
  values (old_path, new_path, 301, 'Automatic: slug changed')
  on conflict (from_path) do update
    set to_path = excluded.to_path, status_code = 301, is_active = true, note = excluded.note;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['packages', 'destinations', 'package_categories', 'blog_posts',
                           'blog_categories', 'visa_guides', 'authors', 'pages']
  loop
    execute format(
      'create trigger redirect_on_slug_change after update of slug on public.%I
         for each row execute function private.redirect_on_slug_change()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Leads
-- -----------------------------------------------------------------------------
create or replace function private.lead_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stage_id is null then
    select id into new.stage_id from public.lead_stages where is_default limit 1;
  end if;
  return new;
end;
$$;

create trigger lead_defaults
  before insert on public.leads
  for each row execute function private.lead_defaults();

create or replace function private.lead_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := coalesce(auth.uid(), new.updated_by);
begin
  if new.stage_id is distinct from old.stage_id then
    insert into public.lead_activities (lead_id, type, actor_id, metadata)
    values (new.id, 'stage_change', actor,
            jsonb_build_object('from', old.stage_id, 'to', new.stage_id));
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.lead_activities (lead_id, type, actor_id, metadata)
    values (new.id, 'assignment', actor,
            jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
  end if;
  return null;
end;
$$;

create trigger lead_timeline
  after update of stage_id, assigned_to on public.leads
  for each row execute function private.lead_timeline();

-- -----------------------------------------------------------------------------
-- 8. Never remove the last active super admin
-- -----------------------------------------------------------------------------
create or replace function private.assert_other_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.role = 'super_admin' and ur.user_id <> p_user_id
  ) then
    raise exception 'cannot remove the last active super admin' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.protect_super_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'super_admin' then
    perform private.assert_other_super_admin(old.user_id);
  end if;
  return old;
end;
$$;

create trigger protect_super_admin_role
  before delete on public.user_roles
  for each row execute function private.protect_super_admin_role();

create or replace function private.protect_super_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_active and not new.is_active
     and exists (select 1 from public.user_roles where user_id = old.id and role = 'super_admin')
  then
    perform private.assert_other_super_admin(old.id);
  end if;
  return new;
end;
$$;

create trigger protect_super_admin_profile
  before update of is_active on public.profiles
  for each row execute function private.protect_super_admin_profile();

-- -----------------------------------------------------------------------------
-- 9. Audit log. tg_argv[0] = 'names_only' records which columns changed but
--    not their values (personal data: leads, contacts), so a DPDP erasure
--    does not have to rewrite history.
-- -----------------------------------------------------------------------------
create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  names_only boolean := coalesce(tg_argv[0], '') = 'names_only';
  old_j jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_j jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  changed jsonb;
  rec_id uuid;
begin
  -- site_settings' key is a boolean, not a uuid
  if (coalesce(new_j, old_j) ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    rec_id := (coalesce(new_j, old_j) ->> 'id')::uuid;
  end if;

  if tg_op = 'UPDATE' then
    select case when names_only then jsonb_agg(k) else jsonb_object_agg(k, new_j -> k) end
      into changed
    from jsonb_object_keys(new_j) as k
    where k not in ('updated_at', 'updated_by', 'search_vector')
      and new_j -> k is distinct from old_j -> k;
    if changed is null then
      return null;   -- nothing meaningful changed
    end if;
  elsif tg_op = 'INSERT' and not names_only then
    changed := new_j - 'search_vector';
  end if;

  insert into public.audit_log (table_name, record_id, action, actor_id, changed_fields)
  values (tg_table_name, rec_id, lower(tg_op)::public.audit_action,
          coalesce(auth.uid(), (new_j ->> 'updated_by')::uuid), changed);
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'packages', 'package_prices', 'destinations', 'countries', 'package_categories', 'policies',
    'blog_posts', 'visa_guides', 'visa_types', 'pages', 'faqs', 'testimonials',
    'media_assets', 'seo_meta', 'redirects', 'site_settings', 'lead_stages', 'marketing_channels'
  ]
  loop
    execute format(
      'create trigger write_audit_log after insert or update or delete on public.%I
         for each row execute function private.write_audit_log()', t);
  end loop;

  foreach t in array array['leads', 'contacts', 'profiles']
  loop
    execute format(
      'create trigger write_audit_log after insert or update or delete on public.%I
         for each row execute function private.write_audit_log(''names_only'')', t);
  end loop;
end;
$$;

-- user_roles has a composite key: log it explicitly.
create or replace function private.audit_user_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record := coalesce(new, old);
begin
  insert into public.audit_log (table_name, record_id, action, actor_id, changed_fields)
  values ('user_roles', r.user_id, lower(tg_op)::public.audit_action, auth.uid(),
          jsonb_build_object('role', r.role));
  return null;
end;
$$;

create trigger audit_user_roles
  after insert or delete on public.user_roles
  for each row execute function private.audit_user_roles();
