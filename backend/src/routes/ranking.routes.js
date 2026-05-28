const router = require('express').Router();
const Analysis = require('../models/Analysis');
const pool = require('../db/pg');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

const asNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const riskFromScore = (score, biasFlag) => {
  if (biasFlag || score < 40) return 'High';
  if (score < 70) return 'Medium';
  return 'Low';
};

const recommendationFromScore = (score) => {
  if (score >= 70) return 'Shortlist';
  if (score >= 40) return 'Review';
  return 'Reject';
};

const normalizeStatus = (status) => {
  if (['New', 'Shortlisted', 'Interview', 'Rejected', 'Hired'].includes(status)) return status;
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'shortlisted') return 'Shortlisted';
  if (normalized === 'interview') return 'Interview';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'hired' || normalized === 'offer') return 'Hired';
  return 'New';
};

router.get('/:jobId/ranking', auth, tenantGuard, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { rows: jobRows } = await pool.query(
      `SELECT j.id, j.title, j.location, j.created_at, c.name AS company
       FROM jobs j
       JOIN companies c ON j.company_id = c.id
       WHERE j.id = $1 AND j.company_id = $2
       LIMIT 1`,
      [req.params.jobId, req.companyId]
    );

    if (jobRows.length === 0) {
      const { rows: exists } = await pool.query('SELECT id FROM jobs WHERE id = $1', [req.params.jobId]);
      if (exists.length > 0) return res.status(403).json({ success: false, error: 'Forbidden' });
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const { rows } = await pool.query(
      `SELECT a.id AS application_id, a.ai_score, a.ai_status, a.status,
              a.applied_at, a.bias_flag,
              c.id AS candidate_id, c.name, c.email
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       WHERE a.job_id = $1
       ORDER BY a.ai_score DESC NULLS LAST, a.applied_at DESC`,
      [req.params.jobId]
    );

    const candidates = await Promise.all(rows.map(async (row) => {
      const analysis = await Analysis.findOne(
        { application_id: row.application_id },
        { _id: 0, screening_result: 1, risk_level: 1, recommendation: 1, created_at: 1 }
      ).lean();
      const screening = analysis?.screening_result || {};
      const score = Math.round(asNumber(screening.score ?? row.ai_score));

      return {
        applicationId: row.application_id,
        candidateId: row.candidate_id,
        name: row.name,
        email: row.email,
        score,
        recommendation: screening.recommendation || analysis?.recommendation || recommendationFromScore(score),
        riskLevel: screening.risk_level || analysis?.risk_level || riskFromScore(score, row.bias_flag),
        screenedAt: screening.screened_at || analysis?.created_at || row.applied_at,
        status: normalizeStatus(row.status),
        aiStatus: row.ai_status
      };
    }));

    const complete = candidates.filter((candidate) => candidate.aiStatus === 'complete');
    const total = candidates.length;
    const avgScore = complete.length
      ? Math.round((complete.reduce((sum, candidate) => sum + candidate.score, 0) / complete.length) * 10) / 10
      : 0;
    const shortlistedCount = complete.filter((candidate) => candidate.recommendation === 'Shortlist').length;
    const rejectedCount = complete.filter((candidate) => candidate.recommendation === 'Reject').length;
    const pendingCount = candidates.filter((candidate) => candidate.aiStatus !== 'complete').length;

    res.json({
      success: true,
      data: {
        job: jobRows[0],
        total,
        avgScore,
        shortlistedCount,
        rejectedCount,
        pendingCount,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        candidates: candidates.slice(offset, offset + limit)
      }
    });
  } catch (error) {
    console.error('Job ranking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
