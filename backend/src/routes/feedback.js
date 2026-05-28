const router = require('express').Router();
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { logAction } = require('../middleware/auditLogger');
const { body, param, validationResult } = require('express-validator');

// POST /api/feedback - Rate an AI analysis
router.post('/', 
  auth, 
  tenantGuard, 
  logAction('feedback_submitted', 'application', 'application_id'),
  [
  body('application_id').isUUID().withMessage('Invalid application ID'),
  body('rating').isIn([1, -1]).withMessage('Rating must be 1 (Up) or -1 (Down)'),
  body('note').optional().isString().isLength({ max: 200 }).withMessage('Note must be under 200 chars')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }

  const { application_id, rating, note } = req.body;

  try {
    // 1. Ownership check: verify application belongs to recruiter's company
    const { rows: app } = await pool.query(
      `SELECT j.company_id FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = $1 AND j.company_id = $2`,
      [application_id, req.companyId]
    );

    if (app.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden: Application context mismatch' });
    }

    // 2. Upsert feedback (one per recruiter per application)
    const { rows: [fb] } = await pool.query(
      `INSERT INTO ai_feedback (application_id, recruiter_id, rating, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (application_id, recruiter_id) 
       DO UPDATE SET rating = EXCLUDED.rating, note = EXCLUDED.note, created_at = NOW()
       RETURNING id`,
      [application_id, req.user.id, rating, note]
    );

    res.json({ success: true, data: { feedback_id: fb.id } });
  } catch (e) {
    console.error('Feedback submission error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/feedback/:application_id - Get feedback history for an application
router.get('/:application_id', auth, tenantGuard, [
  param('application_id').isUUID().withMessage('Invalid application ID')
], async (req, res) => {
  const { application_id } = req.params;

  try {
    // Ownership check
    const { rows: app } = await pool.query(
      `SELECT j.company_id FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = $1 AND j.company_id = $2`,
      [application_id, req.companyId]
    );

    if (app.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      `SELECT f.id, f.rating, f.note, f.created_at, u.email as recruiter_name 
       FROM ai_feedback f 
       JOIN users u ON f.recruiter_id = u.id 
       WHERE f.application_id = $1 
       ORDER BY f.created_at DESC`,
      [application_id]
    );

    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
