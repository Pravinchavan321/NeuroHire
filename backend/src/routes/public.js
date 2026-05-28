const router = require('express').Router();
const pool   = require('../db/pg');

// GET /api/public/jobs
router.get('/jobs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, location, created_at FROM jobs WHERE company_id = $1 ORDER BY created_at DESC',
      [req.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/public/candidates/:job_id
router.get('/candidates/:job_id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.name, a.ai_score, a.ai_status, a.applied_at 
       FROM applications a 
       JOIN candidates c ON a.candidate_id = c.id
       JOIN jobs j ON a.job_id = j.id
       WHERE a.job_id = $1 AND j.company_id = $2
       ORDER BY a.ai_score DESC NULLS LAST`,
      [req.params.job_id, req.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/public/analytics
router.get('/analytics', async (req, res) => {
  // We can just proxy to the internal analytics logic or a simplified version
  try {
    const { rows: [stats] } = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM jobs WHERE company_id = $1) as total_jobs,
        (SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = $1) as total_candidates`,
      [req.companyId]
    );
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
