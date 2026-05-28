CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  industry   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'recruiter',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  required_skills TEXT[],
  experience_min  INT DEFAULT 0,
  location        TEXT,
  status          TEXT DEFAULT 'open',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id),
  name         TEXT,
  email        TEXT,
  phone        TEXT,
  resume_path  TEXT,
  status       TEXT DEFAULT 'new',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  UUID REFERENCES candidates(id) ON DELETE CASCADE,
  ai_score      FLOAT DEFAULT 0,
  ai_summary    TEXT,
  ai_status     TEXT DEFAULT 'processing',
  status        TEXT DEFAULT 'New' CHECK (status IN ('New','Shortlisted','Interview','Rejected','Hired')),
  status_updated_at TIMESTAMPTZ,
  status_note   TEXT,
  applied_at    TIMESTAMPTZ DEFAULT NOW(),
  bias_flag     BOOLEAN DEFAULT FALSE,
  bias_reason   TEXT,
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job   ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_score ON applications(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email   ON candidates(email);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id             SERIAL PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  recruiter_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  rating         SMALLINT CHECK (rating IN (1, -1)),
  note           TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id, recruiter_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro')),
  seats INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  provider TEXT CHECK (provider IN ('greenhouse','lever')),
  webhook_secret TEXT NOT NULL,
  job_mapping JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_events (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT,
  last_used_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_log (
  id SERIAL PRIMARY KEY,
  candidate_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  consent_given BOOLEAN DEFAULT true,
  consent_type TEXT DEFAULT 'resume_processing',
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id SERIAL PRIMARY KEY,
  candidate_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','rejected'))
);

CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_note TEXT;

UPDATE applications
SET status = CASE
  WHEN status IN ('New','Shortlisted','Interview','Rejected','Hired') THEN status
  WHEN LOWER(COALESCE(status, '')) = 'shortlisted' THEN 'Shortlisted'
  WHEN LOWER(COALESCE(status, '')) = 'interview' THEN 'Interview'
  WHEN LOWER(COALESCE(status, '')) = 'rejected' THEN 'Rejected'
  WHEN LOWER(COALESCE(status, '')) IN ('hired','offer') THEN 'Hired'
  ELSE 'New'
END;

ALTER TABLE applications
  ALTER COLUMN status SET DEFAULT 'New';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_status_check'
  ) THEN
    ALTER TABLE applications
      ADD CONSTRAINT applications_status_check
      CHECK (status IN ('New','Shortlisted','Interview','Rejected','Hired'));
  END IF;
END $$;
