CREATE TABLE IF NOT EXISTS public.bundles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_text TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  cover_color TEXT NOT NULL DEFAULT '#EA580C',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.official_decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  card_count INTEGER NOT NULL DEFAULT 0 CHECK (card_count >= 0),
  accent_color TEXT NOT NULL DEFAULT '#EA580C',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bundle_items (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES public.official_decks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_bundles_published_updated
ON public.bundles(is_published, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_official_decks_published_updated
ON public.official_decks(is_published, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_position
ON public.bundle_items(bundle_id, position ASC);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.bundles TO anon, authenticated;
GRANT SELECT ON public.official_decks TO anon, authenticated;
GRANT SELECT ON public.bundle_items TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bundles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.official_decks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bundle_items FROM anon, authenticated;

DROP POLICY IF EXISTS "Published bundles are readable" ON public.bundles;
CREATE POLICY "Published bundles are readable"
ON public.bundles
FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Published official deck summaries are readable" ON public.official_decks;
CREATE POLICY "Published official deck summaries are readable"
ON public.official_decks
FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "Published bundle items are readable" ON public.bundle_items;
CREATE POLICY "Published bundle items are readable"
ON public.bundle_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bundles b
    WHERE b.id = bundle_items.bundle_id
      AND b.is_published = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.official_decks d
    WHERE d.id = bundle_items.deck_id
      AND d.is_published = true
  )
);
