-- Safe, additive account-save migration for an existing UIXO database.
ALTER TABLE user_lists
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_asset_saves (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
