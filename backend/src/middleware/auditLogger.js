const pool = require('../db/pg');

/**
 * logAction - Audit logging helper
 * @param {string} action - The action name
 * @param {string} resourceType - The type of resource affected
 * @param {string} resourceId - The ID of the resource affected
 * @param {object} metadata - Additional context
 */
function logAction(action, resourceType, resourceId, metadata = {}) {
  return async (req, res, next) => {
    // Capture data after the request finishes to ensure we have req.user/companyId
    res.on('finish', async () => {
      // Only log if we have a successful response or certain conditions
      // For simplicity in this task, we log if req.user exists
      if (req.user) {
        try {
          const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
          await pool.query(
            `INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, metadata, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.companyId || req.user.company_id, req.user.id, action, resourceType, resourceId, JSON.stringify(metadata), ip]
          );
        } catch (e) {
          console.error('Audit logging failed:', e.message);
        }
      }
    });
    next();
  };
}

module.exports = { logAction };
