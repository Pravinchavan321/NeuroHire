const router   = require('express').Router();
const Analysis = require('../models/Analysis');
const pool     = require('../db/pg');
const auth     = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { logAction } = require('../middleware/auditLogger');

// Get full AI analysis for one application
router.get('/:applicationId', auth, tenantGuard, async (req, res) => {
  try {
    // 1. Verify ownership in PG first
    const { rows } = await pool.query(
      `SELECT j.company_id FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = $1 AND j.company_id = $2`,
      [req.params.applicationId, req.companyId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const analysis = await Analysis.findOne({
      application_id: req.params.applicationId });
    res.json({ success: true, data: analysis });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get ranked candidates for a job — PRP-003: Enhanced ranking data
router.get('/job/:jobId/candidates', 
  auth, 
  tenantGuard, 
  logAction('candidates_viewed', 'job', 'jobId'),
  async (req, res) => {
  try {
    // 1. Check if job exists and belongs to company
    const { rows: jobRows } = await pool.query(
      'SELECT company_id FROM jobs WHERE id = $1 AND company_id = $2', 
      [req.params.jobId, req.companyId]
    );

    if (jobRows.length === 0) {
      // Empty array instead of 403 as per requirement "Return empty array when query returns zero results due to tenant filtering"
      // However, if the jobId was provided but belongs elsewhere, it's an "explicit cross-tenant access attempt"
      // Wait, the requirement says "403 only for explicit cross-tenant access attempts".
      // If jobId belongs to Company B and Company A requests it, that's an explicit attempt.
      
      // Let's check if the job exists at all
      const { rows: existsAtAll } = await pool.query('SELECT id FROM jobs WHERE id = $1', [req.params.jobId]);
      if (existsAtAll.length > 0) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      return res.json({ success: true, data: [] });
    }

    // 2. Fetch candidates for this job
    const { rows } = await pool.query(
      `SELECT c.id as candidate_id, c.name, a.ai_score, a.id as application_id, a.ai_status, a.bias_flag, a.bias_reason
       FROM applications a 
       JOIN candidates c ON a.candidate_id=c.id
       WHERE a.job_id=$1 ORDER BY a.ai_score DESC NULLS LAST`,
      [req.params.jobId]);

    // 3. Enrich with MongoDB analysis data
    const enriched = await Promise.all(rows.map(async (r) => {
      const analysis = await Analysis.findOne(
        { application_id: r.application_id },
        { _id: 0 }
      ).lean();

      return {
        candidate_id:      r.candidate_id,
        application_id:    r.application_id, 
        name:              r.name,
        ai_score:          r.ai_score,
        skill_overlap_pct: analysis?.skill_overlap?.overlap_pct ?? analysis?.skill_overlap?.match_score ?? 0,
        exp_score:         analysis?.experience_match?.score || 0,
        summary:           analysis?.llm_summary || '',
        interview_questions: analysis?.llm_questions || [],
        ai_status:         r.ai_status,
        bias_flag:         r.bias_flag,
        bias_reason:       r.bias_reason,
        score_breakdown:   analysis?.score_breakdown || null
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update application status
router.patch('/:applicationId/status', auth, tenantGuard, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Verify ownership via join
    const { rowCount } = await pool.query(
      `UPDATE applications a SET status=$1 
       FROM jobs j 
       WHERE a.job_id = j.id AND a.id=$2 AND j.company_id=$3`,
      [status, req.params.applicationId, req.companyId]);
      
    if (rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({ success: true, data: { updated: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Log CSV Export action (client-side export)
router.post('/log-export', auth, tenantGuard, logAction('csv_exported', 'job', null), (req, res) => {
  res.json({ success: true });
});

module.exports = router;
