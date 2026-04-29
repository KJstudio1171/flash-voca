-- 202604290001_phase4_subscriptions.sql
-- Phase 4: subscription support extension

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'one_time'
    CHECK (kind IN ('one_time', 'subscription'));

ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS auto_renewing BOOLEAN NOT NULL DEFAULT false;

-- Expand status check to include subscription states
ALTER TABLE entitlements
  DROP CONSTRAINT IF EXISTS entitlements_status_check;

ALTER TABLE entitlements
  ADD CONSTRAINT entitlements_status_check
    CHECK (status IN ('active', 'in_grace', 'on_hold', 'paused', 'cancelled', 'expired', 'revoked'));

CREATE OR REPLACE FUNCTION user_has_active_pro(uid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM entitlements
    WHERE user_id = uid
      AND bundle_id = 'pro'
      AND status IN ('active', 'in_grace', 'cancelled')
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
