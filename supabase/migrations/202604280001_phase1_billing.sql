-- 202604280001_phase1_billing.sql
-- Phase 1: server-side billing schema

ALTER TABLE bundles ADD COLUMN IF NOT EXISTS play_product_id TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_play')),
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL UNIQUE,
  raw_response JSONB,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_user
  ON purchase_receipts(user_id);

ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
-- No policies = client cannot SELECT/INSERT/UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  bundle_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  UNIQUE (user_id, bundle_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_status
  ON entitlements(user_id, status);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY entitlements_select_own ON entitlements
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS bundles_public_read ON bundles
  FOR SELECT TO anon, authenticated
  USING (is_published = true);
