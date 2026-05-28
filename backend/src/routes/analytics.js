const router = require('express').Router();
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

router.get('/', auth, tenantGuard, async (req, res) => {
  const company_id = req.companyId;

  try {
    // Total Jobs count
    const { rows: [{ total_jobs }] } = await pool.query(
      'SELECT COUNT(*) as total_jobs FROM jobs WHERE company_id = $1', 
      [company_id]
    );

    // Total Applications count
    const { rows: [{ total_candidates }] } = await pool.query(
      `SELECT COUNT(*) as total_candidates 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE j.company_id = $1`,
      [company_id]
    );

    // Fetch all applications for score distribution and avg score
    const { rows: apps } = await pool.query(
      `SELECT a.ai_score, a.ai_status 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE j.company_id = $1`,
      [company_id]
    );

    let sumScores = 0;
    let completedCount = 0;
    let highScores = 0;
    const distribution = { '0-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };

    apps.forEach(app => {
      const s = app.ai_score || 0;
      
      // Calculate avg only for complete
      if (app.ai_status === 'complete') {
        sumScores += s;
        completedCount++;
        if (s >= 75) highScores++;
      }
      
      // Distribution includes all (processing fall into 0-40)
      if (s <= 40) distribution['0-40']++;
      else if (s <= 60) distribution['41-60']++;
      else if (s <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    });

    const avg_ai_score = completedCount > 0 ? (sumScores / completedCount).toFixed(1) : 0;
    const hire_rate_pct = apps.length > 0 ? ((highScores / apps.length) * 100).toFixed(1) : 0;

    // Top performing job (by avg ai_score)
    const { rows: [topJob] } = await pool.query(
      `SELECT j.title, AVG(a.ai_score) as avg_score 
       FROM jobs j 
       JOIN applications a ON j.id = a.job_id 
       WHERE j.company_id = $1 AND a.ai_status = 'complete'
       GROUP BY j.id, j.title 
       ORDER BY avg_score DESC LIMIT 1`,
      [company_id]
    );

    // 5. Feedback Stats (L3-006)
    const { rows: [fbStats] } = await pool.query(
      `SELECT COUNT(*) as total, 
              COUNT(CASE WHEN rating = 1 THEN 1 END) as positive 
       FROM ai_feedback f 
       JOIN applications a ON f.application_id = a.id 
       JOIN jobs j ON a.job_id = j.id 
       WHERE j.company_id = $1`,
      [company_id]
    );
    
    const total_fb = parseInt(fbStats?.total || 0);
    const pos_fb = parseInt(fbStats?.positive || 0);
    const positive_feedback_pct = total_fb > 0 ? ((pos_fb / total_fb) * 100).toFixed(1) : 0;
    
    const { rows: [disputed] } = await pool.query(
      `SELECT j.title 
       FROM jobs j 
       JOIN applications a ON j.id = a.job_id 
       JOIN ai_feedback f ON a.id = f.application_id 
       WHERE j.company_id = $1 
       GROUP BY j.id, j.title 
       ORDER BY (COUNT(CASE WHEN f.rating = -1 THEN 1 END)::float / COUNT(*)) DESC LIMIT 1`,
      [company_id]
    );

    res.json({
      success: true,
      data: {
        total_jobs: parseInt(total_jobs),
        total_candidates: parseInt(total_candidates),
        avg_ai_score: parseFloat(avg_ai_score),
        top_job: topJob ? topJob.title : 'N/A',
        score_distribution: distribution,
        avg_processing_time_seconds: 0, 
        hire_rate_pct: parseFloat(hire_rate_pct),
        total_feedback_given: total_fb,
        positive_feedback_pct: parseFloat(positive_feedback_pct),
        most_disputed_job: disputed ? disputed.title : 'None'
      }
    });

  } catch (e) {
    console.error('Analytics error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
