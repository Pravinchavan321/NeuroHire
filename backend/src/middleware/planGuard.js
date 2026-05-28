const pool = require('../db/pg');

module.exports = function checkPlanLimit(resource, limit) {
  return async (req, res, next) => {
    try {
      // 1. Get company plan
      const { rows: [sub] } = await pool.query(
        'SELECT plan FROM subscriptions WHERE company_id = $1',
        [req.companyId]
      );

      const plan = sub ? sub.plan : 'free';

      if (plan === 'pro') {
        return next(); // Unlimited for Pro
      }

      // 2. Count current usage
      let count = 0;
      if (resource === 'jobs') {
        const { rows: [{ total }] } = await pool.query(
          'SELECT COUNT(*) as total FROM jobs WHERE company_id = $1',
          [req.companyId]
        );
        count = parseInt(total);
      } else if (resource === 'candidates') {
        const { rows: [{ total }] } = await pool.query(
          'SELECT COUNT(*) as total FROM candidates WHERE company_id = $1',
          [req.companyId]
        );
        count = parseInt(total);
      }

      // 3. Enforce limit
      if (count >= limit) {
        return res.status(403).json({
          success: false,
          error: `Upgrade to Pro to add more ${resource}`,
          upgrade_url: "/billing"
        });
      }

      next();
    } catch (e) {
      console.error(`Plan limit check failed for ${resource}:`, e);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
};
