-- Additive registry intelligence. Run explicitly for persistent environments.
CREATE TABLE IF NOT EXISTS uixo_v2_candidate_work (
  scout_id TEXT PRIMARY KEY REFERENCES uixo_v2_scout(id) ON DELETE CASCADE,
  provider_id TEXT REFERENCES uixo_v2_providers(id),
  disposition TEXT NOT NULL DEFAULT 'open' CHECK(disposition IN ('open','rejected')),
  revision INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, mutation_token TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS uixo_v2_candidate_jobs (
  scout_id TEXT NOT NULL REFERENCES uixo_v2_scout(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES uixo_v2_jobs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, PRIMARY KEY(scout_id,job_id)
);
CREATE TABLE IF NOT EXISTS uixo_v2_job_revisions (
  job_id TEXT NOT NULL REFERENCES uixo_v2_jobs(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES uixo_v2_revisions(id) ON DELETE CASCADE,
  PRIMARY KEY(job_id,revision_id)
);
CREATE TABLE IF NOT EXISTS uixo_v2_scout_deliveries (
  id TEXT PRIMARY KEY, repository TEXT NOT NULL, issue_number INTEGER NOT NULL,
  body_hash TEXT NOT NULL, scout_id TEXT NOT NULL REFERENCES uixo_v2_scout(id),
  payload TEXT NOT NULL, received_at TEXT NOT NULL,
  UNIQUE(repository,issue_number,body_hash)
);
CREATE TABLE IF NOT EXISTS uixo_v2_collections (
  slug TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
  published_payload TEXT, published_revision INTEGER,
  updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, mutation_token TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS uixo_v2_collection_items (
  collection_slug TEXT NOT NULL REFERENCES uixo_v2_collections(slug) ON DELETE CASCADE,
  position INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('asset','provider')),
  target_id TEXT NOT NULL, note TEXT NOT NULL,
  PRIMARY KEY(collection_slug,position), UNIQUE(collection_slug,kind,target_id)
);
CREATE INDEX IF NOT EXISTS uixo_v2_candidate_job_lookup ON uixo_v2_candidate_jobs(job_id,scout_id);
CREATE INDEX IF NOT EXISTS uixo_v2_job_revision_lookup ON uixo_v2_job_revisions(revision_id,job_id);
CREATE INDEX IF NOT EXISTS uixo_v2_scout_delivery_issue ON uixo_v2_scout_deliveries(repository,issue_number);
CREATE TABLE IF NOT EXISTS uixo_v2_github_issues (
  repository TEXT NOT NULL, issue_number INTEGER NOT NULL,
  scout_id TEXT NOT NULL REFERENCES uixo_v2_scout(id),
  PRIMARY KEY(repository,issue_number)
);
