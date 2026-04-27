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
  status        TEXT DEFAULT 'applied',
  applied_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job   ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_score ON applications(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_email   ON candidates(email);
