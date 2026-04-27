const router   = require('express').Router();
const multer   = require('multer');
const axios    = require('axios');
const pool     = require('../db/pg');
const auth     = require('../middleware/auth');
const upload   = multer({ dest: 'uploads/' });

// Upload resume + apply to job
router.post('/', auth, upload.single('resume'), async (req, res) => {
  try {
    const { name, email, phone, job_id } = req.body;
    const resumePath = req.file ? req.file.path : '';

    // Check if candidate exists
    let cand;
    const { rows: existing } = await pool.query(
      'SELECT * FROM candidates WHERE email=$1 AND company_id=$2',
      [email, req.user.company_id]
    );

    if (existing.length > 0) {
      // Update existing candidate
      const { rows: [updated] } = await pool.query(
        `UPDATE candidates SET name=$1, phone=$2, resume_path=$3 WHERE id=$4 RETURNING *`,
        [name, phone, resumePath, existing[0].id]
      );
      cand = updated;
    } else {
      // Insert new candidate
      const { rows: [inserted] } = await pool.query(
        `INSERT INTO candidates(company_id,name,email,phone,resume_path)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [req.user.company_id, name, email, phone, resumePath]
      );
      cand = inserted;
    }

    // Create application
    const { rows: [app] } = await pool.query(
      `INSERT INTO applications(job_id,candidate_id)
       VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id`,
      [job_id, cand.id]
    );

    if (app) {
      // Async AI analysis
      axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
        application_id: app.id,
        candidate_id:   cand.id,
        job_id,
        resume_path:    resumePath,
        company_id:     req.user.company_id,
      }).catch(err => console.error('AI analysis trigger failed:', err.message));
    }

    res.json({ candidate: cand, application_id: app?.id });
  } catch (e) {
    console.error('Candidate upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM candidates WHERE company_id=$1 ORDER BY created_at DESC`,
      [req.user.company_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

module.exports = router;
