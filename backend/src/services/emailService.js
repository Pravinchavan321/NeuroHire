const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const templatesDir = path.join(__dirname, '..', 'emailTemplates');
const trackedStatuses = ['Shortlisted', 'Rejected', 'Interview'];
let transporter;

const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

const renderTemplate = (filename, values) => {
  let html = fs.readFileSync(path.join(templatesDir, filename), 'utf8');
  Object.entries(values).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
  });
  return html;
};

const getTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  const mailer = getTransporter();
  if (!mailer || !to) {
    console.warn('Email skipped: SMTP config or recipient missing');
    return { skipped: true };
  }

  return mailer.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'NeuroHire Recruitment'}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
};

const sendStatusChangeEmail = async ({ candidateName, candidateEmail, jobTitle, newStatus, recruiterNote }) => {
  if (!trackedStatuses.includes(newStatus)) return { skipped: true };

  const statusMessages = {
    Shortlisted: "Congratulations! You've been shortlisted for the next stage of the hiring process.",
    Rejected: 'Thank you for your interest. After careful review, we will not be moving forward at this time.',
    Interview: "You've been selected for an interview. Our recruiting team will share the details shortly."
  };
  const noteBlock = recruiterNote
    ? `<div style="margin-top:18px;padding:14px;border-radius:12px;background:#f8fafc;color:#334155;"><strong>Recruiter note:</strong><br>${escapeHtml(recruiterNote)}</div>`
    : '';

  const html = renderTemplate('statusChange.html', {
    candidateName: escapeHtml(candidateName || 'Candidate'),
    jobTitle: escapeHtml(jobTitle || 'the role'),
    status: escapeHtml(newStatus),
    statusMessage: escapeHtml(statusMessages[newStatus]),
    recruiterNote: noteBlock,
    footerName: escapeHtml(process.env.EMAIL_FROM_NAME || 'NeuroHire Recruitment')
  });

  return sendEmail({
    to: candidateEmail,
    subject: `Application update: ${newStatus} for ${jobTitle || 'your role'}`,
    html
  });
};

const sendInterviewScheduledEmail = async ({
  candidateName,
  candidateEmail,
  jobTitle,
  interviewDate,
  interviewTime,
  interviewerName,
  meetingLink,
  notes
}) => {
  const safeLink = escapeHtml(meetingLink || '');
  const html = renderTemplate('interviewScheduled.html', {
    candidateName: escapeHtml(candidateName || 'Candidate'),
    jobTitle: escapeHtml(jobTitle || 'the role'),
    interviewDate: escapeHtml(interviewDate),
    interviewTime: escapeHtml(interviewTime),
    interviewerName: escapeHtml(interviewerName || 'Recruiting Team'),
    meetingLinkRow: meetingLink ? `<tr><td style="padding:12px;color:#64748b;">Link</td><td style="padding:12px;"><a href="${safeLink}" style="color:#2563eb;">${safeLink}</a></td></tr>` : '',
    meetingButton: meetingLink ? `<a href="${safeLink}" style="display:inline-block;margin-top:22px;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">Join meeting</a>` : '',
    notesBlock: notes ? `<div style="margin-top:18px;padding:14px;border-radius:12px;background:#f8fafc;color:#334155;"><strong>Notes:</strong><br>${escapeHtml(notes)}</div>` : '',
    footerName: escapeHtml(process.env.EMAIL_FROM_NAME || 'NeuroHire Recruitment')
  });

  return sendEmail({
    to: candidateEmail,
    subject: `Interview scheduled for ${jobTitle || 'your application'}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendStatusChangeEmail,
  sendInterviewScheduledEmail
};
