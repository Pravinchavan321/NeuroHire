const crypto = require('crypto');
const pool   = require('../db/pg');
const rateLimit = require('express-rate-limit');

// Rate limit: 1000 req/hour per key
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  keyGenerator: (req) => req.headers.authorization || req.ip,
  message: { success: false, error: 'API Rate limit exceeded (1000/hr)' }
});

async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('ApiKey nh_')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid API key' });
  }

  const rawKey = authHeader.replace('ApiKey ', '');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    const { rows: [keyRecord] } = await pool.query(
      `SELECT k.*, c.name as company_name 
       FROM api_keys k 
       JOIN companies c ON k.company_id = c.id
       WHERE k.key_hash = $1 AND k.active = true`,
      [keyHash]
    );

    if (!keyRecord) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    // Update last used
    await pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyRecord.id]);

    // Set request context
    req.companyId = keyRecord.company_id;
    req.user = { id: keyRecord.created_by, company_id: keyRecord.company_id, role: 'api_user' };

    next();
  } catch (e) {
    console.error('API Key Auth failed:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = { apiKeyAuth, publicApiLimiter };
