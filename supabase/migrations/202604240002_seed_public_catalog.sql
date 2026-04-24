INSERT INTO public.bundles (
  id,
  title,
  description,
  price_text,
  currency_code,
  cover_color,
  is_published,
  created_at,
  updated_at
)
VALUES
  (
    'bundle_exam_starter',
    'Exam Starter Pack',
    'Essential official vocabulary sets for first-pass exam preparation.',
    '$4.99',
    'USD',
    '#EA580C',
    true,
    now(),
    now()
  ),
  (
    'bundle_travel_plus',
    'Travel Plus Pack',
    'Practical official vocabulary for airports, hotels, transit, and dining.',
    '$3.99',
    'USD',
    '#0F766E',
    true,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  price_text = excluded.price_text,
  currency_code = excluded.currency_code,
  cover_color = excluded.cover_color,
  is_published = excluded.is_published,
  updated_at = now();

INSERT INTO public.official_decks (
  id,
  title,
  description,
  card_count,
  accent_color,
  is_published,
  created_at,
  updated_at
)
VALUES
  (
    'official_toeic_core_300',
    'TOEIC Core 300',
    'High-frequency vocabulary for TOEIC foundation study.',
    300,
    '#EA580C',
    true,
    now(),
    now()
  ),
  (
    'official_business_essentials_200',
    'Business Essentials 200',
    'Workplace vocabulary for meetings, calls, email, and scheduling.',
    200,
    '#1D4ED8',
    true,
    now(),
    now()
  ),
  (
    'official_travel_survival_150',
    'Travel Survival 150',
    'Travel vocabulary for common real-world situations.',
    150,
    '#0F766E',
    true,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  card_count = excluded.card_count,
  accent_color = excluded.accent_color,
  is_published = excluded.is_published,
  updated_at = now();

INSERT INTO public.bundle_items (
  id,
  bundle_id,
  deck_id,
  position,
  created_at,
  updated_at
)
VALUES
  (
    'bundle_item_exam_starter_toeic_core',
    'bundle_exam_starter',
    'official_toeic_core_300',
    0,
    now(),
    now()
  ),
  (
    'bundle_item_exam_starter_business_essentials',
    'bundle_exam_starter',
    'official_business_essentials_200',
    1,
    now(),
    now()
  ),
  (
    'bundle_item_travel_plus_survival',
    'bundle_travel_plus',
    'official_travel_survival_150',
    0,
    now(),
    now()
  )
ON CONFLICT (bundle_id, deck_id) DO UPDATE SET
  position = excluded.position,
  updated_at = now();
