-- db/sites_control.sql
-- Site monitoring controls (Group sites batch ops).
--   armed       : is the site actively monitored? Disarm suppresses alarm paging.
--   mute_until   : while > now(), the site's alarms are downgraded to Low (no
--                 critical paging). NULL / past = not muted.
-- Idempotent: safe to run more than once.

ALTER TABLE sites ADD COLUMN IF NOT EXISTS armed      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS mute_until TIMESTAMPTZ;

-- Handy for the sweep that clears expired mutes / recomputes status.
CREATE INDEX IF NOT EXISTS idx_sites_mute_until ON sites (mute_until) WHERE mute_until IS NOT NULL;
