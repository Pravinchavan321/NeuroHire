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

router.use(auth, tenantGuard, adminOnly);

router.get('/overview', async (req, res) => {
  try {
    const companyId = req.companyId;
    const { rows: [overview] } = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM jobs WHERE company_id = $1) AS total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE company_id = $1 AND status = 'open') AS active_jobs,
        (SELECT COUNT(*) FROM candidates WHERE company_id = $1) AS total_candidates,
        COUNT(a.id) AS total_applications,
        COUNT(*) FILTER (WHERE a.ai_status = 'complete') AS screened_count,
        COALESCE(ROUND((AVG(a.ai_score) FILTER (WHERE a.ai_status = 'complete'))::numeric, 1), 0) AS avg_ai_score,
        COUNT(*) FILTER (WHERE a.status = 'Shortlisted') AS shortlisted_count,
        COUNT(*) FILTER (WHERE a.status = 'Interview') AS interview_count,
        COUNT(*) FILTER (WHERE a.status = 'Hired') AS hired_count,
        COUNT(*) FILTER (WHERE a.status = 'Rejected') AS rejected_count,
        COUNT(*) FILTER (WHERE a.ai_status = 'complete' AND DATE(a.applied_at) = CURRENT_DATE) AS screening_completed_today
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.company_id = $1`,
      [companyId]
    );

    res.json({
      success: true,
      data: {
        totalJobs: parseInt(overview.total_jobs || 0, 10),
        activeJobs: parseInt(overview.active_jobs || 0, 10),
        totalCandidates: parseInt(overview.total_candidates || 0, 10),
        totalApplications: parseInt(overview.total_applications || 0, 10),
        screenedCount: parseInt(overview.screened_count || 0, 10),
        avgAiScore: parseFloat(overview.avg_ai_score || 0),
        shortlistedCount: parseInt(overview.shortlisted_count || 0, 10),
        interviewCount: parseInt(overview.interview_count || 0, 10),
        hiredCount: parseInt(overview.hired_count || 0, 10),
        rejectedCount: parseInt(overview.rejected_count || 0, 10),
        screeningCompletedToday: parseInt(overview.screening_completed_today || 0, 10)
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/score-distribution', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE COALESCE(a.ai_score, 0) BETWEEN 0 AND 20) AS b0_20,
        COUNT(*) FILTER (WHERE COALESCE(a.ai_score, 0) > 20 AND COALESCE(a.ai_score, 0) <= 40) AS b21_40,
        COUNT(*) FILTER (WHERE COALESCE(a.ai_score, 0) > 40 AND COALESCE(a.ai_score, 0) <= 60) AS b41_60,
        COUNT(*) FILTER (WHERE COALESCE(a.ai_score, 0) > 60 AND COALESCE(a.ai_score, 0) <= 80) AS b61_80,
        COUNT(*) FILTER (WHERE COALESCE(a.ai_score, 0) > 80 AND COALESCE(a.ai_score, 0) <= 100) AS b81_100
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE j.company_id = $1`,
      [req.companyId]
    );

    const row = rows[0] || {};
    res.json({
      success: true,
      data: {
        '0-20': parseInt(row.b0_20 || 0, 10),
        '21-40': parseInt(row.b21_40 || 0, 10),
        '41-60': parseInt(row.b41_60 || 0, 10),
        '61-80': parseInt(row.b61_80 || 0, 10),
        '81-100': parseInt(row.b81_100 || 0, 10)
      }
    });
  } catch (error) {
    console.error('Score distribution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs-over-time', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(day::date, 'YYYY-MM-DD') AS date, COUNT(j.id)::int AS count
       FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') day
       LEFT JOIN jobs j ON DATE(j.created_at) = day::date AND j.company_id = $1
       GROUP BY day
       ORDER BY day`,
      [req.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Jobs over time error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recent-activity', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM (
        SELECT 'job_created' AS type, ('Job created: ' || j.title) AS description,
               j.created_at AS timestamp, NULL AS candidate_name, j.title AS job_title
        FROM jobs j
        WHERE j.company_id = $1
        UNION ALL
        SELECT 'candidate_screened' AS type, ('Screening completed for ' || COALESCE(c.name, 'candidate')) AS description,
               a.applied_at AS timestamp, c.name AS candidate_name, j.title AS job_title
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        JOIN jobs j ON a.job_id = j.id
        WHERE j.company_id = $1 AND a.ai_status = 'complete'
        UNION ALL
        SELECT 'status_changed' AS type, ('Status changed to ' || a.status || ' for ' || COALESCE(c.name, 'candidate')) AS description,
               a.status_updated_at AS timestamp, c.name AS candidate_name, j.title AS job_title
        FROM applications a
        JOIN candidates c ON a.candidate_id = c.id
        JOIN jobs j ON a.job_id = j.id
        WHERE j.company_id = $1 AND a.status_updated_at IS NOT NULL
      ) activity
      ORDER BY timestamp DESC NULLS LAST
      LIMIT 20`,
      [req.companyId]
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        type: row.type,
        description: row.description,
        timestamp: row.timestamp,
        candidateName: row.candidate_name,
        jobTitle: row.job_title
      }))
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
