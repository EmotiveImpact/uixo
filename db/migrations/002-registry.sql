-- UIXO v2: additive, isolated namespace. All timestamps are UTC ISO-8601 text.
-- Run against UIXO_DATABASE_URL, never implicitly against the editorial database.
CREATE TABLE IF NOT EXISTS uixo_v2_providers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, approved INTEGER NOT NULL CHECK (approved IN (0,1)), payload TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_licences (
  id TEXT PRIMARY KEY, expression TEXT NOT NULL, commercial TEXT NOT NULL, redistribution TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_assets (
  id TEXT PRIMARY KEY, provider_id TEXT NOT NULL REFERENCES uixo_v2_providers(id), slug TEXT NOT NULL,
  name TEXT NOT NULL, kind TEXT NOT NULL, price TEXT NOT NULL, source_url TEXT NOT NULL,
  licence_id TEXT NOT NULL REFERENCES uixo_v2_licences(id), search_text TEXT NOT NULL, payload TEXT NOT NULL,
  fingerprint TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, editorial_pick INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL, UNIQUE(provider_id,slug)
);
CREATE TABLE IF NOT EXISTS uixo_v2_variants (
  id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES uixo_v2_assets(id) ON DELETE CASCADE,
  framework TEXT NOT NULL, format TEXT NOT NULL, acquisition TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_evidence (
  id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES uixo_v2_assets(id) ON DELETE CASCADE, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_previews (
  asset_id TEXT PRIMARY KEY REFERENCES uixo_v2_assets(id) ON DELETE CASCADE, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_revisions (
  id TEXT PRIMARY KEY, provider_id TEXT NOT NULL REFERENCES uixo_v2_providers(id), asset_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  reason TEXT NOT NULL DEFAULT '', reviewer TEXT, created_at TEXT NOT NULL, reviewed_at TEXT,
  UNIQUE(asset_id,fingerprint)
);
CREATE TABLE IF NOT EXISTS uixo_v2_jobs (
  id TEXT PRIMARY KEY, provider_id TEXT NOT NULL REFERENCES uixo_v2_providers(id), status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, lease_until TEXT, lease_owner TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, stats TEXT NOT NULL DEFAULT '{}', error TEXT
);
CREATE TABLE IF NOT EXISTS uixo_v2_scout (
  id TEXT PRIMARY KEY, canonical_url TEXT UNIQUE NOT NULL, payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_audit (
  id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_rate_limits (
  bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS uixo_v2_assets_provider ON uixo_v2_assets(provider_id,id);
CREATE INDEX IF NOT EXISTS uixo_v2_assets_kind ON uixo_v2_assets(kind,price,id);
CREATE INDEX IF NOT EXISTS uixo_v2_variants_filter ON uixo_v2_variants(framework,format,asset_id);
CREATE INDEX IF NOT EXISTS uixo_v2_revisions_queue ON uixo_v2_revisions(status,created_at,id);
CREATE INDEX IF NOT EXISTS uixo_v2_jobs_queue ON uixo_v2_jobs(status,lease_until,created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uixo_v2_active_job ON uixo_v2_jobs(provider_id) WHERE status IN ('queued','running','retry');
