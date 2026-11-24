-- =============================================================================
-- Yojo Holidays - step 4 of 4: reference data (safe for production)
--
-- Structural rows every environment needs. Development sample content lives in
-- supabase/seed.sql and is flagged is_sample = true.
-- All inserts are idempotent (on conflict do nothing).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Regions
-- -----------------------------------------------------------------------------
insert into public.regions (name, slug, sort_order) values
  ('Asia',                    'asia',                   10),
  ('Middle East',             'middle-east',            20),
  ('Europe',                  'europe',                 30),
  ('Africa',                  'africa',                 40),
  ('North America',           'north-america',          50),
  ('South America',           'south-america',          60),
  ('Oceania',                 'oceania',                70)
on conflict (slug) do nothing;

insert into public.regions (name, slug, parent_id, sort_order)
select v.name, v.slug, p.id, v.sort_order
from (values
  ('South Asia',              'south-asia',             11),
  ('Southeast Asia',          'southeast-asia',         12),
  ('East Asia',               'east-asia',              13),
  ('Central Asia & Caucasus', 'central-asia-caucasus',  14)
) as v(name, slug, sort_order)
cross join (select id from public.regions where slug = 'asia') p
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Countries commonly visited by Indian travellers (staff can add more).
-- status stays 'draft': it controls only the optional country page.
-- -----------------------------------------------------------------------------
insert into public.countries (iso2, name, slug, region_id, currency_code, calling_code, demonym, languages)
select v.iso2, v.name, v.slug, r.id, v.currency, v.calling, v.demonym, string_to_array(v.langs, ',')
from (values
  -- South Asia
  ('IN', 'India',                'india',                'south-asia',            'INR', '+91',  'Indian',        'Hindi,English'),
  ('NP', 'Nepal',                'nepal',                'south-asia',            'NPR', '+977', 'Nepali',        'Nepali'),
  ('BT', 'Bhutan',               'bhutan',               'south-asia',            'BTN', '+975', 'Bhutanese',     'Dzongkha'),
  ('LK', 'Sri Lanka',            'sri-lanka',            'south-asia',            'LKR', '+94',  'Sri Lankan',    'Sinhala,Tamil'),
  ('MV', 'Maldives',             'maldives',             'south-asia',            'MVR', '+960', 'Maldivian',     'Dhivehi'),
  ('BD', 'Bangladesh',           'bangladesh',           'south-asia',            'BDT', '+880', 'Bangladeshi',   'Bengali'),
  -- Southeast Asia
  ('TH', 'Thailand',             'thailand',             'southeast-asia',        'THB', '+66',  'Thai',          'Thai'),
  ('VN', 'Vietnam',              'vietnam',              'southeast-asia',        'VND', '+84',  'Vietnamese',    'Vietnamese'),
  ('SG', 'Singapore',            'singapore',            'southeast-asia',        'SGD', '+65',  'Singaporean',   'English,Malay,Mandarin,Tamil'),
  ('MY', 'Malaysia',             'malaysia',             'southeast-asia',        'MYR', '+60',  'Malaysian',     'Malay'),
  ('ID', 'Indonesia',            'indonesia',            'southeast-asia',        'IDR', '+62',  'Indonesian',    'Indonesian'),
  ('PH', 'Philippines',          'philippines',          'southeast-asia',        'PHP', '+63',  'Filipino',      'Filipino,English'),
  ('KH', 'Cambodia',             'cambodia',             'southeast-asia',        'KHR', '+855', 'Cambodian',     'Khmer'),
  ('LA', 'Laos',                 'laos',                 'southeast-asia',        'LAK', '+856', 'Lao',           'Lao'),
  ('MM', 'Myanmar',              'myanmar',              'southeast-asia',        'MMK', '+95',  'Burmese',       'Burmese'),
  -- East Asia
  ('JP', 'Japan',                'japan',                'east-asia',             'JPY', '+81',  'Japanese',      'Japanese'),
  ('KR', 'South Korea',          'south-korea',          'east-asia',             'KRW', '+82',  'South Korean',  'Korean'),
  ('CN', 'China',                'china',                'east-asia',             'CNY', '+86',  'Chinese',       'Mandarin'),
  ('HK', 'Hong Kong',            'hong-kong',            'east-asia',             'HKD', '+852', 'Hongkonger',    'Cantonese,English'),
  ('MO', 'Macau',                'macau',                'east-asia',             'MOP', '+853', 'Macanese',      'Cantonese,Portuguese'),
  ('TW', 'Taiwan',               'taiwan',               'east-asia',             'TWD', '+886', 'Taiwanese',     'Mandarin'),
  ('MN', 'Mongolia',             'mongolia',             'east-asia',             'MNT', '+976', 'Mongolian',     'Mongolian'),
  -- Central Asia & Caucasus
  ('KZ', 'Kazakhstan',           'kazakhstan',           'central-asia-caucasus', 'KZT', '+7',   'Kazakh',        'Kazakh,Russian'),
  ('UZ', 'Uzbekistan',           'uzbekistan',           'central-asia-caucasus', 'UZS', '+998', 'Uzbek',         'Uzbek'),
  ('KG', 'Kyrgyzstan',           'kyrgyzstan',           'central-asia-caucasus', 'KGS', '+996', 'Kyrgyz',        'Kyrgyz,Russian'),
  ('AZ', 'Azerbaijan',           'azerbaijan',           'central-asia-caucasus', 'AZN', '+994', 'Azerbaijani',   'Azerbaijani'),
  ('GE', 'Georgia',              'georgia',              'central-asia-caucasus', 'GEL', '+995', 'Georgian',      'Georgian'),
  ('AM', 'Armenia',              'armenia',              'central-asia-caucasus', 'AMD', '+374', 'Armenian',      'Armenian'),
  -- Middle East
  ('AE', 'United Arab Emirates', 'united-arab-emirates', 'middle-east',           'AED', '+971', 'Emirati',       'Arabic'),
  ('OM', 'Oman',                 'oman',                 'middle-east',           'OMR', '+968', 'Omani',         'Arabic'),
  ('QA', 'Qatar',                'qatar',                'middle-east',           'QAR', '+974', 'Qatari',        'Arabic'),
  ('SA', 'Saudi Arabia',         'saudi-arabia',         'middle-east',           'SAR', '+966', 'Saudi',         'Arabic'),
  ('BH', 'Bahrain',              'bahrain',              'middle-east',           'BHD', '+973', 'Bahraini',      'Arabic'),
  ('JO', 'Jordan',               'jordan',               'middle-east',           'JOD', '+962', 'Jordanian',     'Arabic'),
  ('IL', 'Israel',               'israel',               'middle-east',           'ILS', '+972', 'Israeli',       'Hebrew'),
  ('TR', 'Turkey',               'turkey',               'middle-east',           'TRY', '+90',  'Turkish',       'Turkish'),
  -- Africa
  ('EG', 'Egypt',                'egypt',                'africa',                'EGP', '+20',  'Egyptian',      'Arabic'),
  ('MA', 'Morocco',              'morocco',              'africa',                'MAD', '+212', 'Moroccan',      'Arabic,French'),
  ('KE', 'Kenya',                'kenya',                'africa',                'KES', '+254', 'Kenyan',        'Swahili,English'),
  ('TZ', 'Tanzania',             'tanzania',             'africa',                'TZS', '+255', 'Tanzanian',     'Swahili,English'),
  ('ZA', 'South Africa',         'south-africa',         'africa',                'ZAR', '+27',  'South African', 'English,Zulu,Afrikaans'),
  ('MU', 'Mauritius',            'mauritius',            'africa',                'MUR', '+230', 'Mauritian',     'English,French'),
  ('SC', 'Seychelles',           'seychelles',           'africa',                'SCR', '+248', 'Seychellois',   'English,French'),
  -- Europe
  ('GB', 'United Kingdom',       'united-kingdom',       'europe',                'GBP', '+44',  'British',       'English'),
  ('FR', 'France',               'france',               'europe',                'EUR', '+33',  'French',        'French'),
  ('DE', 'Germany',              'germany',              'europe',                'EUR', '+49',  'German',        'German'),
  ('IT', 'Italy',                'italy',                'europe',                'EUR', '+39',  'Italian',       'Italian'),
  ('ES', 'Spain',                'spain',                'europe',                'EUR', '+34',  'Spanish',       'Spanish'),
  ('PT', 'Portugal',             'portugal',             'europe',                'EUR', '+351', 'Portuguese',    'Portuguese'),
  ('NL', 'Netherlands',          'netherlands',          'europe',                'EUR', '+31',  'Dutch',         'Dutch'),
  ('BE', 'Belgium',              'belgium',              'europe',                'EUR', '+32',  'Belgian',       'Dutch,French,German'),
  ('CH', 'Switzerland',          'switzerland',          'europe',                'CHF', '+41',  'Swiss',         'German,French,Italian'),
  ('AT', 'Austria',              'austria',              'europe',                'EUR', '+43',  'Austrian',      'German'),
  ('CZ', 'Czechia',              'czechia',              'europe',                'CZK', '+420', 'Czech',         'Czech'),
  ('HU', 'Hungary',              'hungary',              'europe',                'HUF', '+36',  'Hungarian',     'Hungarian'),
  ('GR', 'Greece',               'greece',               'europe',                'EUR', '+30',  'Greek',         'Greek'),
  ('HR', 'Croatia',              'croatia',              'europe',                'EUR', '+385', 'Croatian',      'Croatian'),
  ('IE', 'Ireland',              'ireland',              'europe',                'EUR', '+353', 'Irish',         'English,Irish'),
  ('IS', 'Iceland',              'iceland',              'europe',                'ISK', '+354', 'Icelandic',     'Icelandic'),
  ('NO', 'Norway',               'norway',               'europe',                'NOK', '+47',  'Norwegian',     'Norwegian'),
  ('SE', 'Sweden',               'sweden',               'europe',                'SEK', '+46',  'Swedish',       'Swedish'),
  ('DK', 'Denmark',              'denmark',              'europe',                'DKK', '+45',  'Danish',        'Danish'),
  ('FI', 'Finland',              'finland',              'europe',                'EUR', '+358', 'Finnish',       'Finnish,Swedish'),
  ('PL', 'Poland',               'poland',               'europe',                'PLN', '+48',  'Polish',        'Polish'),
  ('RU', 'Russia',               'russia',               'europe',                'RUB', '+7',   'Russian',       'Russian'),
  -- Americas
  ('US', 'United States',        'united-states',        'north-america',         'USD', '+1',   'American',      'English'),
  ('CA', 'Canada',               'canada',               'north-america',         'CAD', '+1',   'Canadian',      'English,French'),
  ('MX', 'Mexico',               'mexico',               'north-america',         'MXN', '+52',  'Mexican',       'Spanish'),
  ('BR', 'Brazil',               'brazil',               'south-america',         'BRL', '+55',  'Brazilian',     'Portuguese'),
  ('PE', 'Peru',                 'peru',                 'south-america',         'PEN', '+51',  'Peruvian',      'Spanish'),
  ('AR', 'Argentina',            'argentina',            'south-america',         'ARS', '+54',  'Argentine',     'Spanish'),
  -- Oceania
  ('AU', 'Australia',            'australia',            'oceania',               'AUD', '+61',  'Australian',    'English'),
  ('NZ', 'New Zealand',          'new-zealand',          'oceania',               'NZD', '+64',  'New Zealander', 'English,Maori'),
  ('FJ', 'Fiji',                 'fiji',                 'oceania',               'FJD', '+679', 'Fijian',        'English,Fijian')
) as v(iso2, name, slug, region, currency, calling, demonym, langs)
join public.regions r on r.slug = v.region
on conflict (iso2) do nothing;

-- -----------------------------------------------------------------------------
-- Package categories (travel styles). Published: they are site structure.
-- -----------------------------------------------------------------------------
insert into public.package_categories (name, slug, description, sort_order, status, published_at)
select v.name, v.slug, v.description, v.sort_order, 'published', now()
from (values
  ('Family Tours',         'family',         'Kid-friendly pacing, family rooms and sightseeing everyone enjoys.',              10),
  ('Honeymoon Packages',   'honeymoon',      'Romantic stays, private transfers and special touches for couples.',              20),
  ('Group Tours',          'group',          'Fixed-departure tours with a tour manager and like-minded travellers.',            30),
  ('Senior Citizen Tours', 'senior-citizen', 'Relaxed pace, comfortable hotels, minimal walking and assistance throughout.',     40),
  ('Women''s Tours',       'womens',         'Women-only departures with vetted stays and women tour leaders.',                 50),
  ('Long Weekend Trips',   'long-weekend',   'Short breaks that fit a long weekend, with easy flight times.',                   60),
  ('Gen Z Trips',          'gen-z',          'Social, budget-smart trips built around experiences, nightlife and content.',     70)
) as v(name, slug, description, sort_order)
where not exists (select 1 from public.package_categories c where c.slug = v.slug and c.deleted_at is null);

-- -----------------------------------------------------------------------------
-- Inclusion types
-- -----------------------------------------------------------------------------
insert into public.inclusion_types (code, label, icon, sort_order) values
  ('flights',          'Flights',          'plane',    10),
  ('hotels',           'Hotels',           'bed',      20),
  ('meals',            'Meals',            'utensils', 30),
  ('transfers',        'Transfers',        'car',      40),
  ('sightseeing',      'Sightseeing',      'camera',   50),
  ('visa',             'Visa',             'passport', 60),
  ('travel-insurance', 'Travel insurance', 'shield',   70),
  ('tour-manager',     'Tour manager',     'user',     80),
  ('other',            'Other',            'check',    90)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Sales pipeline
-- -----------------------------------------------------------------------------
insert into public.lead_stages (code, name, kind, sort_order, is_default) values
  ('new',          'New',          'open', 10, true),
  ('contacted',    'Contacted',    'open', 20, false),
  ('qualified',    'Qualified',    'open', 30, false),
  ('quote-sent',   'Quote sent',   'open', 40, false),
  ('negotiating',  'Negotiating',  'open', 50, false),
  ('booked',       'Booked',       'won',  60, false),
  ('lost',         'Lost',         'lost', 70, false),
  ('spam',         'Spam',         'spam', 80, false)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Marketing channels. The server maps UTMs / click ids / referrers to these
-- (see src/server/services/attribution.ts).
-- -----------------------------------------------------------------------------
insert into public.marketing_channels (code, name, sort_order) values
  ('google-ads',     'Google Ads',     10),
  ('meta-ads',       'Meta Ads',       20),
  ('organic-search', 'Organic Search', 30),
  ('instagram',      'Instagram',      40),
  ('facebook',       'Facebook',       50),
  ('youtube',        'YouTube',        60),
  ('whatsapp',       'WhatsApp',       70),
  ('email',          'Email',          80),
  ('referral',       'Referral',       90),
  ('direct',         'Direct',         100),
  ('other',          'Other',          110)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Site settings (single row). Contact details are filled in from the admin.
-- -----------------------------------------------------------------------------
insert into public.site_settings (company_name, default_meta_description)
values ('Yojo Holidays',
        'Handcrafted domestic and international holiday packages from India: honeymoons, family trips, group tours and visa assistance.')
on conflict (id) do nothing;
