const router = require('express').Router();
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

// GET /api/audit - Get audit logs for company
router.get('/', auth, tenantGuard, async (req, res) => {
  // Admin only check
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { page = 1, limit = 50, action } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT a.*, u.email as user_email, u.role as user_role
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE a.company_id = $1
    `;
    const params = [req.companyId];

    if (action) {
      query += ` AND a.action = $${params.length + 1}`;
      params.push(action);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Fetch audit logs failed:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
