const router = require('express').Router();
const pool   = require('../db/pg');
const Analysis = require('../models/Analysis');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

// POST /api/gdpr/consent (Public)
router.post('/consent', async (req, res) => {
  const { candidate_email, company_id, consent_given } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    await pool.query(
      `INSERT INTO consent_log (candidate_email, company_id, consent_given, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [candidate_email, company_id, consent_given, ip]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to log consent' });
  }
});

// POST /api/gdpr/deletion-request (Public - Candidate self-service)
router.post('/deletion-request', async (req, res) => {
  const { candidate_email, company_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO deletion_requests (candidate_email, company_id)
       VALUES ($1, $2)`,
      [candidate_email, company_id]
    );
    res.json({ success: true, data: { message: "Request received. Data deleted within 30 days." } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Request failed' });
  }
});

// GET /api/gdpr/export/:candidate_email (Admin)
router.get('/export/:candidate_email', auth, tenantGuard, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  try {
    // 1. PG Data
    const { rows: candidate } = await pool.query(
      'SELECT * FROM candidates WHERE email = $1 AND company_id = $2',
      [req.params.candidate_email, req.companyId]
    );

    if (candidate.length === 0) return res.status(404).json({ success: false, error: 'Candidate not found' });

    const { rows: apps } = await pool.query(
      'SELECT * FROM applications WHERE candidate_id = $1',
      [candidate[0].id]
    );

    // 2. Mongo Data
    const appIds = apps.map(a => a.id);
    const analysis = await Analysis.find({ application_id: { $in: appIds } });

    res.json({
      success: true,
      data: {
        profile: candidate[0],
        applications: apps,
        analysis: analysis
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// POST /api/gdpr/deletion-request/:id/complete (Admin)
router.post('/deletion-request/:id/complete', auth, tenantGuard, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });

  try {
    // 1. Get request details
    const { rows: [reqRow] } = await pool.query(
      'SELECT * FROM deletion_requests WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );

    if (!reqRow) return res.status(404).json({ success: false, error: 'Request not found' });

    // 2. Identify candidate
    const { rows: [cand] } = await pool.query(
      'SELECT id FROM candidates WHERE email = $1 AND company_id = $2',
      [reqRow.candidate_email, req.companyId]
    );

    if (cand) {
      const { rows: apps } = await pool.query('SELECT id FROM applications WHERE candidate_id = $1', [cand.id]);
      const appIds = apps.map(a => a.id);

      // Delete from MongoDB
      await Analysis.deleteMany({ application_id: { $in: appIds } });

      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
      const embeddingRes = await fetch(`${aiServiceUrl}/embeddings/${cand.id}`, {
        method: 'DELETE'
      });
      if (!embeddingRes.ok) {
        console.warn(`Embedding delete returned ${embeddingRes.status} for candidate ${cand.id}`);
      }

      // Delete from PostgreSQL (Cascades should handle apps/feedback if set, otherwise manual)
      await pool.query('DELETE FROM candidates WHERE id = $1', [cand.id]);
    }

    // 3. Mark request completed
    await pool.query(
      'UPDATE deletion_requests SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', reqRow.id]
    );

    res.json({ success: true });
  } catch (e) {
    console.error('GDPR Deletion failed:', e);
    res.status(500).json({ success: false, error: 'Deletion failed' });
  }
});

// GET /api/gdpr/requests (Admin)
router.get('/requests', auth, tenantGuard, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM deletion_requests WHERE company_id = $1 ORDER BY requested_at DESC',
      [req.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

module.exports = router;
