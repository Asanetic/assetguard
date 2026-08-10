-- db/verification.sql
-- Adds the OTP table WITHOUT touching existing data.
-- Run once on an already-seeded database:
--   psql "$DATABASE_URL" -f db/verification.sql

CREATE TABLE IF NOT EXISTS verification_codes (
  id         BIGSERIAL PRIMARY KEY,
  channel    TEXT NOT NULL,               -- 'email' | 'phone'
  target     TEXT NOT NULL,               -- normalized email or phone
  code       TEXT NOT NULL,               -- 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,
  consumed   BOOLEAN NOT NULL DEFAULT false,
  attempts   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vcodes_lookup
  ON verification_codes (channel, target, consumed);
