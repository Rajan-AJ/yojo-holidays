// Applies every migration in supabase/migrations to in-memory PGlite (with a
// Supabase stand-in: roles, auth, storage, default grants) and tests RLS + triggers.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/[\/]$/, "");
const nm = (p) => pathToFileURL(`${root}/node_modules/${p}`).href;
const { PGlite } = await import(nm("@electric-sql/pglite/dist/index.js"));
const { pg_trgm } = await import(nm("@electric-sql/pglite/dist/contrib/pg_trgm.js"));
const { btree_gist } = await import(nm("@electric-sql/pglite/dist/contrib/btree_gist.js"));
const db = new PGlite({ extensions: { pg_trgm, btree_gist } });

await db.exec(readFileSync(`${root}/supabase/local/supabase-shim.sql`, "utf8"));
const dir = `${root}/supabase/migrations`;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  try { await db.exec(readFileSync(`${dir}/${f}`, "utf8")); }
  catch (e) { console.log("✘ migration", f, "->", e.message, e.where ?? ""); process.exit(1); }
  console.log("✔ applied", f);
}

let failures = 0;
const q = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await q(sql, p))[0];
const as = async (role, uid) => {
  await db.exec(`reset role`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  if (role) await db.exec(`set role ${role}`);
};
const expect = (label, cond, extra = "") => {
  if (cond) console.log("✔", label);
  else { failures++; console.log("✘", label, extra); }
};
const denied = async (label, sql, p) => {
  try { await db.query(sql, p); failures++; console.log("✘ should be denied:", label); }
  catch (e) { console.log("✔ denied:", label, `(${e.message.slice(0, 60)})`); }
};
const rowCount = async (sql, p) => (await db.query(sql, p)).affectedRows ?? 0;

// ---------------------------------------------------------------- fixtures (as owner)
await as(null);
const mkUser = async (name, role) => {
  const u = await one(`insert into auth.users(email) values($1) returning id`, [`${name}@yojo.test`]);
  await q(`insert into profiles(id, full_name) values($1,$2)`, [u.id, name]);
  if (role) await q(`insert into user_roles(user_id, role) values($1,$2)`, [u.id, role]);
  return u.id;
};
const superA = await mkUser("super", "super_admin");
const editor = await mkUser("editor", "editor");
const mkt = await mkUser("marketing", "marketing");
const sales1 = await mkUser("sales1", "sales");
const sales2 = await mkUser("sales2", "sales");
const customer = (await one(`insert into auth.users(email) values('cust@x.in') returning id`)).id;

const vn = await one(`select id from countries where iso2='VN'`);
const inn = await one(`select id from countries where iso2='IN'`);
expect("reference data: 74 countries", (await one(`select count(*)::int n from countries`)).n === 74);
expect("reference data: 7 categories published", (await one(`select count(*)::int n from package_categories where status='published'`)).n === 7);

const dVN = await one(`insert into destinations(name,slug,type,country_id,status) values('Vietnam','vietnam','country',$1,'published') returning id, scope, published_at`, [vn.id]);
const dKL = await one(`insert into destinations(name,slug,type,country_id,status) values('Kerala','kerala','state',$1,'published') returning id, scope`, [inn.id]);
expect("trigger: Vietnam scope = international", dVN.scope === "international");
expect("trigger: Kerala scope = domestic", dKL.scope === "domestic");
expect("trigger: published_at defaulted on publish", dVN.published_at !== null);

const pLive = await one(`insert into packages(name,slug,primary_destination_id,duration_days,duration_nights,status)
  values('Vietnam 6 Days','vietnam-6-days-5-nights',$1,6,5,'published') returning id, scope`, [dVN.id]);
const pDraft = await one(`insert into packages(name,slug,primary_destination_id,duration_days,duration_nights)
  values('Kerala Draft','kerala-draft',$1,4,3) returning id, scope`, [dKL.id]);
await one(`insert into packages(name,slug,primary_destination_id,duration_days,duration_nights,status,is_sample)
  values('Sample','sample-pkg',$1,4,3,'published',true)`, [dKL.id]);
await one(`insert into packages(name,slug,primary_destination_id,duration_days,duration_nights,status,published_at)
  values('Scheduled','scheduled-pkg',$1,4,3,'published', now() + interval '2 days') returning id`, [dKL.id]);
expect("trigger: package scope from destination", pLive.scope === "international" && pDraft.scope === "domestic");
expect("trigger: primary destination auto-linked",
  (await one(`select count(*)::int n from package_destinations where package_id=$1 and destination_id=$2`, [pLive.id, dVN.id])).n === 1);

await q(`insert into itinerary_days(package_id,day_number,title) values($1,1,'Live day'),($2,1,'Draft day')`, [pLive.id, pDraft.id]);
const day = await one(`select id from itinerary_days where package_id=$1`, [pLive.id]);
await q(`insert into itinerary_day_items(itinerary_day_id,title) values($1,'Old Quarter walk')`, [day.id]);

await q(`insert into package_prices(package_id,plan_name,valid_from,valid_to,adult_twin_sharing) values
  ($1,'Standard','2020-01-01','2020-12-31',10000),
  ($1,'Standard',current_date, null, 59999),
  ($1,'Deluxe', null, null, 79999),
  ($1,'Old', null, null, 45000)`, [pLive.id]);
await q(`update package_prices set is_active=false where plan_name='Old'`);
expect("trigger: starting_price = cheapest current active price (59999)",
  Number((await one(`select starting_price from packages where id=$1`, [pLive.id])).starting_price) === 59999);

const stage = await one(`select id from lead_stages where code='contacted'`);
const c1 = await one(`insert into contacts(full_name,phone) values('Asha','+919800000001') returning id`);
const c2 = await one(`insert into contacts(full_name,phone) values('Ravi','+919800000002') returning id`);
const lMine = await one(`insert into leads(contact_id,enquiry_type,assigned_to,form_path) values($1,'package',$2,'/') returning id, stage_id`, [c1.id, sales1]);
const lOther = await one(`insert into leads(contact_id,enquiry_type,assigned_to,form_path) values($1,'package',$2,'/') returning id`, [c2.id, sales2]);
expect("trigger: lead gets default stage 'new'",
  (await one(`select code from lead_stages where id=$1`, [lMine.stage_id])).code === "new");

// ---------------------------------------------------------------- visitor (anon)
await as("anon");
const anonPkgs = (await q(`select slug from packages order by slug`)).map((r) => r.slug);
expect("anon: sees only live, non-sample, non-scheduled packages", JSON.stringify(anonPkgs) === '["vietnam-6-days-5-nights"]', JSON.stringify(anonPkgs));
expect("anon: itinerary only of the published package", (await q(`select title from itinerary_days`)).map((r) => r.title).join() === "Live day");
expect("anon: nested day items visible through parent", (await q(`select title from itinerary_day_items`)).length === 1);
expect("anon: inactive price hidden", (await q(`select plan_name from package_prices where plan_name='Old'`)).length === 0);
expect("anon: categories readable", (await q(`select 1 from package_categories`)).length === 7);
expect("anon: site settings readable", (await q(`select company_name from site_settings`)).length === 1);
await denied("anon: read leads", `select * from leads`);
await denied("anon: read contacts", `select * from contacts`);
await denied("anon: insert a lead directly", `insert into leads(contact_id,enquiry_type,form_path) values($1,'callback','/')`, [c1.id]);
await denied("anon: write packages", `update packages set name='hacked'`);
await denied("anon: read redirects", `select * from redirects`);
await denied("anon: read audit log", `select * from audit_log`);

// sample content toggle
await as(null);
await db.exec(`set app.show_sample_content = 'true'`);
await as("anon");
expect("anon: sample visible when app.show_sample_content=true", (await q(`select 1 from packages where slug='sample-pkg'`)).length === 1);
await as(null);
await db.exec(`set app.show_sample_content = 'false'`);

// ---------------------------------------------------------------- signed-in customer (no staff role)
await as("authenticated", customer);
expect("customer: same view as visitor", (await q(`select 1 from packages`)).length === 1);
expect("customer: no leads", (await q(`select 1 from leads`)).length === 0);
expect("customer: cannot update packages (0 rows)", (await rowCount(`update packages set name='x'`)) === 0);
expect("customer: has_permission false", (await one(`select public.has_permission('packages','read') ok`)).ok === false);

// ---------------------------------------------------------------- editor
await as("authenticated", editor);
expect("editor: sees drafts", (await q(`select 1 from packages where slug='kerala-draft'`)).length === 1);
const newPkg = await one(`insert into packages(name,slug,primary_destination_id,duration_days,duration_nights) values('Editor pkg','editor-pkg',$1,3,2) returning id, created_by`, [dKL.id]);
expect("editor: created_by forced to auth.uid()", newPkg.created_by === editor);
expect("editor: can publish", (await rowCount(`update packages set status='published' where id=$1`, [newPkg.id])) === 1);
expect("editor: can soft delete", (await rowCount(`update packages set deleted_at=now() where id=$1`, [newPkg.id])) === 1);
expect("editor: cannot purge (hard delete) (0 rows)", (await rowCount(`delete from packages where id=$1`, [pDraft.id])) === 0);
expect("editor: no leads", (await q(`select 1 from leads`)).length === 0);
await denied("editor: cannot publish pages (no pages.publish)", `insert into pages(slug,title,status) values('about','About','published')`);
await denied("editor: cannot change own is_active", `update profiles set is_active=false where id=$1`, [editor]);
expect("editor: can update own name", (await rowCount(`update profiles set full_name='Ed' where id=$1`, [editor])) === 1);
await denied("editor: cannot grant self admin", `insert into user_roles(user_id,role) values($1,'admin')`, [editor]);

// ---------------------------------------------------------------- marketing
await as("authenticated", mkt);
expect("marketing: cannot edit packages (0 rows)", (await rowCount(`update packages set name='x' where id=$1`, [pLive.id])) === 0);
const seo = await one(`insert into seo_meta(seo_title) values('Vietnam tour packages') returning id`);
expect("marketing: can write SEO", !!seo.id);
expect("marketing: reads all leads", (await q(`select 1 from leads`)).length === 2);
expect("marketing: cannot update leads (0 rows)", (await rowCount(`update leads set priority='high'`)) === 0);
expect("marketing: can publish a blog post",
  !!(await one(`insert into blog_posts(title,slug,status) values('Best time to visit Vietnam','best-time-vietnam','published') returning id`)));

// ---------------------------------------------------------------- sales
await as("authenticated", sales1);
const salesLeads = (await q(`select id from leads`)).map((r) => r.id);
expect("sales1: sees only own lead", salesLeads.length === 1 && salesLeads[0] === lMine.id);
expect("sales1: sees only that contact", (await q(`select full_name from contacts`)).map((r) => r.full_name).join() === "Asha");
expect("sales1: cannot update other's lead (0 rows)", (await rowCount(`update leads set priority='high' where id=$1`, [lOther.id])) === 0);
expect("sales1: moves own lead stage", (await rowCount(`update leads set stage_id=$1 where id=$2`, [stage.id, lMine.id])) === 1);
expect("trigger: stage change written to timeline",
  (await q(`select 1 from lead_activities where lead_id=$1 and type='stage_change' and actor_id=$2`, [lMine.id, sales1])).length === 1);
expect("sales1: adds a call note", (await rowCount(`insert into lead_activities(lead_id,type,body,actor_id) values($1,'call','Called, wants Dec',$2)`, [lMine.id, sales1])) === 1);
await denied("sales1: cannot forge a stage_change entry", `insert into lead_activities(lead_id,type,actor_id) values($1,'stage_change',$2)`, [lMine.id, sales1]);
await denied("sales1: cannot note on other's lead", `insert into lead_activities(lead_id,type,body,actor_id) values($1,'note','x',$2)`, [lOther.id, sales1]);
expect("sales1: cannot delete leads (0 rows)", (await rowCount(`delete from leads`)) === 0);

// ---------------------------------------------------------------- super admin
await as("authenticated", superA);
expect("super admin: implicit permissions", (await one(`select public.has_permission('anything','at_all') ok`)).ok === true);
expect("super admin: can purge", (await rowCount(`delete from packages where id=$1`, [pDraft.id])) === 1);
await denied("super admin: cannot remove last super admin role", `delete from user_roles where user_id=$1 and role='super_admin'`, [superA]);

// ---------------------------------------------------------------- slug redirects + audit (as owner)
await as(null);
await q(`update packages set slug='vietnam-7-days-6-nights' where id=$1`, [pLive.id]);
await q(`update packages set slug='vietnam-classic-7-days' where id=$1`, [pLive.id]);
const reds = await q(`select from_path, to_path, status_code from redirects order by from_path`);
expect("trigger: slug change -> 301, chain collapsed",
  reds.length === 2 && reds.every((r) => r.to_path === "/packages/vietnam-classic-7-days/" && r.status_code === 301), JSON.stringify(reds));
await q(`update packages set slug='vietnam-6-days-5-nights' where id=$1`, [pLive.id]);
const reds2 = await q(`select from_path from redirects where from_path='/packages/vietnam-6-days-5-nights/'`);
expect("trigger: renaming back removes the redirect from the live URL", reds2.length === 0);
const draftRename = await one(`insert into packages(name,slug,primary_destination_id,duration_days,duration_nights) values('Never live','never-live',$1,3,2) returning id`, [dKL.id]);
await q(`update packages set slug='never-live-2' where id=$1`, [draftRename.id]);
expect("trigger: never-published slug change makes no redirect", (await q(`select 1 from redirects where from_path like '/packages/never-live%'`)).length === 0);

const audit = await one(`select count(*)::int n from audit_log where table_name='packages'`);
expect("trigger: audit log records package changes", audit.n > 0);
await q(`update contacts set full_name='Asha K' where id=$1`, [c1.id]);
const ca = await one(`select changed_fields from audit_log where table_name='contacts' and action='update' order by id desc limit 1`);
expect("trigger: contact audit stores column names only (no PII)", JSON.stringify(ca.changed_fields) === '["full_name"]', JSON.stringify(ca.changed_fields));

// storage
await as("authenticated", editor);
expect("storage: editor can upload to media", (await rowCount(`insert into storage.objects(bucket_id,name) values('media','packages/2026/a.webp')`)) === 1);
await as("authenticated", sales1);
await denied("storage: sales cannot upload", `insert into storage.objects(bucket_id,name) values('media','x.webp')`);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
