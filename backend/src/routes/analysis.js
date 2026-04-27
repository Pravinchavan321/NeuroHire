const router   = require('express').Router();
const Analysis = require('../models/Analysis');
const pool     = require('../db/pg');
const auth     = require('../middleware/auth');

// Get full AI analysis for one application
router.get('/:applicationId', auth, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      application_id: req.params.applicationId });
    res.json(analysis);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// Get ranked candidates for a job — query PG directly
router.get('/job/:jobId/rankings', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.name, c.email, a.ai_score, a.id as application_id, a.status
       FROM applications a JOIN candidates c ON a.candidate_id=c.id
       WHERE a.job_id=$1 ORDER BY a.ai_score DESC`,
      [req.params.jobId]);

    // Enrich with MongoDB analysis data
    const enriched = await Promise.all(rows.map(async (r) => {
      const analysis = await Analysis.findOne(
        { application_id: r.application_id },
        { _id: 0 }
      ).lean();
      return {
        application_id: r.application_id,
        name:           r.name,
        email:          r.email,
        overall_score:  r.ai_score || 0,
        status:         r.status,
        analysis:       analysis || null,
      };
    }));

    res.json(enriched);
  } catch (e) {
    console.error('Rankings error:', e);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Update application status
router.patch('/:applicationId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(
      'UPDATE applications SET status=$1 WHERE id=$2',
      [status, req.params.applicationId]);
    res.json({ updated: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
