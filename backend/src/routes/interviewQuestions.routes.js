const router = require('express').Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');
const Analysis = require('../models/Analysis');
const pool = require('../db/pg');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

const questionsCollection = () => mongoose.connection.collection('interview_questions');

async function extractResumeText(resumePath) {
  if (!resumePath) return '';
  const fullPath = path.resolve(resumePath);
  if (!fs.existsSync(fullPath)) return '';
  const buffer = await fs.promises.readFile(fullPath);
  if (path.extname(fullPath).toLowerCase() === '.pdf') {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }
  return buffer.toString('utf8');
}

async function getCandidateContext(candidateId, jobId, companyId) {
  const { rows } = await pool.query(
    `SELECT c.id AS candidate_id, c.name, c.email, c.resume_path,
            j.id AS job_id, j.title AS job_title, j.description AS job_description
     FROM applications a
     JOIN candidates c ON a.candidate_id = c.id
     JOIN jobs j ON a.job_id = j.id
     WHERE c.id = $1 AND j.id = $2 AND j.company_id = $3
     LIMIT 1`,
    [candidateId, jobId, companyId]
  );
  return rows[0];
}

router.post('/generate', auth, tenantGuard, async (req, res) => {
  try {
    const { candidateId, jobId, difficulty = 'Mid' } = req.body;
    if (!candidateId || !jobId) {
      return res.status(400).json({ success: false, error: 'candidateId and jobId are required' });
    }

    const context = await getCandidateContext(candidateId, jobId, req.companyId);
    if (!context) return res.status(404).json({ success: false, error: 'Candidate/job pair not found' });

    const analysis = await Analysis.findOne({ candidate_id: candidateId, job_id: jobId }, { _id: 0 }).lean();
    let resumeText = await extractResumeText(context.resume_path);
    if (!resumeText.trim()) {
      resumeText = [
        analysis?.llm_summary,
        `Strengths: ${(analysis?.strengths || []).join(', ')}`,
        `Missing skills: ${(analysis?.skill_gaps || analysis?.skill_overlap?.missing || []).join(', ')}`
      ].filter(Boolean).join('\n');
    }

    const aiRes = await axios.post(`${process.env.AI_SERVICE_URL}/generate-interview-questions`, {
      resume_text: resumeText,
      job_description: context.job_description,
      job_title: context.job_title,
      candidate_name: context.name,
      difficulty
    });

    const doc = {
      candidateId,
      jobId,
      questions: aiRes.data,
      generatedAt: new Date()
    };

    await questionsCollection().updateOne(
      { candidateId, jobId },
      { $set: doc },
      { upsert: true }
    );

    res.json({ success: true, data: doc });
  } catch (error) {
    console.error('Interview question generation error:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.detail || error.message
    });
  }
});

router.get('/:candidateId/:jobId', auth, tenantGuard, async (req, res) => {
  try {
    const { candidateId, jobId } = req.params;
    const context = await getCandidateContext(candidateId, jobId, req.companyId);
    if (!context) return res.status(404).json({ success: false, error: 'Questions not generated yet' });

    const questions = await questionsCollection().findOne(
      { candidateId, jobId },
      { projection: { _id: 0 } }
    );
    if (!questions) return res.status(404).json({ success: false, error: 'Questions not generated yet' });

    res.json({ success: true, data: { ...questions, candidateName: context.name, jobTitle: context.job_title } });
  } catch (error) {
    console.error('Interview question fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
