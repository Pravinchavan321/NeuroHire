const router = require('express').Router();
const pool = require('../db/pg');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

const defaults = {
  companyName: '',
  logoUrl: '',
  website: '',
  contactEmail: '',
  industry: '',
  companySize: ''
};

router.use(auth, tenantGuard, adminOnly);

router.get('/company', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cs.data, c.name AS company_name
       FROM companies c
       LEFT JOIN company_settings cs ON c.id = cs.company_id
       WHERE c.id = $1`,
      [req.companyId]
    );

    const data = rows[0]?.data || {};
    res.json({
      success: true,
      data: {
        settings: { ...defaults, companyName: rows[0]?.company_name || '', ...data },
        config: {
          geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
          smtpConfigured: Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
          aiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
        }
      }
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/company', async (req, res) => {
  try {
    const payload = Object.keys(defaults).reduce((acc, key) => {
      acc[key] = req.body[key] || '';
      return acc;
    }, {});

    const { rows } = await pool.query(
      `INSERT INTO company_settings (company_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (company_id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING data, updated_at`,
      [req.companyId, JSON.stringify(payload)]
    );

    res.json({ success: true, data: { settings: rows[0].data, updatedAt: rows[0].updated_at } });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
