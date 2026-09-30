-- db/company_contacts.sql
-- Phase 1 of the company-contacts move: every company can now carry its own
-- Manager + two Assistant Managers, so sites inherit them instead of typing
-- them per site. Shape: { manager:{name,phones[],emails[]}, assistant1:{…}, assistant2:{…} }.
-- Idempotent.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contacts JSONB NOT NULL DEFAULT '{}'::jsonb;
