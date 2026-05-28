const router = require('express').Router();
const Analysis = require('../models/Analysis');
const pool = require('../db/pg');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

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

router.get('/:candidateId/:jobId', auth, tenantGuard, async (req, res) => {
  try {
    const { candidateId, jobId } = req.params;
    const { rows } = await pool.query(
      `SELECT a.id AS application_id, a.ai_score, a.ai_status, a.ai_summary,
              a.applied_at, a.bias_flag, a.bias_reason, a.status,
              c.id AS candidate_id, c.name AS candidate_name, c.email,
              j.id AS job_id, j.title AS job_title
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       JOIN jobs j ON a.job_id = j.id
       WHERE c.id = $1 AND j.id = $2 AND j.company_id = $3
       LIMIT 1`,
      [candidateId, jobId, req.companyId]
    );

    if (rows.length === 0 || rows[0].ai_status !== 'complete') {
      return res.status(404).json({ success: false, message: 'Screening not completed yet' });
    }

    const app = rows[0];
    const analysis = await Analysis.findOne(
      { application_id: app.application_id },
      { _id: 0 }
    ).lean();

    const screening = analysis?.screening_result || {};
    const rawScore = Number(screening.score ?? app.ai_score ?? 0);
    const score = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
    const strengths = asList(screening.strengths).length
      ? asList(screening.strengths)
      : asList(analysis?.strengths).length
        ? asList(analysis.strengths)
        : asList(analysis?.skill_overlap?.matched);
    const missingSkills = asList(screening.missing_skills).length
      ? asList(screening.missing_skills)
      : asList(analysis?.skill_gaps).length
        ? asList(analysis.skill_gaps)
        : asList(analysis?.skill_overlap?.missing);

    res.json({
      success: true,
      data: {
        applicationId: app.application_id,
        candidateId: app.candidate_id,
        candidateName: app.candidate_name,
        candidateEmail: app.email,
        jobId: app.job_id,
        jobTitle: app.job_title,
        status: normalizeStatus(app.status),
        score,
        strengths,
        missingSkills,
        riskLevel: screening.risk_level || analysis?.risk_level || riskFromScore(score, app.bias_flag),
        summary: screening.summary || analysis?.llm_summary || app.ai_summary || '',
        recommendation: screening.recommendation || analysis?.recommendation || recommendationFromScore(score),
        screenedAt: screening.screened_at || analysis?.created_at || app.applied_at,
        biasFlag: app.bias_flag,
        biasReason: app.bias_reason
      }
    });
  } catch (error) {
    console.error('Screening result error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
