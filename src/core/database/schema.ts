export const APP_META_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);
`;

export const LOCAL_DECKS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_decks (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'user')),
  accent_color TEXT NOT NULL DEFAULT '#0F766E',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  sync_state TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('failed', 'pending', 'synced')),
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const LOCAL_DECK_CARDS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_deck_cards (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  term TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  note TEXT,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(deck_id) REFERENCES local_decks(id) ON DELETE CASCADE
);
`;

export const LOCAL_USER_CARD_STATES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_user_card_states (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  last_reviewed_at TEXT,
  sync_state TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('failed', 'pending', 'synced')),
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(card_id, user_id),
  FOREIGN KEY(deck_id) REFERENCES local_decks(id) ON DELETE CASCADE,
  FOREIGN KEY(card_id) REFERENCES local_deck_cards(id) ON DELETE CASCADE
);
`;

export const LOCAL_REVIEW_LOGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS local_review_logs (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  reviewed_at TEXT NOT NULL,
  sync_state TEXT NOT NULL DEFAULT 'pending' CHECK (sync_state IN ('failed', 'pending', 'synced')),
  synced_at TEXT,
  FOREIGN KEY(deck_id) REFERENCES local_decks(id) ON DELETE CASCADE,
  FOREIGN KEY(card_id) REFERENCES local_deck_cards(id) ON DELETE CASCADE
);
`;

export const CATALOG_DECK_SUMMARIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS catalog_deck_summaries (
  deck_id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  accent_color TEXT NOT NULL DEFAULT '#EA580C',
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
`;

export const PENDING_SYNC_OPERATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS pending_sync_operations (
  id TEXT PRIMARY KEY NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('deck', 'entitlement', 'review_log', 'user_card_state')),
  entity_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('delete', 'upsert')),
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('failed', 'pending', 'processing')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CACHED_ENTITLEMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS cached_entitlements (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  synced_at TEXT,
  cache_updated_at TEXT NOT NULL,
  raw_payload TEXT
);
`;

export const BUNDLES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_text TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  cover_color TEXT NOT NULL DEFAULT '#EA580C',
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const BUNDLE_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS bundle_items (
  id TEXT PRIMARY KEY NOT NULL,
  bundle_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY(bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
  FOREIGN KEY(deck_id) REFERENCES local_decks(id) ON DELETE CASCADE
);
`;

export const DATABASE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_local_decks_owner_updated
ON local_decks(owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_local_deck_cards_deck_position
ON local_deck_cards(deck_id, position ASC);

CREATE INDEX IF NOT EXISTS idx_local_user_card_states_deck_user
ON local_user_card_states(deck_id, user_id);

CREATE INDEX IF NOT EXISTS idx_local_review_logs_deck_user
ON local_review_logs(deck_id, user_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_sync_operations_status
ON pending_sync_operations(status, available_at ASC);

CREATE INDEX IF NOT EXISTS idx_pending_sync_operations_entity
ON pending_sync_operations(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_cached_entitlements_user_status
ON cached_entitlements(user_id, status);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id
ON bundle_items(bundle_id);

CREATE INDEX IF NOT EXISTS idx_catalog_deck_summaries_published
ON catalog_deck_summaries(is_published, updated_at DESC);
`;

export const LOCAL_DATABASE_SCHEMA_SQL = [
  APP_META_TABLE_SQL,
  LOCAL_DECKS_TABLE_SQL,
  LOCAL_DECK_CARDS_TABLE_SQL,
  LOCAL_USER_CARD_STATES_TABLE_SQL,
  LOCAL_REVIEW_LOGS_TABLE_SQL,
  CATALOG_DECK_SUMMARIES_TABLE_SQL,
  PENDING_SYNC_OPERATIONS_TABLE_SQL,
  CACHED_ENTITLEMENTS_TABLE_SQL,
  BUNDLES_TABLE_SQL,
  BUNDLE_ITEMS_TABLE_SQL,
  DATABASE_INDEXES_SQL,
].join("\n");
