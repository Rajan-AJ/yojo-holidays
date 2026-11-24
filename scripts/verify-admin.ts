/**
 * CMS engine verification against DATABASE_URL (local DB recommended):
 * round-trips every content type through load -> save, creates records with
 * nested children, checks validation and permission guards, and confirms the
 * public repositories see the result. Creates rows prefixed "zz-verify-" and
 * removes them at the end.
 *
 *   npm run db:verify-admin
 */
import { resources, getResource } from "@/server/admin/resources";
import { loadRecord, loadRelationOptions, saveRecord, changeLifecycle, listRecords } from "@/server/admin/crud";
import type { StaffSession } from "@/server/admin/session";
import { emptyValues } from "@/lib/admin/fields";
import { findPackageBySlug } from "@/server/repositories/packages";
import { findPageBySlug } from "@/server/repositories/pages";
import { findVisaCountryBySlug } from "@/server/repositories/visa";
import { pool, queryOne } from "@/lib/db";

let failures = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  if (!ok) failures++;
  console.log(ok ? "✔" : "✘", label, ok || extra === undefined ? "" : JSON.stringify(extra).slice(0, 400));
};

async function staff(role: "super_admin" | "sales"): Promise<StaffSession> {
  const email = `zz-verify-${role}@localhost`;
  const user = (await queryOne<{ id: string }>(
    `insert into auth.users (email) values ($1) on conflict (email) do update set email = excluded.email returning id`,
    [email],
  ))!;
  await pool.query(`insert into public.profiles (id, full_name) values ($1, $2) on conflict (id) do nothing`, [user.id, `Verify ${role}`]);
  await pool.query(`insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing`, [user.id, role]);
  const perms = await pool.query<{ resource: string; action: string }>(`select resource, action from public.role_permissions where role = $1`, [role]);
  const set = new Set(perms.rows.map((p) => `${p.resource}.${p.action}`));
  return {
    id: user.id,
    name: `Verify ${role}`,
    roles: [role],
    isSuperAdmin: role === "super_admin",
    permissions: {},
    can: (r, a) => role === "super_admin" || set.has(`${r}.${a}`),
  };
}

async function main() {
  const admin = await staff("super_admin");
  const sales = await staff("sales");

  // 1. Every resource: list + load + options + save-back unchanged.
  for (const res of resources) {
    const list = await listRecords(res, {});
    const id = res.singleton ? null : (list.rows.find(() => true)?.id as string | undefined);
    if (!res.singleton && !id) {
      console.log("·", `${res.key}: no rows to round-trip`);
      continue;
    }
    const rec = await loadRecord(res, id ?? null);
    await loadRelationOptions([...res.fields, ...(res.side ?? [])]);
    const saved = rec ? await saveRecord(res, id ?? null, rec.values, admin) : { ok: false, error: "not loaded" };
    check(`${res.key}: load -> save round-trip`, saved.ok, saved);
  }

  // 2. Create a package with itinerary (+ nested activities), prices, departures, FAQs, SEO.
  const pkgRes = getResource("packages")!;
  const dest = (await queryOne<{ id: string }>(`select id from public.destinations where slug = 'vietnam'`))!;
  const faq = (await queryOne<{ id: string }>(`select id from public.faqs limit 1`))!;
  const values = {
    ...emptyValues([...pkgRes.fields, ...(pkgRes.side ?? [])]),
    name: "ZZ Verify Package",
    slug: "zz-verify-package",
    primary_destination_id: dest.id,
    duration_days: 3,
    duration_nights: 2,
    status: "published",
    published_at: null,
    short_description: "Created by verify-admin.",
    itinerary: [
      { title: "Arrive", breakfast: false, lunch: false, dinner: true, items: [{ title: "Welcome dinner", kind: "activity", is_optional: false }] },
      { title: "Explore", breakfast: true, lunch: false, dinner: false, items: [] },
      { title: "Depart", breakfast: true, lunch: false, dinner: false, items: [] },
    ],
    prices: [
      { plan_name: "Standard", valid_from: null, valid_to: null, adult_twin_sharing: 45999, price_basis: "per_person_twin_sharing", currency: "INR", includes_gst: false, is_active: true },
    ],
    departures: [{ departure_date: "2099-01-10", return_date: "2099-01-12", status: "open", seats_total: 20, seats_available: 12 }],
    faqs: [faq.id],
    __seo: { seo_title: "ZZ Verify SEO title", meta_description: "ZZ verify description", noindex: false, nofollow: false },
  };
  const created = await saveRecord(pkgRes, null, values, admin);
  check("create package with nested children", created.ok, created);
  if (created.ok) {
    const pub = await findPackageBySlug("zz-verify-package");
    check("public page sees it (itinerary 3 days, 1 activity)", pub?.itinerary.length === 3 && pub.itinerary[0].activities.length === 1, pub?.itinerary);
    check("starting price derived by trigger (45999)", pub?.price.amount === 45999, pub?.price);
    check("departure + FAQ + SEO saved", pub?.departures.length === 1 && pub.seo.title === "ZZ Verify SEO title", { d: pub?.departures, s: pub?.seo });

    // Reorder + edit: upsert keeps the price row id stable.
    const rec = (await loadRecord(pkgRes, created.id))!;
    const priceId = (rec.values.prices as { id: string }[])[0].id;
    (rec.values.itinerary as Record<string, unknown>[]).reverse();
    (rec.values.prices as Record<string, unknown>[])[0].adult_twin_sharing = 41999;
    const edited = await saveRecord(pkgRes, created.id, rec.values, admin);
    const rec2 = (await loadRecord(pkgRes, created.id))!;
    check("edit: itinerary reordered, price updated in place", edited.ok && (rec2.values.itinerary as { title: string }[])[0].title === "Depart" && (rec2.values.prices as { id: string }[])[0].id === priceId, edited);
    check("starting price follows edit (41999)", (await findPackageBySlug("zz-verify-package"))?.price.amount === 41999);

    // Overlapping seasons are rejected with a friendly message.
    const overlap = { ...rec2.values, prices: [...(rec2.values.prices as object[]), { plan_name: "Standard", adult_twin_sharing: 1, price_basis: "per_person_twin_sharing", currency: "INR", is_active: true, includes_gst: false }] };
    const bad = await saveRecord(pkgRes, created.id, overlap, admin);
    check("overlapping price seasons rejected", !bad.ok && /overlap/.test(bad.ok ? "" : (bad.error ?? "")), bad);

    // Validation errors point at nested fields.
    const invalid = await saveRecord(pkgRes, created.id, { ...rec2.values, itinerary: [{ title: "" }] }, admin);
    check("nested validation error path (itinerary.0.title)", !invalid.ok && Boolean(!invalid.ok && invalid.fieldErrors?.["itinerary.0.title"]), invalid);

    // Duplicate slug -> friendly message.
    const dup = await saveRecord(pkgRes, null, { ...values, name: "Dup" }, admin);
    check("duplicate slug rejected", !dup.ok && /slug/.test(dup.ok ? "" : (dup.error ?? "")), dup);

    // Slug change creates a redirect (already published).
    const renamed = await saveRecord(pkgRes, created.id, { ...rec2.values, slug: "zz-verify-package-2" }, admin);
    const red = await queryOne(`select 1 from public.redirects where from_path = '/packages/zz-verify-package/'`);
    check("slug change -> automatic 301", renamed.ok && Boolean(red));

    // Sales can't write packages; trigger blocks publish without permission.
    const salesTry = await saveRecord(pkgRes, created.id, { ...rec2.values, status: "draft" }, sales);
    check("sales cannot unpublish a package", !salesTry.ok, salesTry);

    // Trash hides it from the public site; restore brings it back.
    await changeLifecycle(pkgRes, created.id, "trash", admin);
    check("trashed package hidden publicly", (await findPackageBySlug("zz-verify-package-2")) === null);
    await changeLifecycle(pkgRes, created.id, "restore", admin);
    check("restored package visible again", (await findPackageBySlug("zz-verify-package-2")) !== null);
    await changeLifecycle(pkgRes, created.id, "purge", admin);
  }

  // 3. CMS page with blocks stored in page_sections.content.
  const pageRes = getResource("pages")!;
  const page = await saveRecord(
    pageRes,
    null,
    {
      ...emptyValues(pageRes.fields),
      title: "ZZ Verify Landing",
      slug: "zz-verify-landing",
      template: "landing",
      status: "published",
      sections: [
        { section_type: "stats", is_visible: true, heading: "Numbers", lines: "10+|Years\n5000|Travellers" },
        { section_type: "cta", is_visible: true, heading: "Go", button_label: "Plan", button_href: "/plan-your-trip/" },
      ],
      __seo: {},
    },
    admin,
  );
  const pagePub = page.ok ? await findPageBySlug("zz-verify-landing") : null;
  check("page blocks saved + rendered (stats + cta)", pagePub?.blocks.length === 2 && pagePub.blocks[0].type === "stats", { page, pagePub });
  if (page.ok) await changeLifecycle(pageRes, page.id, "purge", admin);

  // 4. Visa guide with types -> documents/steps/fees (two nesting levels).
  const visaRes = getResource("visa")!;
  const th = (await queryOne<{ id: string }>(`select id from public.countries where iso2 = 'TH'`))!;
  const ind = (await queryOne<{ id: string }>(`select id from public.countries where iso2 = 'IN'`))!;
  const visa = await saveRecord(
    visaRes,
    null,
    {
      ...emptyValues([...visaRes.fields, ...(visaRes.side ?? [])]),
      title: "ZZ Thailand Visa",
      slug: "zz-verify-thailand",
      destination_country_id: th.id,
      passport_country_id: ind.id,
      status: "published",
      last_verified_at: new Date().toISOString(),
      types: [
        {
          name: "Tourist",
          slug: "tourist",
          purpose: "tourism",
          status: "published",
          processing_days_min: 3,
          processing_days_max: 5,
          documents: [{ title: "Passport", is_mandatory: true }],
          steps: [{ title: "Apply online" }],
          fees: [{ label: "Visa fee", fee_kind: "government", amount: 2000, currency: "INR" }],
        },
      ],
      __seo: {},
    },
    admin,
  );
  const vPub = visa.ok ? await findVisaCountryBySlug("zz-verify-thailand") : null;
  check("visa guide + nested docs/steps/fees; verified fee shown", vPub?.visaTypes[0]?.fee.amount === 2000 && vPub.visaTypes[0].processingTime === "3–5 days", { visa, t: vPub?.visaTypes[0] });
  if (visa.ok) await changeLifecycle(visaRes, visa.id, "purge", admin);

  // 5. Settings singleton.
  const settingsRes = getResource("settings")!;
  const s = (await loadRecord(settingsRes, null))!;
  const savedSettings = await saveRecord(settingsRes, null, { ...s.values, phone: "98765 43210" }, admin);
  const phone = await queryOne<{ phone: string }>(`select phone from public.site_settings`);
  check("settings: phone normalised to E.164", savedSettings.ok && phone?.phone === "+919876543210", { savedSettings, phone });
  await saveRecord(settingsRes, null, s.values, admin); // restore

  // Cleanup verify users.
  await pool.query(`delete from public.redirects where from_path like '/packages/zz-verify%'`);
  await pool.query(`delete from public.user_roles where user_id in ($1, $2)`, [admin.id, sales.id]).catch(() => {});
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL CHECKS PASSED");
  await pool.end();
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
