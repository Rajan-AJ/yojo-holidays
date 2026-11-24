import "server-only";
import type { FieldDef } from "@/lib/admin/fields";

/**
 * Every content type the CMS manages, declared once. The generic list page,
 * editor and save engine (crud.ts) are driven entirely by these definitions,
 * so a new content type is a new entry here, not new screens.
 *
 * `permission` matches public.role_permissions.resource; `tags` are the cache
 * tags invalidated on save (src/server/queries/cache-tags.ts).
 */

export type ListColumn = {
  label: string;
  /** Constant SQL expression over alias `t`. */
  sql: string;
  kind?: "text" | "status" | "date" | "boolean" | "money" | "image" | "count";
};

export type ResourceDef = {
  key: string; // URL segment: /admin/{key}/
  table: string;
  singular: string;
  plural: string;
  group: "Travel" | "Content" | "Visa" | "Marketing" | "Settings";
  permission: string;
  /** Column used as the record title (search + headings). */
  titleColumn: string;
  publishable?: boolean;
  seo?: boolean;
  softDelete?: boolean;
  singleton?: boolean;
  /** For "View on site". */
  publicPrefix?: string;
  list: ListColumn[];
  defaultOrder: string;
  fields: FieldDef[];
  side?: FieldDef[];
  tags: string[];
  /** Constant SQL run after save with $1 = record id. */
  afterSave?: string[];
};

// ---------------------------------------------------------------------------
// Reusable field fragments
// ---------------------------------------------------------------------------

const status: ListColumn = { label: "Status", sql: "t.status", kind: "status" };
const updated: ListColumn = { label: "Updated", sql: "t.updated_at", kind: "date" };
const image = (col: string): ListColumn => ({
  label: "",
  sql: `(select json_build_object('bucket', m.bucket, 'path', m.storage_path) from public.media_assets m where m.id = t.${col})`,
  kind: "image",
});
const featured: FieldDef = { name: "is_featured", label: "Featured", type: "boolean", hint: "Shown on the homepage" };
const sortOrder: FieldDef = { name: "sort_order", label: "Sort order", type: "number", min: 0, hint: "Lower numbers first", defaultValue: 0 };
const destinationRel = (name: string, label: string, required = false): FieldDef => ({
  name,
  label,
  type: "relation",
  table: "destinations",
  labelColumn: "name",
  where: "deleted_at is null",
  required,
});
const faqLinks = (ownerFk: string): FieldDef => ({
  name: "faqs",
  label: "FAQs",
  type: "multiRelation",
  joinTable: "faq_links",
  ownerFk,
  targetFk: "faq_id",
  table: "faqs",
  labelColumn: "question",
  sorted: true,
  where: "deleted_at is null",
  hint: "FAQs are written once under FAQs and can be reused on many pages.",
});
const policy = (name: string, label: string, kind: string): FieldDef => ({
  name,
  label,
  type: "relation",
  table: "policies",
  labelColumn: "title",
  where: `kind = '${kind}' and deleted_at is null`,
  hint: "Leave empty to use the default",
  width: "third",
});

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

const packages: ResourceDef = {
  key: "packages",
  table: "packages",
  singular: "Package",
  plural: "Packages",
  group: "Travel",
  permission: "packages",
  titleColumn: "name",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/packages/",
  defaultOrder: "t.updated_at desc",
  list: [
    image("hero_media_id"),
    { label: "Package", sql: "t.name" },
    { label: "Destination", sql: "(select name from public.destinations d where d.id = t.primary_destination_id)" },
    { label: "Duration", sql: "t.duration_days || 'D / ' || t.duration_nights || 'N'" },
    { label: "From", sql: "t.starting_price", kind: "money" },
    status,
    updated,
  ],
  fields: [
    { name: "name", label: "Package name", type: "text", required: true, max: 200 },
    { name: "slug", label: "URL slug", type: "slug", from: "name", prefix: "/packages/", required: true },
    destinationRel("primary_destination_id", "Main destination", true),
    {
      name: "destinations",
      label: "Also visits",
      type: "multiRelation",
      joinTable: "package_destinations",
      ownerFk: "package_id",
      targetFk: "destination_id",
      table: "destinations",
      labelColumn: "name",
      sorted: true,
      where: "deleted_at is null",
      hint: "Other cities and countries on the route (multi-destination trips)",
    },
    { name: "duration_days", label: "Days", type: "number", min: 1, max: 90, required: true, width: "third" },
    { name: "duration_nights", label: "Nights", type: "number", min: 0, max: 90, required: true, width: "third" },
    {
      name: "departure_type",
      label: "Departure type",
      type: "select",
      options: [["flexible", "Any date (customisable)"], ["fixed_departure", "Fixed group departures"]],
      required: true,
      defaultValue: "flexible",
      width: "third",
    },
    {
      name: "categories",
      label: "Travel styles",
      type: "multiRelation",
      joinTable: "package_category_links",
      ownerFk: "package_id",
      targetFk: "category_id",
      table: "package_categories",
      labelColumn: "name",
      where: "deleted_at is null",
    },
    { name: "short_description", label: "Short description", type: "textarea", max: 500, hint: "Shown on cards and in search results" },
    { name: "description", label: "Full description", type: "richtext" },
    { name: "hero_media_id", label: "Main photo", type: "media" },
    { name: "gallery", label: "Gallery", type: "gallery", joinTable: "package_media", ownerFk: "package_id" },
    {
      name: "highlights",
      label: "Highlights",
      type: "children",
      table: "package_highlights",
      fk: "package_id",
      orderColumn: "sort_order",
      strategy: "replace",
      itemLabel: "highlight",
      titleField: "title",
      fields: [
        { name: "title", label: "Highlight", type: "text", required: true, max: 200 },
        { name: "description", label: "Detail", type: "textarea", max: 500 },
      ],
    },
    {
      name: "itinerary",
      label: "Itinerary",
      type: "children",
      table: "itinerary_days",
      fk: "package_id",
      orderColumn: "day_number",
      strategy: "replace",
      itemLabel: "day",
      titleField: "title",
      max: 90,
      fields: [
        { name: "title", label: "Day title", type: "text", required: true, max: 200 },
        { name: "description", label: "What happens", type: "textarea", max: 4000 },
        { name: "breakfast", label: "Breakfast", type: "boolean", width: "third", defaultValue: true },
        { name: "lunch", label: "Lunch", type: "boolean", width: "third" },
        { name: "dinner", label: "Dinner", type: "boolean", width: "third" },
        destinationRel("overnight_destination_id", "Overnight in"),
        { name: "hotel_id", label: "Hotel", type: "relation", table: "hotels", labelColumn: "name", where: "deleted_at is null", width: "half" },
        { name: "accommodation_note", label: "Or accommodation note", type: "text", max: 200, placeholder: "Overnight on the cruise", width: "half" },
        { name: "media_id", label: "Photo", type: "media" },
        {
          name: "items",
          label: "Activities & places covered",
          type: "children",
          table: "itinerary_day_items",
          fk: "itinerary_day_id",
          orderColumn: "sort_order",
          strategy: "replace",
          itemLabel: "activity",
          titleField: "title",
          fields: [
            { name: "title", label: "Activity", type: "text", required: true, max: 200, width: "half" },
            {
              name: "kind",
              label: "Type",
              type: "select",
              options: [["activity", "Activity"], ["sightseeing", "Sightseeing"], ["transfer", "Transfer"], ["place", "Place visited"]],
              required: true,
              defaultValue: "activity",
              width: "third",
            },
            { name: "is_optional", label: "Optional", type: "boolean", width: "third" },
          ],
        },
      ],
    },
    {
      name: "prices",
      label: "Pricing",
      type: "children",
      table: "package_prices",
      fk: "package_id",
      orderColumn: "sort_order",
      strategy: "upsert",
      itemLabel: "price plan",
      titleField: "plan_name",
      hint: "One row per hotel tier and season. Seasons of the same plan can't overlap. The cheapest current twin-sharing price becomes the 'from' price.",
      fields: [
        { name: "plan_name", label: "Plan", type: "text", required: true, max: 100, placeholder: "Standard 3★", width: "third" },
        { name: "valid_from", label: "Valid from", type: "date", width: "third" },
        { name: "valid_to", label: "Valid to", type: "date", width: "third" },
        { name: "adult_twin_sharing", label: "Adult (twin)", type: "money", width: "third" },
        { name: "adult_triple_sharing", label: "Adult (triple)", type: "money", width: "third" },
        { name: "single_supplement", label: "Single supplement", type: "money", width: "third" },
        { name: "child_with_bed", label: "Child with bed", type: "money", width: "third" },
        { name: "child_without_bed", label: "Child no bed", type: "money", width: "third" },
        { name: "infant", label: "Infant", type: "money", width: "third" },
        {
          name: "price_basis",
          label: "Basis",
          type: "select",
          options: [["per_person_twin_sharing", "Per person, twin sharing"], ["per_person", "Per person"], ["per_couple", "Per couple"], ["per_group", "Per group"]],
          required: true,
          defaultValue: "per_person_twin_sharing",
          width: "half",
        },
        { name: "currency", label: "Currency", type: "text", max: 3, required: true, width: "third", defaultValue: "INR" },
        { name: "includes_gst", label: "Includes GST", type: "boolean", width: "third" },
        { name: "is_active", label: "Active", type: "boolean", width: "third", defaultValue: true },
        { name: "notes", label: "Price notes", type: "textarea", max: 1000 },
      ],
    },
    {
      name: "departures",
      label: "Group departures",
      type: "children",
      table: "package_departures",
      fk: "package_id",
      orderColumn: "departure_date",
      strategy: "upsert",
      itemLabel: "departure",
      titleField: "departure_date",
      hint: "Only for fixed-departure group tours.",
      fields: [
        { name: "departure_date", label: "Departs", type: "date", required: true, width: "third" },
        { name: "return_date", label: "Returns", type: "date", width: "third" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [["open", "Open"], ["filling_fast", "Filling fast"], ["sold_out", "Sold out"], ["closed", "Closed"], ["cancelled", "Cancelled"]],
          required: true,
          defaultValue: "open",
          width: "third",
        },
        { name: "seats_total", label: "Seats", type: "number", min: 0, width: "third" },
        { name: "seats_available", label: "Seats left", type: "number", min: 0, width: "third" },
        { name: "price_override", label: "Price (if different)", type: "money", width: "third" },
      ],
    },
    {
      name: "hotels",
      label: "Hotels",
      type: "children",
      table: "package_hotels",
      fk: "package_id",
      orderColumn: "sort_order",
      strategy: "replace",
      itemLabel: "hotel",
      fields: [
        { name: "hotel_id", label: "Hotel", type: "relation", table: "hotels", labelColumn: "name", where: "deleted_at is null", required: true, width: "half" },
        { name: "nights", label: "Nights", type: "number", min: 1, required: true, width: "third", defaultValue: 1 },
        { name: "room_type", label: "Room", type: "text", max: 100, width: "third" },
        { name: "meal_plan", label: "Meal plan", type: "text", max: 100, width: "third" },
        { name: "is_or_similar", label: "“Or similar”", type: "boolean", width: "third", defaultValue: true },
      ],
    },
    {
      name: "inclusions",
      label: "Inclusions & exclusions",
      type: "children",
      table: "package_inclusions",
      fk: "package_id",
      orderColumn: "sort_order",
      strategy: "replace",
      itemLabel: "item",
      titleField: "title",
      fields: [
        { name: "is_included", label: "Included (untick for “not included”)", type: "boolean", width: "half", defaultValue: true },
        { name: "inclusion_type_id", label: "Type", type: "relation", table: "inclusion_types", labelColumn: "label", width: "half" },
        { name: "title", label: "Item", type: "text", required: true, max: 200 },
        { name: "description", label: "Detail", type: "textarea", max: 500 },
      ],
    },
    { name: "important_notes", label: "Important notes", type: "richtext" },
    policy("terms_policy_id", "Terms", "terms"),
    policy("cancellation_policy_id", "Cancellation policy", "cancellation"),
    policy("payment_policy_id", "Payment terms", "payment"),
    faqLinks("package_id"),
  ],
  side: [featured, sortOrder, { name: "currency", label: "Currency", type: "text", max: 3, required: true, defaultValue: "INR" }],
  tags: ["packages", "destinations", "categories"],
  afterSave: [
    `insert into public.package_destinations (package_id, destination_id) select id, primary_destination_id from public.packages where id = $1 on conflict do nothing`,
    `select public.refresh_package_starting_price($1)`,
  ],
};

const destinations: ResourceDef = {
  key: "destinations",
  table: "destinations",
  singular: "Destination",
  plural: "Destinations",
  group: "Travel",
  permission: "destinations",
  titleColumn: "name",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/destinations/",
  defaultOrder: "t.updated_at desc",
  list: [
    image("hero_media_id"),
    { label: "Destination", sql: "t.name" },
    { label: "Type", sql: "initcap(t.type::text)" },
    { label: "Country", sql: "(select name from public.countries c where c.id = t.country_id)" },
    { label: "Scope", sql: "initcap(t.scope::text)" },
    status,
    updated,
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 120 },
    { name: "slug", label: "URL slug", type: "slug", from: "name", prefix: "/destinations/", required: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [["country", "Country"], ["state", "State"], ["region", "Region"], ["city", "City"], ["place", "Place"]],
      required: true,
      width: "third",
    },
    { name: "country_id", label: "Country", type: "relation", table: "countries", labelColumn: "name", where: "deleted_at is null", required: true, width: "third" },
    { ...destinationRel("parent_id", "Inside (parent)"), width: "third", hint: "e.g. Hanoi is inside Vietnam" },
    { name: "short_description", label: "Short description", type: "textarea", max: 500 },
    { name: "description", label: "Full description", type: "richtext" },
    { name: "hero_media_id", label: "Hero photo", type: "media" },
    { name: "gallery", label: "Gallery", type: "gallery", joinTable: "destination_media", ownerFk: "destination_id" },
    { name: "best_months", label: "Best months to visit", type: "months" },
    { name: "best_time_to_visit", label: "Best time to visit (text)", type: "textarea", max: 1000 },
    { name: "ideal_duration", label: "Ideal trip length", type: "text", max: 60, placeholder: "6 to 8 days" },
    {
      name: "tips",
      label: "Travel tips",
      type: "children",
      table: "destination_travel_tips",
      fk: "destination_id",
      orderColumn: "sort_order",
      strategy: "replace",
      itemLabel: "tip",
      titleField: "title",
      fields: [
        { name: "title", label: "Tip", type: "text", required: true, max: 200 },
        { name: "body", label: "Detail", type: "textarea", required: true, max: 2000 },
      ],
    },
    faqLinks("destination_id"),
  ],
  side: [featured, sortOrder],
  tags: ["destinations", "packages"],
};

const categories: ResourceDef = {
  key: "categories",
  table: "package_categories",
  singular: "Travel style",
  plural: "Travel styles",
  group: "Travel",
  permission: "categories",
  titleColumn: "name",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/tours/",
  defaultOrder: "t.sort_order, t.name",
  list: [
    image("hero_media_id"),
    { label: "Style", sql: "t.name" },
    { label: "Packages", sql: "(select count(*) from public.package_category_links l where l.category_id = t.id)", kind: "count" },
    status,
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 120 },
    { name: "slug", label: "URL slug", type: "slug", from: "name", prefix: "/tours/", required: true },
    { name: "description", label: "Description", type: "textarea", max: 1000 },
    { name: "hero_media_id", label: "Photo", type: "media" },
    faqLinks("category_id"),
  ],
  side: [sortOrder],
  tags: ["categories", "packages"],
};

const hotels: ResourceDef = {
  key: "hotels",
  table: "hotels",
  singular: "Hotel",
  plural: "Hotels",
  group: "Travel",
  permission: "hotels",
  titleColumn: "name",
  softDelete: true,
  defaultOrder: "t.name",
  list: [
    { label: "Hotel", sql: "t.name" },
    { label: "Destination", sql: "(select name from public.destinations d where d.id = t.destination_id)" },
    { label: "Stars", sql: "t.star_rating" },
    updated,
  ],
  fields: [
    { name: "name", label: "Hotel name", type: "text", required: true, max: 200 },
    { name: "slug", label: "Slug", type: "slug", from: "name", prefix: "", required: true },
    destinationRel("destination_id", "Destination"),
    { name: "star_rating", label: "Official star rating", type: "number", min: 1, max: 5, width: "third" },
    { name: "website", label: "Website", type: "url", width: "half" },
    { name: "address", label: "Address", type: "text", max: 300 },
    { name: "description", label: "Description", type: "textarea", max: 2000 },
    { name: "media_id", label: "Photo", type: "media" },
  ],
  tags: ["packages"],
};

const policies: ResourceDef = {
  key: "policies",
  table: "policies",
  singular: "Policy",
  plural: "Terms & policies",
  group: "Travel",
  permission: "policies",
  titleColumn: "title",
  publishable: true,
  softDelete: true,
  defaultOrder: "t.kind, t.title",
  list: [
    { label: "Title", sql: "t.title" },
    { label: "Kind", sql: "initcap(t.kind::text)" },
    { label: "Default", sql: "t.is_default", kind: "boolean" },
    status,
    updated,
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, max: 200 },
    {
      name: "kind",
      label: "Kind",
      type: "select",
      options: [["terms", "Booking terms"], ["cancellation", "Cancellation policy"], ["payment", "Payment terms"]],
      required: true,
      defaultValue: "terms",
    },
    { name: "body", label: "Text", type: "richtext", required: true },
  ],
  side: [{ name: "is_default", label: "Default for its kind", type: "boolean", hint: "Used by packages that don't choose one" }],
  tags: ["packages"],
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const posts: ResourceDef = {
  key: "blog",
  table: "blog_posts",
  singular: "Blog post",
  plural: "Blog posts",
  group: "Content",
  permission: "blog",
  titleColumn: "title",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/blog/",
  defaultOrder: "t.updated_at desc",
  list: [
    image("featured_media_id"),
    { label: "Title", sql: "t.title" },
    { label: "Category", sql: "(select name from public.blog_categories c where c.id = t.category_id)" },
    { label: "Author", sql: "(select name from public.authors a where a.id = t.author_id)" },
    status,
    { label: "Published", sql: "t.published_at", kind: "date" },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, max: 200 },
    { name: "slug", label: "URL slug", type: "slug", from: "title", prefix: "/blog/", required: true },
    { name: "excerpt", label: "Excerpt", type: "textarea", max: 600, hint: "Shown on cards and as the default meta description" },
    { name: "featured_media_id", label: "Featured image", type: "media" },
    { name: "content", label: "Article", type: "richtext", required: true },
    { name: "category_id", label: "Category", type: "relation", table: "blog_categories", labelColumn: "name", where: "deleted_at is null", width: "half" },
    { name: "author_id", label: "Author", type: "relation", table: "authors", labelColumn: "name", where: "deleted_at is null", width: "half" },
    {
      name: "tags",
      label: "Tags",
      type: "multiRelation",
      joinTable: "blog_post_tags",
      ownerFk: "post_id",
      targetFk: "tag_id",
      table: "tags",
      labelColumn: "name",
    },
    {
      name: "destinations",
      label: "About destinations",
      type: "multiRelation",
      joinTable: "blog_post_destinations",
      ownerFk: "post_id",
      targetFk: "destination_id",
      table: "destinations",
      labelColumn: "name",
      where: "deleted_at is null",
    },
    {
      name: "packages",
      label: "Recommended packages",
      type: "multiRelation",
      joinTable: "blog_post_packages",
      ownerFk: "post_id",
      targetFk: "package_id",
      table: "packages",
      labelColumn: "name",
      sorted: true,
      where: "deleted_at is null",
    },
    faqLinks("blog_post_id"),
  ],
  side: [
    { name: "reading_minutes", label: "Reading time (min)", type: "number", min: 1, max: 120 },
    { name: "content_updated_at", label: "“Updated on” date", type: "datetime", hint: "Set when the content meaningfully changes" },
  ],
  tags: ["blog"],
};

const blogCategories: ResourceDef = {
  key: "blog-categories",
  table: "blog_categories",
  singular: "Blog category",
  plural: "Blog categories",
  group: "Content",
  permission: "blog",
  titleColumn: "name",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/blog/category/",
  defaultOrder: "t.sort_order, t.name",
  list: [{ label: "Category", sql: "t.name" }, { label: "Posts", sql: "(select count(*) from public.blog_posts b where b.category_id = t.id)", kind: "count" }, status],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 120 },
    { name: "slug", label: "URL slug", type: "slug", from: "name", prefix: "/blog/category/", required: true },
    { name: "description", label: "Description", type: "textarea", max: 1000 },
    { name: "parent_id", label: "Parent category", type: "relation", table: "blog_categories", labelColumn: "name", where: "deleted_at is null" },
    { name: "hero_media_id", label: "Image", type: "media" },
  ],
  side: [sortOrder],
  tags: ["blog"],
};

const authors: ResourceDef = {
  key: "authors",
  table: "authors",
  singular: "Author",
  plural: "Authors",
  group: "Content",
  permission: "blog",
  titleColumn: "name",
  publishable: true,
  seo: true,
  softDelete: true,
  defaultOrder: "t.name",
  list: [image("photo_media_id"), { label: "Name", sql: "t.name" }, status],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 120 },
    { name: "slug", label: "URL slug", type: "slug", from: "name", prefix: "/authors/", required: true },
    { name: "bio", label: "Bio", type: "textarea", max: 1000 },
    { name: "photo_media_id", label: "Photo", type: "media" },
  ],
  tags: ["blog"],
};

const tagsResource: ResourceDef = {
  key: "tags",
  table: "tags",
  singular: "Tag",
  plural: "Tags",
  group: "Content",
  permission: "blog",
  titleColumn: "name",
  defaultOrder: "t.name",
  list: [{ label: "Tag", sql: "t.name" }, { label: "Posts", sql: "(select count(*) from public.blog_post_tags x where x.tag_id = t.id)", kind: "count" }],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 60 },
    { name: "slug", label: "Slug", type: "slug", from: "name", prefix: "", required: true },
  ],
  tags: ["blog"],
};

const faqs: ResourceDef = {
  key: "faqs",
  table: "faqs",
  singular: "FAQ",
  plural: "FAQs",
  group: "Content",
  permission: "faqs",
  titleColumn: "question",
  publishable: true,
  softDelete: true,
  defaultOrder: "t.faq_group nulls last, t.question",
  list: [
    { label: "Question", sql: "t.question" },
    { label: "Group", sql: "t.faq_group" },
    { label: "Used on", sql: "(select count(*) from public.faq_links l where l.faq_id = t.id)", kind: "count" },
    status,
  ],
  fields: [
    { name: "question", label: "Question", type: "text", required: true, max: 300 },
    { name: "answer", label: "Answer", type: "textarea", required: true, max: 4000, hint: "Plain text (also used in Google's FAQ results)" },
    { name: "faq_group", label: "Group (for finding it in the admin)", type: "text", max: 60, placeholder: "Payments" },
  ],
  tags: ["faqs"],
};

const testimonials: ResourceDef = {
  key: "testimonials",
  table: "testimonials",
  singular: "Testimonial",
  plural: "Testimonials",
  group: "Content",
  permission: "testimonials",
  titleColumn: "customer_name",
  publishable: true,
  softDelete: true,
  defaultOrder: "t.updated_at desc",
  list: [
    image("photo_media_id"),
    { label: "Customer", sql: "t.customer_name" },
    { label: "Rating", sql: "t.rating || ' ★'" },
    { label: "Package", sql: "(select name from public.packages p where p.id = t.package_id)" },
    { label: "Verified", sql: "t.is_verified", kind: "boolean" },
    status,
  ],
  fields: [
    { name: "customer_name", label: "Customer name", type: "text", required: true, max: 120, width: "half" },
    { name: "customer_city", label: "City", type: "text", max: 80, width: "half" },
    { name: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5, required: true, width: "third", defaultValue: 5 },
    { name: "travelled_on", label: "Travelled (any day of the month)", type: "date", width: "third" },
    {
      name: "source",
      label: "Source",
      type: "select",
      options: [["google", "Google review"], ["whatsapp", "WhatsApp"], ["email", "Email"], ["video", "Video"], ["website", "Website"], ["other", "Other"]],
      required: true,
      defaultValue: "google",
      width: "third",
    },
    { name: "title", label: "Headline", type: "text", max: 200 },
    { name: "content", label: "Review", type: "textarea", required: true, max: 4000 },
    { name: "photo_media_id", label: "Customer photo", type: "media" },
    { name: "package_id", label: "Package", type: "relation", table: "packages", labelColumn: "name", where: "deleted_at is null", width: "half" },
    { ...destinationRel("destination_id", "Destination"), width: "half" },
    { name: "source_url", label: "Link to original review", type: "url" },
  ],
  side: [
    { name: "is_verified", label: "Verified traveller", type: "boolean", hint: "Staff confirmed this person travelled with us" },
    { name: "consent_recorded_at", label: "Consent to publish recorded", type: "datetime" },
    featured,
    sortOrder,
  ],
  tags: ["reviews"],
};

const pages: ResourceDef = {
  key: "pages",
  table: "pages",
  singular: "Page",
  plural: "Pages",
  group: "Content",
  permission: "pages",
  titleColumn: "title",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/",
  defaultOrder: "t.title",
  list: [{ label: "Page", sql: "t.title" }, { label: "URL", sql: "case when t.slug = 'home' then '/' else '/' || t.slug || '/' end" }, { label: "Template", sql: "t.template" }, status],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, max: 200 },
    { name: "slug", label: "URL slug", type: "slug", from: "title", prefix: "/", required: true, hint: "“home” is the homepage" },
    {
      name: "template",
      label: "Template",
      type: "select",
      options: [["default", "Standard page"], ["legal", "Legal / policy"], ["landing", "Campaign landing page"], ["home", "Homepage"], ["faq", "FAQ page"], ["visa", "Visa page"]],
      required: true,
      defaultValue: "default",
    },
    {
      name: "sections",
      label: "Sections",
      type: "children",
      table: "page_sections",
      fk: "page_id",
      orderColumn: "sort_order",
      strategy: "replace",
      itemLabel: "section",
      titleField: "heading",
      hint: "Build the page from blocks. Each block is optional.",
      jsonColumn: "content",
      realColumns: ["section_type", "is_visible"],
      fields: [
        {
          name: "section_type",
          label: "Block",
          type: "select",
          options: [
            ["rich_text", "Text"],
            ["image_text", "Image + text"],
            ["stats", "Numbers (one per line: 15+|Years)"],
            ["cta", "Call to action"],
            ["faq", "FAQs (uses the page's FAQs)"],
            ["tours", "Featured tours"],
            ["destinations", "Featured destinations"],
            ["testimonials", "Testimonials"],
          ],
          required: true,
          width: "half",
          defaultValue: "rich_text",
        },
        { name: "is_visible", label: "Visible", type: "boolean", width: "half", defaultValue: true },
        { name: "heading", label: "Heading", type: "text", max: 200 },
        { name: "eyebrow", label: "Small label above the heading", type: "text", max: 80 },
        { name: "body", label: "Text", type: "richtext" },
        { name: "media_id", label: "Image", type: "media" },
        { name: "button_label", label: "Button label", type: "text", max: 60, width: "half" },
        { name: "button_href", label: "Button link", type: "text", max: 500, placeholder: "/plan-your-trip/", width: "half" },
        { name: "lines", label: "Lines (stats)", type: "textarea", max: 2000 },
      ],
    },
    faqLinks("page_id"),
  ],
  tags: ["pages", "faqs"],
};

// ---------------------------------------------------------------------------
// Visa
// ---------------------------------------------------------------------------

const visaGuides: ResourceDef = {
  key: "visa",
  table: "visa_guides",
  singular: "Visa guide",
  plural: "Visa guides",
  group: "Visa",
  permission: "visa",
  titleColumn: "title",
  publishable: true,
  seo: true,
  softDelete: true,
  publicPrefix: "/visa/",
  defaultOrder: "t.title",
  list: [
    { label: "Guide", sql: "t.title" },
    { label: "Passport", sql: "(select name from public.countries c where c.id = t.passport_country_id)" },
    { label: "Last verified", sql: "t.last_verified_at", kind: "date" },
    status,
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, max: 200, placeholder: "Vietnam Visa for Indians" },
    { name: "slug", label: "URL slug", type: "slug", from: "title", prefix: "/visa/", required: true },
    { name: "destination_country_id", label: "Visa for travel to", type: "relation", table: "countries", labelColumn: "name", required: true, width: "half" },
    { name: "passport_country_id", label: "For passport holders of", type: "relation", table: "countries", labelColumn: "name", required: true, width: "half" },
    { name: "summary", label: "Quick answer", type: "textarea", max: 600, hint: "Answer-first summary at the top of the page" },
    { name: "content", label: "Overview", type: "richtext" },
    { name: "application_process_intro", label: "Application process intro", type: "textarea", max: 2000 },
    { name: "important_notes", label: "Important notes", type: "textarea", max: 4000 },
    { name: "hero_media_id", label: "Image", type: "media" },
    {
      name: "types",
      label: "Visa types",
      type: "children",
      table: "visa_types",
      fk: "visa_guide_id",
      orderColumn: "sort_order",
      strategy: "upsert",
      itemLabel: "visa type",
      titleField: "name",
      fields: [
        { name: "name", label: "Name", type: "text", required: true, max: 120, width: "half", placeholder: "Tourist e-Visa" },
        { name: "slug", label: "Slug", type: "slug", from: "name", prefix: "", required: true, width: "half" },
        {
          name: "purpose",
          label: "Purpose",
          type: "select",
          options: [["tourism", "Tourism"], ["business", "Business"], ["transit", "Transit"], ["family_visit", "Visiting family"]],
          required: true,
          defaultValue: "tourism",
          width: "third",
        },
        {
          name: "kind",
          label: "Kind",
          type: "select",
          options: [["visa_free", "Visa free"], ["visa_on_arrival", "On arrival"], ["e_visa", "e-Visa"], ["eta", "ETA"], ["visa_required", "Visa required"]],
          width: "third",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [["draft", "Draft"], ["published", "Published"], ["unpublished", "Unpublished"]],
          required: true,
          defaultValue: "published",
          width: "third",
        },
        { name: "description", label: "Who it's for", type: "textarea", max: 2000 },
        { name: "eligibility", label: "Eligibility", type: "textarea", max: 2000 },
        { name: "processing_days_min", label: "Processing (min days)", type: "number", min: 0, width: "third" },
        { name: "processing_days_max", label: "Processing (max days)", type: "number", min: 0, width: "third" },
        { name: "processing_note", label: "Processing note", type: "text", max: 200, width: "third" },
        { name: "validity_days", label: "Validity (days)", type: "number", min: 1, width: "third" },
        { name: "max_stay_days", label: "Max stay (days)", type: "number", min: 1, width: "third" },
        {
          name: "entries",
          label: "Entries",
          type: "select",
          options: [["single", "Single"], ["double", "Double"], ["multiple", "Multiple"]],
          width: "third",
        },
        {
          name: "documents",
          label: "Documents required",
          type: "children",
          table: "visa_documents",
          fk: "visa_type_id",
          orderColumn: "sort_order",
          strategy: "replace",
          itemLabel: "document",
          titleField: "title",
          fields: [
            { name: "title", label: "Document", type: "text", required: true, max: 200 },
            { name: "description", label: "Detail", type: "textarea", max: 1000 },
            { name: "applies_to", label: "Applies to", type: "text", max: 120, placeholder: "Self-employed applicants", width: "half" },
            { name: "is_mandatory", label: "Mandatory", type: "boolean", width: "half", defaultValue: true },
          ],
        },
        {
          name: "steps",
          label: "Application steps",
          type: "children",
          table: "visa_process_steps",
          fk: "visa_type_id",
          orderColumn: "sort_order",
          strategy: "replace",
          itemLabel: "step",
          titleField: "title",
          fields: [
            { name: "title", label: "Step", type: "text", required: true, max: 200 },
            { name: "description", label: "Detail", type: "textarea", max: 1000 },
          ],
        },
        {
          name: "fees",
          label: "Fees",
          type: "children",
          table: "visa_fees",
          fk: "visa_type_id",
          orderColumn: "sort_order",
          strategy: "replace",
          itemLabel: "fee",
          titleField: "label",
          fields: [
            { name: "label", label: "Fee", type: "text", required: true, max: 120, width: "half" },
            {
              name: "fee_kind",
              label: "Kind",
              type: "select",
              options: [["government", "Government"], ["service", "Service"], ["express", "Express"], ["other", "Other"]],
              required: true,
              defaultValue: "government",
              width: "half",
            },
            { name: "amount", label: "Amount", type: "money", width: "half" },
            { name: "currency", label: "Currency", type: "text", max: 3, width: "half", defaultValue: "INR" },
            { name: "notes", label: "Notes", type: "text", max: 300 },
          ],
        },
      ],
    },
    faqLinks("visa_guide_id"),
  ],
  side: [
    { name: "last_verified_at", label: "Last verified against official source", type: "datetime", hint: "Fees and processing times are shown publicly only when set" },
    { name: "source_url", label: "Official source", type: "url" },
  ],
  tags: ["visa"],
};

// ---------------------------------------------------------------------------
// Marketing + Settings
// ---------------------------------------------------------------------------

const redirects: ResourceDef = {
  key: "redirects",
  table: "redirects",
  singular: "Redirect",
  plural: "Redirects",
  group: "Marketing",
  permission: "redirects",
  titleColumn: "from_path",
  defaultOrder: "t.updated_at desc",
  list: [
    { label: "From", sql: "t.from_path" },
    { label: "To", sql: "t.to_path" },
    { label: "Code", sql: "t.status_code" },
    { label: "Hits", sql: "t.hit_count", kind: "count" },
    { label: "Active", sql: "t.is_active", kind: "boolean" },
  ],
  fields: [
    { name: "from_path", label: "Old URL path", type: "text", required: true, max: 2048, placeholder: "/old-vietnam-package/" },
    { name: "to_path", label: "New URL (path or full URL)", type: "text", required: true, max: 2048, placeholder: "/packages/vietnam-6-days-5-nights/" },
    { name: "status_code", label: "Type", type: "select", options: [["301", "301 Permanent"], ["302", "302 Temporary"], ["308", "308 Permanent"], ["307", "307 Temporary"]], required: true, defaultValue: "301" },
    { name: "note", label: "Note", type: "text", max: 300 },
  ],
  side: [{ name: "is_active", label: "Active", type: "boolean", defaultValue: true }],
  tags: ["redirects"],
};

const countries: ResourceDef = {
  key: "countries",
  table: "countries",
  singular: "Country",
  plural: "Countries",
  group: "Settings",
  permission: "geography",
  titleColumn: "name",
  softDelete: true,
  defaultOrder: "t.name",
  list: [{ label: "Country", sql: "t.name" }, { label: "ISO", sql: "t.iso2" }, { label: "Currency", sql: "t.currency_code" }, { label: "Region", sql: "(select name from public.regions r where r.id = t.region_id)" }],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 120 },
    { name: "slug", label: "Slug", type: "slug", from: "name", prefix: "", required: true },
    { name: "iso2", label: "ISO code (2 letters)", type: "text", required: true, max: 2, width: "third" },
    { name: "currency_code", label: "Currency", type: "text", max: 3, width: "third" },
    { name: "calling_code", label: "Calling code", type: "text", max: 5, width: "third" },
    { name: "region_id", label: "Region", type: "relation", table: "regions", labelColumn: "name", width: "half" },
    { name: "demonym", label: "Demonym (Indian, Japanese…)", type: "text", max: 60, width: "half" },
  ],
  tags: ["countries", "destinations", "visa"],
};

const settings: ResourceDef = {
  key: "settings",
  table: "site_settings",
  singular: "Website settings",
  plural: "Website settings",
  group: "Settings",
  permission: "settings",
  titleColumn: "company_name",
  singleton: true,
  defaultOrder: "t.company_name",
  list: [],
  fields: [
    { name: "company_name", label: "Company name", type: "text", required: true, max: 120, width: "half" },
    { name: "legal_name", label: "Legal name", type: "text", max: 200, width: "half" },
    { name: "logo_media_id", label: "Logo", type: "media", width: "half" },
    { name: "favicon_media_id", label: "Favicon", type: "media", width: "half" },
    { name: "phone", label: "Phone", type: "phone", width: "third" },
    { name: "whatsapp", label: "WhatsApp", type: "phone", width: "third" },
    { name: "email", label: "Email", type: "email", width: "third" },
    { name: "address", label: "Address", type: "group", keys: [["line1", "Line 1"], ["line2", "Line 2"], ["city", "City"], ["state", "State"], ["postalCode", "PIN code"], ["country", "Country"]] },
    { name: "google_maps_url", label: "Google Maps link", type: "url" },
    { name: "gst_number", label: "GST number", type: "text", max: 15 },
    { name: "default_seo_title_template", label: "SEO title template", type: "text", required: true, max: 120, hint: "%s is replaced with the page title" },
    { name: "default_meta_description", label: "Default meta description", type: "textarea", max: 320 },
    { name: "default_og_media_id", label: "Default social share image", type: "media" },
  ],
  tags: ["settings"],
};

const socialLinks: ResourceDef = {
  key: "social-links",
  table: "social_links",
  singular: "Social link",
  plural: "Social links",
  group: "Settings",
  permission: "settings",
  titleColumn: "platform",
  defaultOrder: "t.sort_order, t.platform",
  list: [{ label: "Platform", sql: "initcap(t.platform)" }, { label: "URL", sql: "t.url" }, { label: "Active", sql: "t.is_active", kind: "boolean" }],
  fields: [
    {
      name: "platform",
      label: "Platform",
      type: "select",
      options: [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["linkedin", "LinkedIn"], ["x", "X"], ["pinterest", "Pinterest"]],
      required: true,
    },
    { name: "url", label: "Profile URL", type: "url", required: true },
  ],
  side: [{ name: "is_active", label: "Active", type: "boolean", defaultValue: true }, sortOrder],
  tags: ["settings"],
};

const leadStages: ResourceDef = {
  key: "lead-stages",
  table: "lead_stages",
  singular: "Lead stage",
  plural: "Lead stages",
  group: "Settings",
  permission: "lead_config",
  titleColumn: "name",
  defaultOrder: "t.sort_order",
  list: [{ label: "Stage", sql: "t.name" }, { label: "Counts as", sql: "initcap(t.kind::text)" }, { label: "Default", sql: "t.is_default", kind: "boolean" }],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, max: 60 },
    { name: "code", label: "Code", type: "slug", from: "name", prefix: "", required: true },
    { name: "kind", label: "Counts as", type: "select", options: [["open", "Open"], ["won", "Won (booked)"], ["lost", "Lost"], ["spam", "Spam"]], required: true, defaultValue: "open" },
  ],
  side: [{ name: "is_default", label: "Stage for new leads", type: "boolean" }, { name: "is_active", label: "Active", type: "boolean", defaultValue: true }, sortOrder],
  tags: [],
};

export const resources: ResourceDef[] = [
  packages,
  destinations,
  categories,
  hotels,
  policies,
  posts,
  blogCategories,
  authors,
  tagsResource,
  pages,
  faqs,
  testimonials,
  visaGuides,
  redirects,
  settings,
  socialLinks,
  countries,
  leadStages,
];

export function getResource(key: string) {
  return resources.find((r) => r.key === key) ?? null;
}

// Identifier safety: every table/column name used to build SQL is checked once at startup.
const IDENT = /^[a-z_][a-z0-9_]*$/;
function checkFields(fields: FieldDef[], where: string) {
  for (const f of fields) {
    if (!IDENT.test(f.name)) throw new Error(`Bad field name ${where}.${f.name}`);
    if ("table" in f && !IDENT.test(f.table)) throw new Error(`Bad table ${where}.${f.name}`);
    if ("joinTable" in f && !IDENT.test(f.joinTable)) throw new Error(`Bad join table ${where}.${f.name}`);
    if (f.type === "children") checkFields(f.fields, `${where}.${f.name}`);
  }
}
for (const r of resources) {
  if (!IDENT.test(r.table)) throw new Error(`Bad table ${r.table}`);
  checkFields([...r.fields, ...(r.side ?? [])], r.key);
}
