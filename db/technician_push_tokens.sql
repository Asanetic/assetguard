-- Firebase Cloud Messaging device tokens — TECHNICIAN APP ONLY.
-- ---------------------------------------------------------------------------
-- DELIBERATELY NOT `push_tokens`.
--
-- A `push_tokens` table already exists on this deployment, created by something
-- outside this codebase — nothing in app/api references it. Adding columns to a
-- table whose owner and writers are unknown is how you break a working system to
-- add a new one: `CREATE TABLE IF NOT EXISTS` silently skips, the columns never
-- appear, and the first clue is a query failing in production.
--
-- So the technician app gets its own table. The duplication is a few columns;
-- the alternative is a shared table two services can disagree about.
--
-- If you later confirm the existing table is safe to share, migrating is a
-- straight INSERT … SELECT — but do that deliberately, not by collision.
-- ---------------------------------------------------------------------------
-- One row per (user, device). A token identifies an APP INSTALL, not a person:
-- the same technician on a second handset gets a second row, and both should be
-- pushed to — they may have left one in the vehicle.
--
-- Tokens rotate. Firebase reissues them on reinstall, on restore-to-new-device,
-- and occasionally on its own, so the app re-registers on every launch and the
-- UNIQUE constraint upserts rather than duplicating. A token that has moved to a
-- different user is REASSIGNED, not duplicated — otherwise a shared handset
-- keeps pushing one technician's alarms to whoever logs in next.
--
-- Idempotent: safe to re-run.
--
--   psql "$DATABASE_URL" -f db/technician_push_tokens.sql

CREATE TABLE IF NOT EXISTS technician_push_tokens (
  id            BIGSERIAL PRIMARY KEY,
  user_id       TEXT        NOT NULL,          -- JWT sub
  token         TEXT        NOT NULL UNIQUE,   -- the FCM registration token
  platform      TEXT        NOT NULL DEFAULT 'android',
  app           TEXT        NOT NULL DEFAULT 'technician',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Set when Firebase tells us the token is dead (UNREGISTERED / INVALID).
  -- Kept rather than deleted so a token that comes back to life is one UPDATE,
  -- and so "why did this technician stop getting pushes" is answerable.
  disabled_at   TIMESTAMPTZ,
  disabled_why  TEXT
);

CREATE INDEX IF NOT EXISTS idx_tech_push_tokens_user
  ON technician_push_tokens (user_id) WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tech_push_tokens_seen
  ON technician_push_tokens (last_seen_at DESC);

-- ---------------------------------------------------------------------------
-- Cleanup: an earlier version of this file targeted `push_tokens` and, because
-- CREATE TABLE was skipped, left one index behind on the pre-existing table.
-- Harmless, but it is not ours. Dropping it is safe either way.
DROP INDEX IF EXISTS idx_push_tokens_seen;
