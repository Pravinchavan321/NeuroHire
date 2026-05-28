const router   = require('express').Router();
const multer   = require('multer');
const axios    = require('axios');
const fs       = require('fs');
const path     = require('path');
const pool     = require('../db/pg');
const auth     = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const checkPlanLimit = require('../middleware/planGuard');
const { logAction } = require('../middleware/auditLogger');
const { param, validationResult } = require('express-validator');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are accepted'), false);
    }
  }
});

// Wrapper to handle multer errors gracefully
const uploadMiddleware = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, error: 'Payload Too Large: Max 10MB' });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(415).json({ success: false, error: err.message });
    }
    next();
  });
};

// Upload resume + apply to job
router.post('/', 
  auth, 
  tenantGuard, 
  checkPlanLimit('candidates', 10), 
  uploadMiddleware, 
  logAction('resume_uploaded', 'candidate', null),
  async (req, res) => {
  try {
    const { name, email, phone, job_id } = req.body;
    const resumePath = req.file ? req.file.path : '';
    
    if (!resumePath) {
      return res.status(400).json({ success: false, error: 'Resume file is required' });
    }

    // Verify job belongs to company
    const { rows: jobRows } = await pool.query(
      'SELECT id FROM jobs WHERE id=$1 AND company_id=$2',
      [job_id, req.companyId]
    );
    if (jobRows.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden: Job context mismatch' });
    }

    // Check if candidate exists for this company
    let cand;
    const { rows: existing } = await pool.query(
      'SELECT * FROM candidates WHERE email=$1 AND company_id=$2',
      [email, req.companyId]
    );

    if (existing.length > 0) {
      // Update existing candidate
      const { rows: [updated] } = await pool.query(
        `UPDATE candidates SET name=$1, phone=$2, resume_path=$3 WHERE id=$4 AND company_id=$5 RETURNING *`,
        [name, phone, resumePath, existing[0].id, req.companyId]
      );
      cand = updated;
    } else {
      // Insert new candidate
      const { rows: [inserted] } = await pool.query(
        `INSERT INTO candidates(company_id,name,email,phone,resume_path)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [req.companyId, name, email, phone, resumePath]
      );
      cand = inserted;
    }

    // GDPR Consent Logging
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await pool.query(
      `INSERT INTO consent_log (candidate_email, company_id, ip_address)
       VALUES ($1, $2, $3)`,
      [email, req.companyId, ip]
    );

    // Create application
    const { rows: [app] } = await pool.query(
      `INSERT INTO applications(job_id,candidate_id,ai_status)
       VALUES($1,$2,$3)
       ON CONFLICT (job_id, candidate_id) DO UPDATE SET
       ai_status = EXCLUDED.ai_status,
       ai_score = NULL,
       ai_summary = NULL,
       bias_flag = FALSE,
       bias_reason = NULL
       RETURNING id`,
      [job_id, cand.id, 'processing']
    );

    // Async AI analysis
    axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
      application_id: app.id,
      candidate_id:   cand.id,
      job_id,
      resume_path:    resumePath,
      company_id:     req.companyId,
    }).catch(err => console.error('AI analysis trigger failed:', err.message));

    res.json({ success: true, data: { candidate: cand, application_id: app.id } });
  } catch (e) {
    console.error('Candidate upload error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/candidates/status/:application_id
router.get('/status/:id', 
  auth, 
  tenantGuard,
  [param('id').isUUID().withMessage('Invalid application ID format')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      const { rows } = await pool.query(
        `SELECT a.id, a.ai_status as status, a.ai_score, a.applied_at as updated_at
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1 AND j.company_id = $2`,
        [req.params.id, req.companyId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      res.json({
        success: true,
        data: {
          application_id: rows[0].id,
          status:         rows[0].status,
          ai_score:       rows[0].status === 'complete' ? rows[0].ai_score : null,
          updated_at:     rows[0].updated_at
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/:candidate_id/reanalyze', 
  auth, 
  tenantGuard,
  logAction('reanalysis_triggered', 'candidate', 'candidate_id'),
  [param('candidate_id').isUUID().withMessage('Invalid candidate ID format')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      // 1. Fetch candidate and application within company scope
      const { rows: [cand] } = await pool.query(
        'SELECT * FROM candidates WHERE id = $1 AND company_id = $2', 
        [req.params.candidate_id, req.companyId]
      );

      if (!cand) {
        return res.status(404).json({ success: false, error: 'Candidate not found' });
      }

      const { rows: [app] } = await pool.query(
        `SELECT a.* FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE a.candidate_id = $1 AND j.company_id = $2`, 
        [cand.id, req.companyId]
      );

      if (!app) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      if (app.ai_status === 'processing') {
        return res.status(409).json({ success: false, error: 'Analysis already in progress' });
      }

      // 2. Check resume file exists
      if (!cand.resume_path || !fs.existsSync(path.resolve(cand.resume_path))) {
        return res.status(404).json({ success: false, error: 'Resume file not found' });
      }

      // 3. Reset status and trigger AI
      await pool.query(
        'UPDATE applications SET ai_status = $1, ai_score = NULL WHERE id = $2',
        ['processing', app.id]
      );

      axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
        application_id: app.id,
        candidate_id:   cand.id,
        job_id:         app.job_id,
        resume_path:    cand.resume_path,
        company_id:     req.companyId,
      }).catch(err => console.error('Re-analysis trigger failed:', err.message));

      res.json({ 
        success: true, 
        data: { message: "Re-analysis started", application_id: app.id } 
      });
    } catch (e) {
      console.error('Re-analysis error:', e);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/:id/similar', 
  auth,
  tenantGuard,
  [param('id').isUUID().withMessage('Invalid application ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    try {
      // 1. Verify application ownership
      const { rows } = await pool.query(
        `SELECT j.company_id FROM applications a 
         JOIN jobs j ON a.job_id = j.id 
         WHERE a.id = $1 AND j.company_id = $2`,
        [req.params.id, req.companyId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      // 2. Proxy to AI Service
      const top_k = req.query.top_k || 5;
      const aiRes = await axios.get(`${process.env.AI_SERVICE_URL}/similarity/${req.params.id}?top_k=${top_k}`);
      
      // 3. Enrich result with candidate names within company scope
      const enriched = await Promise.all(aiRes.data.map(async (item) => {
        const { rows: [cand] } = await pool.query(
          'SELECT name FROM candidates WHERE id = $1 AND company_id = $2', 
          [item.candidate_id, req.companyId]
        );
        return {
          ...item,
          name: cand?.name || 'Unknown'
        };
      }));

      res.json({ success: true, data: enriched });
    } catch (e) {
      console.error('Similarity proxy error:', e.message);
      const status = e.response?.status || 500;
      const error = e.response?.data?.detail || 'Similarity search failed';
      res.status(status).json({ success: false, error });
    }
});

router.get('/', auth, tenantGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM candidates WHERE company_id=$1 ORDER BY created_at DESC`,
      [req.companyId]);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch candidates' });
  }
});

module.exports = router;
