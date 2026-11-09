/**
 * DEVELOPMENT SEED DATA. Run with `npx prisma db seed`.
 *
 * - Refuses to run when NODE_ENV=production.
 * - Re-runnable: reference data (regions, countries, categories) is upserted
 *   by slug; sample content (isSample = true) is deleted and recreated.
 * - Places are real; everything editorial is marked as a sample. No reviews,
 *   prices, visa rules, hotel facts or company claims are invented: prices are
 *   null ("price on request"), visa requirements and answers are explicit
 *   placeholders, hotels are fictional "Sample ..." names.
 * - Inputs go through the same Zod schemas the admin will use.
 */
import { db } from "@/lib/db";
import {
  destinationInput,
  faqInput,
  hotelInput,
  listItemInput,
  itineraryInput,
  regionInput,
  tourCategoryInput,
  tourPackageInput,
  travelGuideInput,
  visaRequirementInput,
  visaTypeInput,
  countryInput,
} from "@/server/validation/content";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV is production.");
  process.exit(1);
}

const PLACEHOLDER_CREDIT = "Unsplash (development placeholder)";
const PLACEHOLDER_ANSWER =
  "[Placeholder answer. The confirmed answer will be written by Yojo Holidays and managed from the admin dashboard.]";
const now = new Date();

async function photo(id: string, altText: string) {
  return db.media.create({
    data: {
      url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2000&q=80`,
      altText,
      credit: PLACEHOLDER_CREDIT,
    },
    select: { id: true },
  });
}

async function clearSamples() {
  // Children cascade from these parents (days, highlights, hotels links, FAQs...).
  await db.fAQ.deleteMany({ where: { isSample: true } });
  await db.travelGuide.deleteMany({ where: { isSample: true } });
  await db.tourPackage.deleteMany({ where: { isSample: true } });
  await db.hotel.deleteMany({ where: { isSample: true } });
  await db.visaCountry.deleteMany({ where: { isSample: true } });
  // Children before parents (Hanoi before Vietnam) to respect Restrict rules.
  await db.destination.deleteMany({ where: { isSample: true, parentId: { not: null } } });
  await db.destination.deleteMany({ where: { isSample: true } });
  await db.seoMeta.deleteMany({
    where: {
      region: null, country: null, destination: null, category: null,
      package: null, visaCountry: null, guide: null,
    },
  });
  await db.media.deleteMany({ where: { credit: PLACEHOLDER_CREDIT } });
}

async function main() {
  await clearSamples();

  // ---- Regions (reference data) -------------------------------------------
  const regionData = [
    { name: "Asia", slug: "asia" },
    { name: "Southeast Asia", slug: "southeast-asia", parent: "asia" },
    { name: "East Asia", slug: "east-asia", parent: "asia" },
    { name: "Middle East", slug: "middle-east" },
    { name: "India", slug: "india" },
  ];
  const regions: Record<string, string> = {};
  for (const [i, r] of regionData.entries()) {
    const data = regionInput.parse({ name: r.name, slug: r.slug, status: "PUBLISHED", sortOrder: i });
    const row = await db.region.upsert({
      where: { slug: data.slug },
      update: { ...data, parentId: r.parent ? regions[r.parent] : null },
      create: { ...data, parentId: r.parent ? regions[r.parent] : null },
      select: { id: true },
    });
    regions[r.slug] = row.id;
  }

  // ---- Countries (reference data: names and ISO codes only) ---------------
  const countryData = [
    { name: "India", slug: "india", isoCode: "IN", region: "india", demonym: "Indian" },
    { name: "Vietnam", slug: "vietnam", isoCode: "VN", region: "southeast-asia" },
    { name: "Singapore", slug: "singapore", isoCode: "SG", region: "southeast-asia" },
    { name: "Japan", slug: "japan", isoCode: "JP", region: "east-asia" },
    { name: "United Arab Emirates", slug: "united-arab-emirates", isoCode: "AE", region: "middle-east" },
  ];
  const countries: Record<string, string> = {};
  for (const c of countryData) {
    const data = countryInput.parse({ ...c, status: "PUBLISHED" });
    const row = await db.country.upsert({
      where: { isoCode: data.isoCode },
      update: { ...data, regionId: regions[c.region] },
      create: { ...data, regionId: regions[c.region] },
      select: { id: true },
    });
    countries[c.slug] = row.id;
  }

  // ---- Tour categories (travel styles; reference data) --------------------
  const categoryData = [
    ["Family", "family", "Trips paced for children and grandparents alike."],
    ["Honeymoon", "honeymoon", "Romantic stays and time for two."],
    ["Group", "group", "Friends, colleagues or extended family travelling together."],
    ["Senior Citizen", "senior-citizen", "Comfortable pacing and extra support."],
    ["Women's", "womens", "Trips designed for women travelling together."],
    ["Luxury", "luxury", "Exceptional hotels and private experiences."],
    ["Weekend", "weekend", "Short breaks close to home."],
    ["Custom", "custom", "Planned from scratch around your idea."],
  ] as const;
  const categories: Record<string, string> = {};
  for (const [i, [name, slug, description]] of categoryData.entries()) {
    const data = tourCategoryInput.parse({ name, slug, description, status: "PUBLISHED", sortOrder: i });
    const row = await db.tourCategory.upsert({
      where: { slug },
      update: data,
      create: data,
      select: { id: true },
    });
    categories[slug] = row.id;
  }

  // ---- Media (placeholder photography) ------------------------------------
  const img = {
    vietnam: await photo("1528127269322-539801943592", "Boats anchored among limestone islands in Ha Long Bay, Vietnam, at dusk"),
    bridge: await photo("1559592413-7cec4d0cae2b", "The Golden Bridge near Da Nang, Vietnam, held up by two giant stone hands"),
    japan: await photo("1493976040374-85c8e12f0c0e", "A woman in a kimono on a stone lane in Kyoto, with a pagoda at sunset"),
    tokyo: await photo("1540959733332-eab4deabeeaf", "A neon-lit shopping street in Tokyo at dusk"),
    kerala: await photo("1602216056096-3b40cc0c9944", "A thatched houseboat on a palm-lined backwater in Kerala"),
    departure: await photo("1530521954074-e64f6810b32d", "A traveller waiting in an airport lounge as a plane takes off outside"),
    beach: await photo("1507525428034-b723cf961d3e", "Gentle waves on a white-sand beach at sunrise"),
  };

  // Travel-style photos (placeholder media is recreated each run, so re-link).
  const styleImages: Record<string, { id: string }> = {
    family: img.beach,
    honeymoon: await photo("1533105079780-92b9be482077", "White-washed steps and flowers above a deep blue sea on a Greek island"),
    group: await photo("1626621341517-bbf3d9990a23", "Trekkers walking up a snowy ridge under dramatic mountain clouds"),
    "senior-citizen": img.kerala,
    womens: img.japan,
    luxury: await photo("1520250497591-112f2f40a3f4", "A resort pool with thatched pavilions, palms and limestone hills behind"),
    weekend: await photo("1512343879784-a960bf40e7f2", "A palm-lined beach with clear turquoise water and beach huts"),
    custom: await photo("1488646953014-85cb44e25828", "A paper map on a table with a notebook, pencil, camera and travel guides"),
  };
  for (const [slug, media] of Object.entries(styleImages)) {
    await db.tourCategory.update({ where: { slug }, data: { imageId: media.id } });
  }

  // ---- Destinations (real places, sample descriptions) --------------------
  async function destination(
    input: Record<string, unknown>,
    links: { country: string; parentId?: string; imageId: string },
  ) {
    const data = destinationInput.parse({ ...input, isSample: true, status: "PUBLISHED" });
    return db.destination.create({
      data: {
        ...data,
        countryId: countries[links.country],
        parentId: links.parentId,
        featuredImageId: links.imageId,
      },
      select: { id: true },
    });
  }

  const vietnam = await destination(
    {
      name: "Vietnam", slug: "vietnam", type: "COUNTRY", scope: "INTERNATIONAL", isFeatured: true,
      shortDescription: "Sample description: limestone bays, old towns and a long coastline.",
      bestTimeToVisit: "[Sample: to be written by the Yojo Holidays team]",
      averageDuration: "[Sample]",
    },
    { country: "vietnam", imageId: img.vietnam.id },
  );
  const hanoi = await destination(
    { name: "Hanoi", slug: "hanoi", type: "CITY", scope: "INTERNATIONAL", shortDescription: "Sample description." },
    { country: "vietnam", parentId: vietnam.id, imageId: img.departure.id },
  );
  const halong = await destination(
    { name: "Ha Long Bay", slug: "ha-long-bay", type: "PLACE", scope: "INTERNATIONAL", shortDescription: "Sample description." },
    { country: "vietnam", parentId: vietnam.id, imageId: img.vietnam.id },
  );
  const japan = await destination(
    {
      name: "Japan", slug: "japan", type: "COUNTRY", scope: "INTERNATIONAL", isFeatured: true,
      shortDescription: "Sample description: temple lanes and neon cities.",
    },
    { country: "japan", imageId: img.japan.id },
  );
  const tokyo = await destination(
    { name: "Tokyo", slug: "tokyo", type: "CITY", scope: "INTERNATIONAL", shortDescription: "Sample description." },
    { country: "japan", parentId: japan.id, imageId: img.tokyo.id },
  );
  await destination(
    {
      name: "Kerala", slug: "kerala", type: "REGION", scope: "DOMESTIC", isFeatured: true,
      shortDescription: "Sample description: backwaters, tea hills and coast.",
    },
    { country: "india", imageId: img.kerala.id },
  );
  await db.destination.update({
    where: { id: vietnam.id },
    data: {
      related: { connect: [{ id: japan.id }] },
      gallery: { create: [{ mediaId: img.bridge.id, sortOrder: 0 }, { mediaId: img.beach.id, sortOrder: 1 }] },
      seo: { create: { seoTitle: "Vietnam Tour Packages (sample)", metaDescription: "Sample SEO description." } },
    },
  });

  await db.fAQ.create({
    data: {
      ...faqInput.parse({
        question: "How many days do I need in Vietnam?",
        answer: PLACEHOLDER_ANSWER,
        isSample: true,
        status: "PUBLISHED",
      }),
      destinationId: vietnam.id,
    },
  });

  // ---- Visa information (structure only; nothing stated as fact) ----------
  // Guides are for the default (Indian) passport. No kinds, fees, processing
  // times or verified dates are set: none of this has been verified.
  async function createVisaGuide(
    countrySlug: string,
    types: { name: string; slug: string; purpose: "TOURISM" | "BUSINESS" | "TRANSIT"; detailed: boolean }[],
  ) {
    const guide = await db.visaCountry.create({
      data: {
        countryId: countries[countrySlug],
        passportCountryId: countries.india,
        isSample: true,
        status: "PUBLISHED",
        shortAnswer: "[Sample: the verified answer will be added from the official source]",
        description: "[Sample: overview to be written once requirements are verified]",
        importantNotes: "[Sample: important notes to be added once verified]",
      },
      select: { id: true },
    });
    for (const [i, t] of types.entries()) {
      const data = visaTypeInput.parse({
        name: `${t.name} (sample)`,
        slug: t.slug,
        purpose: t.purpose,
        description: t.detailed ? "[Sample: who this visa is for and what it allows, once verified]" : undefined,
        eligibility: t.detailed ? "[Sample: eligibility to be confirmed from the official source]" : undefined,
        importantNotes: t.detailed ? "[Sample: notes to be added once verified]" : undefined,
        status: "PUBLISHED",
        sortOrder: i,
      });
      const count = t.detailed ? 4 : 3;
      await db.visaType.create({
        data: {
          ...data,
          visaCountryId: guide.id,
          requirements: {
            create: Array.from({ length: count }, (_, n) =>
              visaRequirementInput.parse({
                title: `[Placeholder document ${n + 1}]`,
                description: "To be replaced with verified information from the official source.",
                sortOrder: n,
              }),
            ),
          },
          steps: {
            create: Array.from({ length: count }, (_, n) =>
              listItemInput.parse({
                title: `[Sample step ${n + 1}]`,
                description: "The verified application step will be written here.",
                sortOrder: n,
              }),
            ),
          },
          faqs: {
            create: faqInput.parse({
              question: `How long does the ${t.name.toLowerCase()} take to process?`,
              answer: PLACEHOLDER_ANSWER,
              isSample: true,
              status: "PUBLISHED",
            }),
          },
        },
      });
    }
    return guide;
  }

  const visaCountry = await createVisaGuide("vietnam", [
    { name: "Tourist Visa", slug: "tourist-visa", purpose: "TOURISM", detailed: false },
  ]);
  await createVisaGuide("japan", [
    { name: "Tourist Visa", slug: "tourist-visa", purpose: "TOURISM", detailed: true },
    { name: "Business Visa", slug: "business-visa", purpose: "BUSINESS", detailed: true },
  ]);

  // General visa questions for /visa/ (no owner, placement VISA).
  await db.fAQ.createMany({
    data: [
      "How early should I apply for a visa?",
      "Can you help if my visa application is refused?",
    ].map((question, i) =>
      faqInput.parse({ question, answer: PLACEHOLDER_ANSWER, placement: "VISA", sortOrder: i, isSample: true, status: "PUBLISHED" }),
    ),
  });

  // ---- Hotels (fictional, clearly sample) ---------------------------------
  async function hotel(name: string, slug: string, city: string, country: string) {
    const data = hotelInput.parse({ name, slug, city, isSample: true, description: "Fictional sample hotel." });
    return db.hotel.create({ data: { ...data, countryId: countries[country] }, select: { id: true } });
  }
  const hotelHanoi = await hotel("Sample Hotel Hanoi", "sample-hotel-hanoi", "Hanoi", "vietnam");
  const hotelCruise = await hotel("Sample Bay Cruise", "sample-bay-cruise", "Ha Long Bay", "vietnam");
  const hotelHoiAn = await hotel("Sample Resort Hoi An", "sample-resort-hoi-an", "Hoi An", "vietnam");
  const hotelTokyo = await hotel("Sample Hotel Tokyo", "sample-hotel-tokyo", "Tokyo", "japan");

  // ---- Tour packages ------------------------------------------------------
  const vietnamDays = itineraryInput.parse([
    { dayNumber: 1, title: "Arrival in Hanoi", description: "Sample: airport transfer and a free evening in the Old Quarter.", dinner: true },
    { dayNumber: 2, title: "Hanoi city tour", morningActivities: "Sample: old town walk.", afternoonActivities: "Sample: museum visit.", breakfast: true },
    { dayNumber: 3, title: "Ha Long Bay", description: "Sample: drive to the coast and board an overnight cruise.", breakfast: true, lunch: true, dinner: true },
    { dayNumber: 4, title: "Return to Hanoi, fly to Da Nang", breakfast: true },
    { dayNumber: 5, title: "Hoi An old town", breakfast: true },
    { dayNumber: 6, title: "At leisure in Hoi An", breakfast: true },
    { dayNumber: 7, title: "Departure", accommodationNote: "Flight home", breakfast: true },
  ]);
  const dayLinks: Record<number, { destinationId?: string; hotelId?: string; imageId?: string }> = {
    1: { destinationId: hanoi.id, hotelId: hotelHanoi.id, imageId: img.departure.id },
    2: { destinationId: hanoi.id, hotelId: hotelHanoi.id },
    3: { destinationId: halong.id, hotelId: hotelCruise.id, imageId: img.vietnam.id },
    4: { hotelId: hotelHoiAn.id, imageId: img.bridge.id },
    5: { hotelId: hotelHoiAn.id },
    6: { hotelId: hotelHoiAn.id, imageId: img.beach.id },
  };

  const vietnamPackage = tourPackageInput.parse({
    name: "Vietnam 7 Days / 6 Nights (sample)",
    slug: "vietnam-7-days-6-nights",
    shortDescription: "Sample package: Hanoi, Ha Long Bay and Hoi An.",
    description: "Sample description. Real package content will be entered from the admin dashboard.",
    durationDays: 7,
    durationNights: 6,
    startingPrice: null, // never invent prices
    isFeatured: true,
    isSample: true,
    status: "PUBLISHED",
    publishedAt: now,
  });
  const vietnamSeo = await db.seoMeta.create({
    data: { seoTitle: "Vietnam 7 Days / 6 Nights (sample)", noIndex: true },
    select: { id: true },
  });
  await db.tourPackage.create({
    data: {
      ...vietnamPackage,
      seoId: vietnamSeo.id,
      destinationId: vietnam.id,
      featuredImageId: img.vietnam.id,
      visaCountryId: visaCountry.id,
      categories: { connect: [{ id: categories.family }, { id: categories.group }] },
      gallery: { create: [{ mediaId: img.bridge.id, sortOrder: 0 }] },
      highlights: {
        create: [
          { title: "Overnight Ha Long Bay cruise", icon: "cruise", sortOrder: 0 },
          { title: "Hanoi Old Quarter walk", sortOrder: 1 },
          { title: "Lantern-lit Hoi An", sortOrder: 2 },
        ],
      },
      itineraryDays: { create: vietnamDays.map((d) => ({ ...d, ...dayLinks[d.dayNumber] })) },
      hotels: {
        create: [
          { hotelId: hotelHanoi.id, nights: 2, mealPlan: "[Sample]", sortOrder: 0 },
          { hotelId: hotelCruise.id, nights: 1, sortOrder: 1 },
          { hotelId: hotelHoiAn.id, nights: 3, sortOrder: 2 },
        ],
      },
      inclusions: {
        create: [
          { title: "[Sample inclusion] Accommodation as listed", sortOrder: 0 },
          { title: "[Sample inclusion] Airport transfers", sortOrder: 1 },
        ],
      },
      exclusions: { create: [{ title: "[Sample exclusion] International flights", sortOrder: 0 }] },
      faqs: {
        create: faqInput.parse({
          question: "Can this itinerary be customised?",
          answer: PLACEHOLDER_ANSWER,
          isSample: true,
          status: "PUBLISHED",
        }),
      },
    },
  });

  const japanPackage = tourPackageInput.parse({
    name: "Japan 5 Days / 4 Nights (sample)",
    slug: "japan-5-days-4-nights",
    shortDescription: "Sample package: Tokyo and surroundings.",
    durationDays: 5,
    durationNights: 4,
    isFeatured: true,
    isSample: true,
    status: "PUBLISHED",
    publishedAt: now,
  });
  await db.tourPackage.create({
    data: {
      ...japanPackage,
      destinationId: japan.id,
      featuredImageId: img.tokyo.id,
      categories: { connect: [{ id: categories.family }] },
      itineraryDays: {
        create: itineraryInput
          .parse([
            { dayNumber: 1, title: "Arrival in Tokyo" },
            { dayNumber: 2, title: "Tokyo city tour" },
            { dayNumber: 3, title: "Day trip from Tokyo" },
            { dayNumber: 4, title: "At leisure" },
            { dayNumber: 5, title: "Departure", accommodationNote: "Flight home" },
          ])
          .map((d) => ({ ...d, destinationId: tokyo.id, hotelId: d.dayNumber < 5 ? hotelTokyo.id : undefined })),
      },
      hotels: { create: [{ hotelId: hotelTokyo.id, nights: 4 }] },
    },
  });

  // ---- Travel Journal -----------------------------------------------------
  const bestTime = travelGuideInput.parse({
    title: "Best Time to Visit Vietnam (sample)",
    slug: "best-time-to-visit-vietnam",
    excerpt: "Sample excerpt. The real guide will be written by the team.",
    content: "## Sample article\n\nThis is development content. Replace it with the real guide.",
    category: "BEST_TIME_TO_VISIT",
    isSample: true,
    status: "PUBLISHED",
    publishedAt: now,
  });
  const visaGuide = travelGuideInput.parse({
    title: "Vietnam Visa for Indians (sample)",
    slug: "vietnam-visa-for-indians",
    excerpt: "Sample excerpt.",
    content: "## Sample article\n\nNo visa rules are stated here until they are verified.",
    category: "VISA_GUIDE",
    isSample: true,
    status: "PUBLISHED",
    publishedAt: now,
  });
  const guide1 = await db.travelGuide.create({
    data: {
      ...bestTime,
      destinationId: vietnam.id,
      featuredImageId: img.vietnam.id,
      faqs: {
        create: faqInput.parse({
          question: "Which month is best for Ha Long Bay?",
          answer: PLACEHOLDER_ANSWER,
          isSample: true,
          status: "PUBLISHED",
        }),
      },
    },
    select: { id: true },
  });
  await db.travelGuide.create({
    data: {
      ...visaGuide,
      countryId: countries.vietnam,
      featuredImageId: img.departure.id,
      related: { connect: [{ id: guide1.id }] },
    },
  });

  // ---- Site-wide / homepage FAQs ------------------------------------------
  const homepageQuestions = [
    "Can I change a package to suit my plans?",
    "Do you help with visa applications?",
    "How do I book a trip?",
    "What payment options are available?",
  ];
  await db.fAQ.createMany({
    data: homepageQuestions.map((question, i) =>
      faqInput.parse({
        question,
        answer: PLACEHOLDER_ANSWER,
        placement: "HOMEPAGE",
        sortOrder: i,
        isSample: true,
        status: "PUBLISHED",
      }),
    ),
  });

  const counts = {
    regions: await db.region.count(),
    countries: await db.country.count(),
    destinations: await db.destination.count(),
    categories: await db.tourCategory.count(),
    packages: await db.tourPackage.count(),
    itineraryDays: await db.itineraryDay.count(),
    hotels: await db.hotel.count(),
    visaTypes: await db.visaType.count(),
    guides: await db.travelGuide.count(),
    faqs: await db.fAQ.count(),
    reviews: await db.review.count(),
  };
  console.log("Seeded development data:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
