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
