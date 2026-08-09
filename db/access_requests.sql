-- db/access_requests.sql
-- Access requests raised from the public "Request access" screen.
-- Run once on an existing DB:  psql "$DATABASE_URL" -f db/access_requests.sql

CREATE TABLE IF NOT EXISTS access_requests (
  id         BIGSERIAL PRIMARY KEY,
  req_no     TEXT UNIQUE,                       -- e.g. REQ-001
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  problem    TEXT,
  status     TEXT NOT NULL DEFAULT 'New',       -- New | Declined | Handled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests (status);

-- Sample requests (matches the prototype). Safe to re-run.
INSERT INTO access_requests (req_no, name, email, phone, company, problem, status) VALUES
  ('REQ-001', 'Peter Kamau',   'p.kamau@symphony.co.ke',    '+254 722 145 880', 'Symphony Technologies Limited',
     'My phone number failed to verify — the SMS code never arrives on my line.', 'Declined'),
  ('REQ-002', 'Aisha Hassan',  'a.hassan@falconguard.co.ke','+254 733 902 411', 'Falcon Guard Ltd',
     'The email verification code never arrived, I have tried four times from the control room.', 'New'),
  ('REQ-003', 'Joseph Mwangi', 'j.mwangi@falconguard.co.ke','+254 711 640 220', 'Falcon Guard Ltd',
     'My company is not on the registration list, so I cannot finish signing up.', 'New')
ON CONFLICT (req_no) DO NOTHING;
