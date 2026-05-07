-- 202604290002_phase5_study_sync.sql
-- Phase 5: local-first study sync schema

CREATE TABLE IF NOT EXISTS user_card_states (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES user_deck_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  mastery_level INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  algorithm_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES user_deck_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ NOT NULL,
  previous_srs_state JSONB NOT NULL DEFAULT '{}',
  next_srs_state JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_card_states_user_updated
  ON user_card_states(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_card_states_deck_user
  ON user_card_states(deck_id, user_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_reviewed
  ON review_logs(user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_deck_user
  ON review_logs(deck_id, user_id, reviewed_at DESC);

ALTER TABLE user_card_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_card_states_owner_all ON user_card_states
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY review_logs_owner_all ON review_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_card_states_lww BEFORE UPDATE ON user_card_states
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();
