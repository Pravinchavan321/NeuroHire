const router = require('express').Router();
const crypto = require('crypto');
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

// POST /api/apikeys/generate
router.post('/generate', auth, tenantGuard, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Key name is required' });

  try {
    const rawKey = `nh_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 8);

    await pool.query(
      `INSERT INTO api_keys (company_id, key_hash, key_prefix, name, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.companyId, keyHash, keyPrefix, name, req.user.id]
    );

    res.json({ success: true, data: { key: rawKey } });
  } catch (e) {
    console.error('API key generation failed:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/apikeys
router.get('/', auth, tenantGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, key_prefix, last_used_at, active, created_at FROM api_keys WHERE company_id = $1 AND active = true',
      [req.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/apikeys/:id
router.delete('/:id', auth, tenantGuard, async (req, res) => {
  try {
    await pool.query(
      'UPDATE api_keys SET active = false WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    res.json({ success: true, data: { revoked: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
