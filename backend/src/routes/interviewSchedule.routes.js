const router = require('express').Router();
const mongoose = require('mongoose');
const pool = require('../db/pg');
const auth = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { sendInterviewScheduledEmail } = require('../services/emailService');

router.post('/schedule', auth, tenantGuard, async (req, res) => {
  try {
    const { applicationId, candidateId, jobId, date, time, interviewerName, meetingLink, notes } = req.body;
    if (!candidateId || !jobId || !date || !time || !interviewerName) {
      return res.status(400).json({ success: false, error: 'candidateId, jobId, date, time, and interviewerName are required' });
    }

    const { rows } = await pool.query(
      `SELECT a.id AS application_id, c.id AS candidate_id, c.name AS candidate_name,
              c.email AS candidate_email, j.id AS job_id, j.title AS job_title
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       JOIN jobs j ON a.job_id = j.id
       WHERE a.candidate_id = $1 AND a.job_id = $2 AND j.company_id = $3
         AND ($4::text IS NULL OR a.id::text = $4::text)
       LIMIT 1`,
      [candidateId, jobId, req.companyId, applicationId || null]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const context = rows[0];
    const interview = {
      applicationId: String(context.application_id),
      candidateId: String(context.candidate_id),
      jobId: String(context.job_id),
      companyId: String(req.companyId),
      candidateName: context.candidate_name,
      candidateEmail: context.candidate_email,
      jobTitle: context.job_title,
      date,
      time,
      interviewerName,
      meetingLink: meetingLink || '',
      notes: notes || '',
      scheduledBy: req.user?.id || null,
      createdAt: new Date()
    };

    const insert = await mongoose.connection.collection('interviews').insertOne(interview);
    let emailSent = true;
    try {
      await sendInterviewScheduledEmail({
        candidateName: context.candidate_name,
        candidateEmail: context.candidate_email,
        jobTitle: context.job_title,
        interviewDate: date,
        interviewTime: time,
        interviewerName,
        meetingLink,
        notes
      });
    } catch (emailError) {
      emailSent = false;
      console.warn('Interview scheduled email failed:', emailError.message);
    }

    res.status(201).json({ success: true, data: { id: insert.insertedId, ...interview, emailSent } });
  } catch (error) {
    console.error('Interview schedule error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:candidateId', auth, tenantGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id
       FROM candidates c
       JOIN applications a ON c.id = a.candidate_id
       JOIN jobs j ON a.job_id = j.id
       WHERE c.id = $1 AND j.company_id = $2
       LIMIT 1`,
      [req.params.candidateId, req.companyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    const interviews = await mongoose.connection.collection('interviews')
      .find({ candidateId: String(req.params.candidateId), companyId: String(req.companyId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: interviews });
  } catch (error) {
    console.error('Interview list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
