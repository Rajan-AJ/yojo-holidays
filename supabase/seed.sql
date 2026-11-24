-- =============================================================================
-- DEVELOPMENT SAMPLE CONTENT. Never run against production.
--
-- Loaded automatically by `npm run db:local` when the local database is new.
-- Rules (kept from the original seed):
--   * Places are real; every editorial row is is_sample = true and says "Sample".
--   * No invented prices, visa rules, fees, hotel facts or reviews:
--     prices are "on request", visa content is explicit placeholders,
--     hotels are fictional "Sample ..." names, and NO testimonials are seeded.
--   * Photos are Unsplash placeholders (bucket 'unsplash'; see src/lib/media.ts).
-- =============================================================================

do $$
declare
  c_in uuid := (select id from public.countries where iso2 = 'IN');
  c_vn uuid := (select id from public.countries where iso2 = 'VN');
  c_jp uuid := (select id from public.countries where iso2 = 'JP');
  c_ae uuid := (select id from public.countries where iso2 = 'AE');

  m_vietnam uuid; m_bridge uuid; m_japan uuid; m_tokyo uuid; m_kerala uuid;
  m_departure uuid; m_beach uuid; m_honeymoon uuid; m_group uuid; m_luxury uuid;
  m_weekend uuid; m_map uuid; m_lake uuid; m_wing uuid;

  d_vietnam uuid; d_hanoi uuid; d_halong uuid; d_hoian uuid; d_japan uuid; d_tokyo uuid;
  d_kerala uuid; d_munnar uuid; d_alleppey uuid; d_dubai uuid;

  h_hanoi uuid; h_cruise uuid; h_hoian uuid; h_tokyo uuid; h_munnar uuid; h_houseboat uuid;

  p_vietnam uuid; p_japan uuid; p_kerala uuid;
  pol_terms uuid; pol_cancel uuid;
  g_vietnam uuid; g_japan uuid;
  vt uuid;
  bc_guides uuid; bc_visa uuid; bc_tips uuid;
  a_team uuid;
  b_best uuid; b_visa uuid;
  pg_home uuid; pg_visa uuid; pg_faq uuid;
  f uuid;
  day_id uuid;

  doc_sample constant jsonb := '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Sample description. Real content will be written by the Yojo Holidays team and entered from the admin dashboard."}]}]}';
  i int;
begin
  -- ---------------------------------------------------------------- media
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1528127269322-539801943592', 'image/jpeg', 'Boats anchored among limestone islands in Ha Long Bay, Vietnam, at dusk', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_vietnam;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1559592413-7cec4d0cae2b', 'image/jpeg', 'The Golden Bridge near Da Nang, Vietnam, held up by two giant stone hands', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_bridge;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1493976040374-85c8e12f0c0e', 'image/jpeg', 'A woman in a kimono on a stone lane in Kyoto, with a pagoda at sunset', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_japan;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1540959733332-eab4deabeeaf', 'image/jpeg', 'A neon-lit shopping street in Tokyo at dusk', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_tokyo;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1602216056096-3b40cc0c9944', 'image/jpeg', 'A thatched houseboat on a palm-lined backwater in Kerala', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_kerala;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1530521954074-e64f6810b32d', 'image/jpeg', 'A traveller waiting in an airport lounge as a plane takes off outside', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_departure;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1507525428034-b723cf961d3e', 'image/jpeg', 'Gentle waves on a white-sand beach at sunrise', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_beach;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1533105079780-92b9be482077', 'image/jpeg', 'White-washed steps and flowers above a deep blue sea on a Greek island', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_honeymoon;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1626621341517-bbf3d9990a23', 'image/jpeg', 'Trekkers walking up a snowy ridge under dramatic mountain clouds', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_group;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1520250497591-112f2f40a3f4', 'image/jpeg', 'A resort pool with thatched pavilions, palms and limestone hills behind', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_luxury;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1512343879784-a960bf40e7f2', 'image/jpeg', 'A palm-lined beach with clear turquoise water and beach huts', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_weekend;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1488646953014-85cb44e25828', 'image/jpeg', 'A paper map on a table with a notebook, pencil, camera and travel guides', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_map;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1476514525535-07fb3b4ae5f1', 'image/jpeg', 'A turquoise mountain lake surrounded by forest and peaks', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_lake;
  insert into public.media_assets (bucket, storage_path, mime_type, alt_text, credit, width, height) values
    ('unsplash', 'photo-1436491865332-7a61a109cc05', 'image/jpeg', 'An aircraft wing above soft clouds in golden light', 'Unsplash (development placeholder)', 2000, 1333) returning id into m_wing;

  -- category photos (categories come from the reference-data migration)
  update public.package_categories set hero_media_id = case slug
    when 'family' then m_beach when 'honeymoon' then m_honeymoon when 'group' then m_group
    when 'senior-citizen' then m_kerala when 'womens' then m_japan when 'long-weekend' then m_weekend
    when 'gen-z' then m_tokyo end;

  -- ---------------------------------------------------------------- destinations
  insert into public.destinations (name, slug, type, country_id, short_description, description, hero_media_id,
      best_time_to_visit, best_months, ideal_duration, is_featured, sort_order, status, is_sample)
  values ('Vietnam', 'vietnam', 'country', c_vn, 'Sample: limestone bays, lantern-lit old towns and a long, beautiful coastline.',
      doc_sample, m_vietnam, '[Sample: to be written by the Yojo Holidays team]', '{10,11,12,1,2,3,4}', '[Sample]', true, 10, 'published', true)
  returning id into d_vietnam;
  insert into public.destinations (name, slug, type, country_id, parent_id, short_description, hero_media_id, status, is_sample)
  values ('Hanoi', 'hanoi', 'city', c_vn, d_vietnam, 'Sample description.', m_departure, 'published', true) returning id into d_hanoi;
  insert into public.destinations (name, slug, type, country_id, parent_id, short_description, hero_media_id, status, is_sample)
  values ('Ha Long Bay', 'ha-long-bay', 'place', c_vn, d_vietnam, 'Sample description.', m_vietnam, 'published', true) returning id into d_halong;
  insert into public.destinations (name, slug, type, country_id, parent_id, short_description, hero_media_id, status, is_sample)
  values ('Hoi An', 'hoi-an', 'city', c_vn, d_vietnam, 'Sample description.', m_bridge, 'published', true) returning id into d_hoian;

  insert into public.destinations (name, slug, type, country_id, short_description, description, hero_media_id,
      best_months, is_featured, sort_order, status, is_sample)
  values ('Japan', 'japan', 'country', c_jp, 'Sample: temple lanes, mountain views and neon cities.', doc_sample, m_japan,
      '{3,4,10,11}', true, 20, 'published', true) returning id into d_japan;
  insert into public.destinations (name, slug, type, country_id, parent_id, short_description, hero_media_id, status, is_sample)
  values ('Tokyo', 'tokyo', 'city', c_jp, d_japan, 'Sample description.', m_tokyo, 'published', true) returning id into d_tokyo;

  insert into public.destinations (name, slug, type, country_id, short_description, description, hero_media_id,
      best_months, is_featured, sort_order, status, is_sample)
  values ('Kerala', 'kerala', 'state', c_in, 'Sample: backwaters, misty tea hills and a palm-fringed coast.', doc_sample, m_kerala,
      '{9,10,11,12,1,2,3}', true, 30, 'published', true) returning id into d_kerala;
  insert into public.destinations (name, slug, type, country_id, parent_id, short_description, hero_media_id, status, is_sample)
  values ('Munnar', 'munnar', 'city', c_in, d_kerala, 'Sample description.', m_lake, 'published', true) returning id into d_munnar;
  insert into public.destinations (name, slug, type, country_id, parent_id, short_description, hero_media_id, status, is_sample)
  values ('Alleppey', 'alleppey', 'city', c_in, d_kerala, 'Sample description.', m_kerala, 'published', true) returning id into d_alleppey;

  insert into public.destinations (name, slug, type, country_id, short_description, hero_media_id, is_featured, sort_order, status, is_sample)
  values ('Dubai', 'dubai', 'city', c_ae, 'Sample: desert evenings, skyline views and easy short-haul flights.', m_luxury, true, 40, 'published', true)
  returning id into d_dubai;

  insert into public.destination_media (destination_id, media_id, sort_order) values
    (d_vietnam, m_bridge, 0), (d_vietnam, m_beach, 1), (d_kerala, m_lake, 0);
  insert into public.destination_travel_tips (destination_id, title, body, sort_order) values
    (d_vietnam, '[Sample tip] Carry some cash', 'Sample tip text, to be written by the team.', 0),
    (d_vietnam, '[Sample tip] Pack light layers', 'Sample tip text, to be written by the team.', 1);

  -- ---------------------------------------------------------------- hotels (fictional)
  insert into public.hotels (name, slug, destination_id, description, is_sample) values
    ('Sample Hotel Hanoi', 'sample-hotel-hanoi', d_hanoi, 'Fictional sample hotel.', true) returning id into h_hanoi;
  insert into public.hotels (name, slug, destination_id, description, is_sample) values
    ('Sample Bay Cruise', 'sample-bay-cruise', d_halong, 'Fictional sample cruise.', true) returning id into h_cruise;
  insert into public.hotels (name, slug, destination_id, description, is_sample) values
    ('Sample Resort Hoi An', 'sample-resort-hoi-an', d_hoian, 'Fictional sample hotel.', true) returning id into h_hoian;
  insert into public.hotels (name, slug, destination_id, description, is_sample) values
    ('Sample Hotel Tokyo', 'sample-hotel-tokyo', d_tokyo, 'Fictional sample hotel.', true) returning id into h_tokyo;
  insert into public.hotels (name, slug, destination_id, description, is_sample) values
    ('Sample Tea Estate Resort', 'sample-tea-estate-resort', d_munnar, 'Fictional sample hotel.', true) returning id into h_munnar;
  insert into public.hotels (name, slug, destination_id, description, is_sample) values
    ('Sample Houseboat', 'sample-houseboat', d_alleppey, 'Fictional sample houseboat.', true) returning id into h_houseboat;

  -- ---------------------------------------------------------------- policies
  insert into public.policies (kind, title, body, is_default, status)
  values ('terms', '[Sample] Booking terms', doc_sample, true, 'published') returning id into pol_terms;
  insert into public.policies (kind, title, body, is_default, status)
  values ('cancellation', '[Sample] Cancellation policy', doc_sample, true, 'published') returning id into pol_cancel;

  -- ---------------------------------------------------------------- visa guides
  insert into public.visa_guides (destination_country_id, passport_country_id, title, slug, summary, content,
      important_notes, hero_media_id, status, is_sample)
  values (c_vn, c_in, 'Vietnam Visa for Indians', 'vietnam',
      '[Sample: the verified answer will be added from the official source]', doc_sample,
      '[Sample: important notes to be added once verified]', m_vietnam, 'published', true)
  returning id into g_vietnam;
  insert into public.visa_types (visa_guide_id, name, slug, purpose, status, sort_order)
  values (g_vietnam, 'Tourist Visa (sample)', 'tourist-visa', 'tourism', 'published', 0) returning id into vt;
  for i in 1..3 loop
    insert into public.visa_documents (visa_type_id, title, description, sort_order)
    values (vt, format('[Placeholder document %s]', i), 'To be replaced with verified information from the official source.', i);
    insert into public.visa_process_steps (visa_type_id, title, description, sort_order)
    values (vt, format('[Sample step %s]', i), 'The verified application step will be written here.', i);
  end loop;

  insert into public.visa_guides (destination_country_id, passport_country_id, title, slug, summary, content,
      important_notes, hero_media_id, status, is_sample)
  values (c_jp, c_in, 'Japan Visa for Indians', 'japan',
      '[Sample: the verified answer will be added from the official source]', doc_sample,
      '[Sample: important notes to be added once verified]', m_japan, 'published', true)
  returning id into g_japan;
  for i in 0..1 loop
    insert into public.visa_types (visa_guide_id, name, slug, purpose, description, eligibility, status, sort_order)
    values (g_japan,
      case i when 0 then 'Tourist Visa (sample)' else 'Business Visa (sample)' end,
      case i when 0 then 'tourist-visa' else 'business-visa' end,
      case i when 0 then 'tourism' else 'business' end::public.visa_purpose,
      '[Sample: who this visa is for and what it allows, once verified]',
      '[Sample: eligibility to be confirmed from the official source]', 'published', i)
    returning id into vt;
    for n in 1..4 loop
      insert into public.visa_documents (visa_type_id, title, description, sort_order)
      values (vt, format('[Placeholder document %s]', n), 'To be replaced with verified information from the official source.', n);
      insert into public.visa_process_steps (visa_type_id, title, description, sort_order)
      values (vt, format('[Sample step %s]', n), 'The verified application step will be written here.', n);
    end loop;
  end loop;

  -- ---------------------------------------------------------------- packages
  insert into public.packages (name, slug, primary_destination_id, duration_days, duration_nights, short_description,
      description, hero_media_id, terms_policy_id, cancellation_policy_id, is_featured, sort_order, status, is_sample)
  values ('Vietnam 7 Days / 6 Nights (sample)', 'vietnam-7-days-6-nights', d_vietnam, 7, 6,
      'Sample package: Hanoi, an overnight Ha Long Bay cruise and lantern-lit Hoi An.', doc_sample, m_vietnam,
      pol_terms, pol_cancel, true, 10, 'published', true)
  returning id into p_vietnam;
  insert into public.package_destinations (package_id, destination_id, nights, sort_order) values
    (p_vietnam, d_hanoi, 2, 1), (p_vietnam, d_halong, 1, 2), (p_vietnam, d_hoian, 3, 3)
  on conflict do nothing;
  insert into public.package_category_links (package_id, category_id)
    select p_vietnam, id from public.package_categories where slug in ('family', 'group', 'honeymoon');
  insert into public.package_highlights (package_id, title, icon, sort_order) values
    (p_vietnam, 'Overnight Ha Long Bay cruise', 'cruise', 0),
    (p_vietnam, 'Hanoi Old Quarter walk', null, 1),
    (p_vietnam, 'Lantern-lit Hoi An', null, 2);
  insert into public.package_media (package_id, media_id, sort_order) values (p_vietnam, m_bridge, 0), (p_vietnam, m_beach, 1);
  insert into public.package_hotels (package_id, hotel_id, nights, meal_plan, sort_order) values
    (p_vietnam, h_hanoi, 2, '[Sample]', 0), (p_vietnam, h_cruise, 1, null, 1), (p_vietnam, h_hoian, 3, null, 2);
  insert into public.package_inclusions (package_id, is_included, inclusion_type_id, title, sort_order)
  select p_vietnam, v.inc, t.id, v.title, v.ord
  from (values
    (true,  'hotels',      '[Sample inclusion] Accommodation as listed', 0),
    (true,  'transfers',   '[Sample inclusion] Airport transfers', 1),
    (true,  'meals',       '[Sample inclusion] Daily breakfast', 2),
    (true,  'sightseeing', '[Sample inclusion] Sightseeing as per itinerary', 3),
    (false, 'flights',     '[Sample exclusion] International flights', 0),
    (false, 'visa',        '[Sample exclusion] Visa fees', 1)
  ) as v(inc, code, title, ord)
  join public.inclusion_types t on t.code = v.code;

  insert into public.itinerary_days (package_id, day_number, title, description, breakfast, lunch, dinner,
      overnight_destination_id, hotel_id, accommodation_note, media_id)
  values
    (p_vietnam, 1, 'Arrival in Hanoi', 'Sample: airport transfer and a free evening in the Old Quarter.', false, false, true, d_hanoi, h_hanoi, null, m_departure),
    (p_vietnam, 2, 'Hanoi city tour', 'Sample: an old town walk in the morning and a museum visit after lunch.', true, false, false, d_hanoi, h_hanoi, null, null),
    (p_vietnam, 3, 'Ha Long Bay', 'Sample: drive to the coast and board an overnight cruise.', true, true, true, d_halong, h_cruise, null, m_vietnam),
    (p_vietnam, 4, 'Return to Hanoi, fly to Da Nang', 'Sample day description.', true, false, false, d_hoian, h_hoian, null, m_bridge),
    (p_vietnam, 5, 'Hoi An old town', 'Sample day description.', true, false, false, d_hoian, h_hoian, null, null),
    (p_vietnam, 6, 'At leisure in Hoi An', 'Sample day description.', true, false, false, d_hoian, h_hoian, null, m_beach),
    (p_vietnam, 7, 'Departure', 'Sample: transfer to the airport for your flight home.', true, false, false, null, null, 'Flight home', null);
  select id into day_id from public.itinerary_days where package_id = p_vietnam and day_number = 2;
  insert into public.itinerary_day_items (itinerary_day_id, kind, title, destination_id, sort_order) values
    (day_id, 'sightseeing', 'Old Quarter walk', d_hanoi, 0),
    (day_id, 'sightseeing', 'Museum visit', d_hanoi, 1);
  select id into day_id from public.itinerary_days where package_id = p_vietnam and day_number = 3;
  insert into public.itinerary_day_items (itinerary_day_id, kind, title, destination_id, sort_order) values
    (day_id, 'transfer', 'Drive to Ha Long Bay', null, 0),
    (day_id, 'activity', 'Kayaking among the islands', d_halong, 1);

  insert into public.packages (name, slug, primary_destination_id, duration_days, duration_nights, short_description,
      hero_media_id, terms_policy_id, cancellation_policy_id, is_featured, sort_order, status, is_sample)
  values ('Japan 5 Days / 4 Nights (sample)', 'japan-5-days-4-nights', d_japan, 5, 4,
      'Sample package: Tokyo and its surroundings.', m_tokyo, pol_terms, pol_cancel, true, 20, 'published', true)
  returning id into p_japan;
  insert into public.package_category_links (package_id, category_id)
    select p_japan, id from public.package_categories where slug in ('family', 'gen-z');
  insert into public.itinerary_days (package_id, day_number, title, overnight_destination_id, hotel_id, accommodation_note)
  values
    (p_japan, 1, 'Arrival in Tokyo', d_tokyo, h_tokyo, null),
    (p_japan, 2, 'Tokyo city tour', d_tokyo, h_tokyo, null),
    (p_japan, 3, 'Day trip from Tokyo', d_tokyo, h_tokyo, null),
    (p_japan, 4, 'At leisure', d_tokyo, h_tokyo, null),
    (p_japan, 5, 'Departure', null, null, 'Flight home');
  insert into public.package_hotels (package_id, hotel_id, nights) values (p_japan, h_tokyo, 4);

  insert into public.packages (name, slug, primary_destination_id, duration_days, duration_nights, short_description,
      hero_media_id, terms_policy_id, cancellation_policy_id, is_featured, sort_order, status, is_sample)
  values ('Kerala 5 Days / 4 Nights (sample)', 'kerala-5-days-4-nights', d_kerala, 5, 4,
      'Sample package: Munnar tea hills and a night on an Alleppey houseboat.', m_kerala, pol_terms, pol_cancel, true, 30, 'published', true)
  returning id into p_kerala;
  insert into public.package_destinations (package_id, destination_id, nights, sort_order) values
    (p_kerala, d_munnar, 3, 1), (p_kerala, d_alleppey, 1, 2) on conflict do nothing;
  insert into public.package_category_links (package_id, category_id)
    select p_kerala, id from public.package_categories where slug in ('family', 'honeymoon', 'senior-citizen', 'long-weekend');
  insert into public.itinerary_days (package_id, day_number, title, description, breakfast, overnight_destination_id, hotel_id, accommodation_note, media_id)
  values
    (p_kerala, 1, 'Arrive in Kochi, drive to Munnar', 'Sample day description.', false, d_munnar, h_munnar, null, m_lake),
    (p_kerala, 2, 'Munnar tea gardens', 'Sample day description.', true, d_munnar, h_munnar, null, null),
    (p_kerala, 3, 'At leisure in Munnar', 'Sample day description.', true, d_munnar, h_munnar, null, null),
    (p_kerala, 4, 'Alleppey houseboat', 'Sample day description.', true, d_alleppey, h_houseboat, null, m_kerala),
    (p_kerala, 5, 'Departure from Kochi', 'Sample day description.', true, null, null, 'Flight home', null);
  insert into public.package_hotels (package_id, hotel_id, nights, sort_order) values
    (p_kerala, h_munnar, 3, 0), (p_kerala, h_houseboat, 1, 1);

  -- ---------------------------------------------------------------- blog
  insert into public.authors (name, slug, bio, status, is_sample)
  values ('Yojo Holidays Team', 'yojo-holidays-team', 'Sample bio: the travel specialists who plan Yojo Holidays trips.', 'published', true)
  returning id into a_team;
  insert into public.blog_categories (name, slug, description, sort_order, status, is_sample)
  values ('Destination Guides', 'destination-guides', 'Where to go, when to go and what to see.', 10, 'published', true) returning id into bc_guides;
  insert into public.blog_categories (name, slug, description, sort_order, status, is_sample)
  values ('Visa Guides', 'visa-guides', 'Plain-language visa explainers for Indian travellers.', 20, 'published', true) returning id into bc_visa;
  insert into public.blog_categories (name, slug, description, sort_order, status, is_sample)
  values ('Travel Tips', 'travel-tips', 'Packing, money, apps and everything in between.', 30, 'published', true) returning id into bc_tips;

  insert into public.blog_posts (title, slug, excerpt, content, featured_media_id, author_id, category_id, reading_minutes, status, is_sample)
  values ('Best Time to Visit Vietnam (sample)', 'best-time-to-visit-vietnam',
    'Sample excerpt. The real guide will be written by the Yojo Holidays team.',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Sample article"}]},{"type":"paragraph","content":[{"type":"text","text":"This is development content. Replace it with the real guide from the admin dashboard."}]}]}',
    m_vietnam, a_team, bc_guides, 6, 'published', true)
  returning id into b_best;
  insert into public.blog_posts (title, slug, excerpt, content, featured_media_id, author_id, category_id, reading_minutes, status, is_sample)
  values ('Vietnam Visa for Indians: What to Know (sample)', 'vietnam-visa-for-indians',
    'Sample excerpt. No visa rules are stated here until they are verified.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No visa rules are stated here until they are verified."}]}]}',
    m_departure, a_team, bc_visa, 4, 'published', true)
  returning id into b_visa;
  insert into public.blog_post_destinations (post_id, destination_id) values (b_best, d_vietnam), (b_visa, d_vietnam);
  insert into public.blog_post_packages (post_id, package_id) values (b_best, p_vietnam);
  insert into public.tags (name, slug) values ('Vietnam', 'vietnam'), ('Visa', 'visa') on conflict do nothing;
  insert into public.blog_post_tags (post_id, tag_id)
    select b_best, id from public.tags where slug = 'vietnam'
    union all select b_visa, id from public.tags where slug in ('vietnam', 'visa');

  -- ---------------------------------------------------------------- pages
  insert into public.pages (slug, title, template, status, is_sample) values ('home', 'Home', 'home', 'published', true) returning id into pg_home;
  insert into public.pages (slug, title, template, status, is_sample) values ('visa', 'Visa Services', 'visa', 'published', true) returning id into pg_visa;
  insert into public.pages (slug, title, template, status, is_sample) values ('faq', 'Frequently Asked Questions', 'faq', 'published', true) returning id into pg_faq;

  -- ---------------------------------------------------------------- FAQs (written once, linked where they appear)
  i := 0;
  for f in
    with q(question, ord) as (values
      ('Can I change a package to suit my plans?', 0),
      ('Do you help with visa applications?', 1),
      ('How do I book a trip?', 2),
      ('What payment options are available?', 3))
    insert into public.faqs (question, answer, faq_group, status, is_sample)
    select question, '[Placeholder answer. The confirmed answer will be written by Yojo Holidays and managed from the admin dashboard.]', 'General', 'published', true
    from q order by ord
    returning id
  loop
    insert into public.faq_links (faq_id, page_id, sort_order) values (f, pg_home, i);
    insert into public.faq_links (faq_id, page_id, sort_order) values (f, pg_faq, i);
    i := i + 1;
  end loop;

  i := 0;
  for f in
    insert into public.faqs (question, answer, faq_group, status, is_sample)
    select q, '[Placeholder answer. The confirmed answer will be written by Yojo Holidays and managed from the admin dashboard.]', 'Visa', 'published', true
    from unnest(array['How early should I apply for a visa?', 'Can you help if my visa application is refused?']) as q
    returning id
  loop
    insert into public.faq_links (faq_id, page_id, sort_order) values (f, pg_visa, i);
    i := i + 1;
  end loop;

  insert into public.faqs (question, answer, status, is_sample)
  values ('Can this itinerary be customised?', '[Placeholder answer. The confirmed answer will be written by Yojo Holidays and managed from the admin dashboard.]', 'published', true)
  returning id into f;
  -- one FAQ, shown on all three packages (written once)
  insert into public.faq_links (faq_id, package_id, sort_order) values (f, p_vietnam, 0), (f, p_japan, 0), (f, p_kerala, 0);

  insert into public.faqs (question, answer, status, is_sample)
  values ('How many days do I need in Vietnam?', '[Placeholder answer. The confirmed answer will be written by Yojo Holidays and managed from the admin dashboard.]', 'published', true)
  returning id into f;
  insert into public.faq_links (faq_id, destination_id) values (f, d_vietnam);
  insert into public.faq_links (faq_id, blog_post_id) values (f, b_best);

  insert into public.faqs (question, answer, status, is_sample)
  values ('How long does the visa take to process?', '[Placeholder answer. The confirmed answer will be written by Yojo Holidays and managed from the admin dashboard.]', 'published', true)
  returning id into f;
  insert into public.faq_links (faq_id, visa_guide_id) values (f, g_vietnam), (f, g_japan);
end;
$$;

-- SEO override for the Vietnam destination (sample).
with s as (
  insert into public.seo_meta (seo_title, meta_description, noindex)
  values ('Vietnam Tour Packages (sample)', 'Sample SEO description for the Vietnam destination page.', true)
  returning id
)
update public.destinations set seo_meta_id = (select id from s) where slug = 'vietnam';

-- ---------------------------------------------------------------- structural pages (placeholders to fill in from the admin)
do $$
declare
  pg uuid;
  ph constant text := '[Placeholder: Yojo Holidays to provide this text from the admin dashboard.]';
  doc jsonb;
  h text;
  i int;
begin
  doc := jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
           jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', ph)))));

  if not exists (select 1 from public.pages where slug = 'about') then
    insert into public.pages (slug, title, template, status, is_sample) values ('about', 'About Yojo Holidays', 'default', 'published', true) returning id into pg;
    insert into public.page_sections (page_id, section_type, content, sort_order) values
      (pg, 'image_text', jsonb_build_object('eyebrow', 'Our story', 'heading', 'Who we are', 'body', doc), 0),
      (pg, 'rich_text',  jsonb_build_object('eyebrow', 'How we work', 'heading', 'Trips planned around you', 'body', doc), 1),
      (pg, 'destinations', jsonb_build_object('heading', 'Where we can take you'), 2),
      (pg, 'testimonials', '{}'::jsonb, 3),
      (pg, 'cta', jsonb_build_object('eyebrow', 'Plan your trip', 'heading', 'Tell us where you''d like to go.', 'button_label', 'Plan your trip', 'button_href', '/plan-your-trip/'), 4);
  end if;

  if not exists (select 1 from public.pages where slug = 'privacy-policy') then
    insert into public.pages (slug, title, template, status, is_sample) values ('privacy-policy', 'Privacy Policy', 'legal', 'published', true) returning id into pg;
    i := 0;
    foreach h in array array['Information we collect', 'How we use your information', 'Marketing, WhatsApp and your consent',
                             'Cookies and analytics', 'Sharing with partners', 'How long we keep data',
                             'Your rights (Digital Personal Data Protection Act, 2023)', 'Contact and grievance officer'] loop
      insert into public.page_sections (page_id, section_type, content, sort_order)
      values (pg, 'rich_text', jsonb_build_object('heading', h, 'body', doc), i);
      i := i + 1;
    end loop;
  end if;

  if not exists (select 1 from public.pages where slug = 'terms') then
    insert into public.pages (slug, title, template, status, is_sample) values ('terms', 'Terms & Conditions', 'legal', 'published', true) returning id into pg;
    i := 0;
    foreach h in array array['Bookings and confirmation', 'Prices, taxes (GST / TCS) and payments', 'Changes and cancellations',
                             'Passports, visas and travel insurance', 'Our responsibilities', 'Complaints'] loop
      insert into public.page_sections (page_id, section_type, content, sort_order)
      values (pg, 'rich_text', jsonb_build_object('heading', h, 'body', doc), i);
      i := i + 1;
    end loop;
  end if;
end;
$$;
