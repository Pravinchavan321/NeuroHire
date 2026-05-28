const router = require('express').Router();
const pool = require('../db/pg');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { sendStatusChangeEmail } = require('../services/emailService');

const STATUSES = ['New', 'Shortlisted', 'Interview', 'Rejected', 'Hired'];
const emptyPipeline = () => STATUSES.reduce((acc, status) => ({ ...acc, [status]: [] }), {});

const normalizeStatus = (status) => {
  if (STATUSES.includes(status)) return status;
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'shortlisted') return 'Shortlisted';
  if (normalized === 'interview') return 'Interview';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'hired' || normalized === 'offer') return 'Hired';
  return 'New';
};

router.patch('/applications/:applicationId/status', auth, tenantGuard, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { rows } = await pool.query(
      `UPDATE applications a
       SET status = $1, status_updated_at = NOW(), status_note = COALESCE($2, status_note)
       FROM jobs j
       WHERE a.job_id = j.id AND a.id = $3 AND j.company_id = $4
       RETURNING a.id AS application_id, a.job_id, a.candidate_id, a.status,
                 a.status_updated_at, a.status_note, a.ai_score, a.ai_status`,
      [status, note ?? null, req.params.applicationId, req.companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const updated = rows[0];
    try {
      const { rows: emailRows } = await pool.query(
        `SELECT c.name AS candidate_name, c.email AS candidate_email, j.title AS job_title
         FROM applications a
         JOIN candidates c ON a.candidate_id = c.id
         JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1 AND j.company_id = $2`,
        [updated.application_id, req.companyId]
      );
      if (emailRows[0]) {
        await sendStatusChangeEmail({
          candidateName: emailRows[0].candidate_name,
          candidateEmail: emailRows[0].candidate_email,
          jobTitle: emailRows[0].job_title,
          newStatus: updated.status,
          recruiterNote: updated.status_note
        });
      }
    } catch (emailError) {
      console.warn('Status change email failed:', emailError.message);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Application status update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs/:jobId/pipeline', auth, tenantGuard, async (req, res) => {
  try {
    const { rows: jobRows } = await pool.query(
      'SELECT id, title FROM jobs WHERE id = $1 AND company_id = $2',
      [req.params.jobId, req.companyId]
    );

    if (jobRows.length === 0) {
      const { rows: exists } = await pool.query('SELECT id FROM jobs WHERE id = $1', [req.params.jobId]);
      if (exists.length > 0) return res.status(403).json({ success: false, error: 'Forbidden' });
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const { rows } = await pool.query(
      `SELECT a.id AS application_id, a.status, a.status_updated_at, a.status_note,
              a.ai_score, a.ai_status, c.id AS candidate_id, c.name, c.email,
              j.id AS job_id, j.title AS job_title
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       JOIN jobs j ON a.job_id = j.id
       WHERE a.job_id = $1 AND j.company_id = $2
       ORDER BY a.status_updated_at DESC NULLS LAST, a.applied_at DESC`,
      [req.params.jobId, req.companyId]
    );

    const pipeline = emptyPipeline();
    rows.forEach((row) => {
      const status = normalizeStatus(row.status);
      pipeline[status].push({
        applicationId: row.application_id,
        candidateId: row.candidate_id,
        name: row.name,
        email: row.email,
        jobId: row.job_id,
        jobTitle: row.job_title,
        score: row.ai_score,
        aiStatus: row.ai_status,
        status,
        statusUpdatedAt: row.status_updated_at,
        statusNote: row.status_note
      });
    });

    res.json({ success: true, data: { job: jobRows[0], pipeline } });
  } catch (error) {
    console.error('Pipeline fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
