const router = require('express').Router();
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { title, description, required_skills, experience_min, location } = req.body;
  const { rows:[job] } = await pool.query(
    `INSERT INTO jobs(company_id,created_by,title,description,required_skills,experience_min,location)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.company_id, req.user.id, title, description, required_skills, experience_min, location]);
  res.json(job);
});

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT j.*, COUNT(a.id) as applicant_count
     FROM jobs j LEFT JOIN applications a ON j.id=a.job_id
     WHERE j.company_id=$1 GROUP BY j.id ORDER BY j.created_at DESC`,
    [req.user.company_id]);
  res.json(rows);
});

router.get('/:id/candidates', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, a.ai_score, a.status as app_status, a.id as application_id
     FROM applications a JOIN candidates c ON a.candidate_id=c.id
     WHERE a.job_id=$1 ORDER BY a.ai_score DESC`,
    [req.params.id]);
  res.json(rows);
});
module.exports = router;
