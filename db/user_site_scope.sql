-- db/user_site_scope.sql
-- Per-user site visibility: a user's sites can be scoped either by REGION (the
-- existing users.regions behaviour) or by an explicit ASSIGNED LIST imported per
-- user. A global default decides which mode a user without an override uses.
--
-- Idempotent — safe to run more than once.

-- Per-user override of the visibility mode. NULL = inherit the global default.
--   'region' = scoped by users.regions (today's behaviour)
--   'list'   = scoped to the sites in user_sites for this user
ALTER TABLE users ADD COLUMN IF NOT EXISTS site_scope_mode TEXT;

-- Explicit user -> site assignments (used when the effective mode is 'list').
CREATE TABLE IF NOT EXISTS user_sites (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, site_id)
);
CREATE INDEX IF NOT EXISTS user_sites_user_idx ON user_sites (user_id);
CREATE INDEX IF NOT EXISTS user_sites_site_idx ON user_sites (site_id);

-- The global default lives in app_config under the 'siteScope' key
-- ({ "mode": "region" | "list" }); seeded to 'region' so nothing changes until
-- an admin flips it. INSERT only if absent.
INSERT INTO app_config (key, value)
VALUES ('siteScope', '{"mode":"region"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
