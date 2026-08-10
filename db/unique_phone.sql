-- db/unique_phone.sql
-- Enforce one account per phone number (email is already UNIQUE).
-- Normalizes by stripping spaces, and ignores blank phones.
-- Run once:  psql "$DATABASE_URL" -f db/unique_phone.sql
-- NOTE: if this fails, you have existing duplicate phone numbers to clean up first.

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON users (regexp_replace(phone, '\s+', '', 'g'))
  WHERE phone IS NOT NULL AND phone <> '';
