-- 202604280002_phase2_deck_sync.sql
-- Phase 2: user-content sync schema

CREATE TABLE IF NOT EXISTS user_decks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  accent_color TEXT NOT NULL DEFAULT '#0F766E',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  source_language TEXT NOT NULL DEFAULT 'en',
  target_language TEXT NOT NULL DEFAULT 'ko',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_decks_user_updated
  ON user_decks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_decks_user_deleted
  ON user_decks(user_id, deleted_at);

CREATE TABLE IF NOT EXISTS user_deck_cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  term TEXT NOT NULL,
  meaning TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  example TEXT,
  example_translation TEXT,
  note TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  synonyms TEXT,
  antonyms TEXT,
  related_expressions TEXT,
  source TEXT,
  position INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_deck_cards_user_updated
  ON user_deck_cards(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_deck_cards_deck_position
  ON user_deck_cards(deck_id, position ASC);

ALTER TABLE user_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_decks_owner_all ON user_decks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_deck_cards_owner_all ON user_deck_cards
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION reject_stale_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_decks_lww BEFORE UPDATE ON user_decks
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();
CREATE TRIGGER user_deck_cards_lww BEFORE UPDATE ON user_deck_cards
  FOR EACH ROW EXECUTE FUNCTION reject_stale_update();

CREATE OR REPLACE FUNCTION touch_parent_deck() RETURNS trigger AS $$
BEGIN
  UPDATE user_decks SET updated_at = NEW.updated_at
  WHERE id = NEW.deck_id AND updated_at < NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_deck_cards_touch_parent
  AFTER INSERT OR UPDATE ON user_deck_cards
  FOR EACH ROW EXECUTE FUNCTION touch_parent_deck();
