const router = require('express').Router();
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const checkPlanLimit = require('../middleware/planGuard');
const { body, validationResult } = require('express-validator');

router.post('/', 
  auth, 
  tenantGuard,
  checkPlanLimit('jobs', 3),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').isLength({ min: 20 }).withMessage('Description must be at least 20 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const { title, description, required_skills, experience_min, location } = req.body;
      const { rows:[job] } = await pool.query(
        `INSERT INTO jobs(company_id,created_by,title,description,required_skills,experience_min,location)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.companyId, req.user.id, title, description, required_skills, experience_min, location]);
      res.json({ success: true, data: job });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to create job' });
    }
});

router.get('/', auth, tenantGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, COUNT(a.id) as applicant_count
       FROM jobs j LEFT JOIN applications a ON j.id=a.job_id
       WHERE j.company_id=$1 GROUP BY j.id ORDER BY j.created_at DESC`,
      [req.companyId]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});

router.get('/:id/candidates', auth, tenantGuard, async (req, res) => {
  try {
    // Join with jobs table to ensure the job belongs to the company
    const { rows } = await pool.query(
      `SELECT c.*, a.ai_score, a.status as app_status, a.id as application_id
       FROM applications a 
       JOIN candidates c ON a.candidate_id=c.id
       JOIN jobs j ON a.job_id=j.id
       WHERE a.job_id=$1 AND j.company_id=$2 
       ORDER BY a.ai_score DESC`,
      [req.params.id, req.companyId]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch candidates' });
  }
});

module.exports = router;
