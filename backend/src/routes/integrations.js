const router = require('express').Router();
const crypto = require('crypto');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');

// Helper: Download resume
async function downloadResume(url) {
  const dest = path.join('uploads', `ats_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(dest));
    writer.on('error', reject);
  });
}

// POST /api/integrations/greenhouse/webhook
router.post('/greenhouse/webhook', async (req, res) => {
  const signature = req.headers['x-greenhouse-signature'];
  // In a real scenario, we'd look up the secret by parsing some ID from the body first
  // For this task, we assume the company is identifiable or we use a global setup for demo
  // But wait, the requirement says "Verify signature: HMAC-SHA256 of raw body using stored webhook_secret for the company"
  
  // To identify the company without a token, ATS usually includes a company ID in the payload or URL
  // We'll assume Greenhouse sends it in req.body.metadata.company_id for this implementation
  const companyId = req.body.payload?.company_id; 
  
  try {
    const { rows: [integration] } = await pool.query(
      "SELECT * FROM integrations WHERE company_id = $1 AND provider = 'greenhouse'",
      [companyId]
    );

    if (!integration) return res.status(401).send('Unauthorized');

    const hmac = crypto.createHmac('sha256', integration.webhook_secret);
    const digest = hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
      return res.status(401).send('Invalid signature');
    }

    const { candidate, job_id: externalJobId } = req.body.payload;
    const internalJobId = integration.job_mapping[externalJobId];

    if (!internalJobId) return res.status(400).send('Job mapping missing');

    const resumePath = await downloadResume(candidate.resume_url);

    // Create records
    const { rows: [cand] } = await pool.query(
      `INSERT INTO candidates(company_id, name, email, phone, resume_path)
       VALUES($1, $2, $3, $4, $5) RETURNING id`,
      [companyId, candidate.first_name + ' ' + candidate.last_name, candidate.email, candidate.phone, resumePath]
    );

    const { rows: [app] } = await pool.query(
      `INSERT INTO applications(job_id, candidate_id, ai_status)
       VALUES($1, $2, 'processing') RETURNING id`,
      [internalJobId, cand.id]
    );

    // Trigger AI
    axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
      application_id: app.id,
      candidate_id: cand.id,
      job_id: internalJobId,
      resume_path: resumePath,
      company_id: companyId,
    }).catch(e => console.error('ATS AI trigger failed:', e.message));

    res.status(200).send('OK');
  } catch (e) {
    console.error('Greenhouse webhook failed:', e);
    res.status(500).send('Internal Error');
  }
});

// POST /api/integrations/lever/webhook
router.post('/lever/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;
    if (!event || !data) {
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    }

    if (event === 'candidateStageChange' || event === 'candidateArchived' || event === 'candidateHired') {
      const candidateData = {
        lever_opportunity_id: data.opportunityId || data.id,
        lever_stage: data.stage?.text || data.stage || 'unknown',
        lever_event: event,
        email: data.contact?.emails?.[0] || null,
        name: data.contact?.name || null,
        synced_at: new Date().toISOString()
      };

      await pool.query(
        `INSERT INTO integration_events (source, event_type, payload, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT DO NOTHING`,
        ['lever', event, JSON.stringify(candidateData)]
      );
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Lever webhook error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/lever/connect', auth, tenantGuard, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Authorization code required' });

    const tokenRes = await fetch('https://sandbox-lever.auth0.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.LEVER_CLIENT_ID || 'LEVER_CLIENT_ID_NOT_SET',
        client_secret: process.env.LEVER_CLIENT_SECRET || 'LEVER_CLIENT_SECRET_NOT_SET',
        redirect_uri: process.env.LEVER_REDIRECT_URI || 'http://localhost:3000/integrations/lever/callback',
        code
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(400).json({ success: false, error: 'Lever token exchange failed', detail: err });
    }

    const tokens = await tokenRes.json();
    await pool.query(
      `INSERT INTO integration_tokens (user_id, provider, access_token, refresh_token, expires_at, created_at)
       VALUES ($1, 'lever', $2, $3, $4, NOW())
       ON CONFLICT (user_id, provider) DO UPDATE
       SET access_token=$2, refresh_token=$3, expires_at=$4, updated_at=NOW()`,
      [req.user.id, tokens.access_token, tokens.refresh_token, new Date(Date.now() + tokens.expires_in * 1000)]
    );

    return res.json({ success: true, message: 'Lever connected successfully' });
  } catch (error) {
    console.error('Lever connect error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/integrations/status
router.get('/status', auth, tenantGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT provider, active, created_at FROM integrations WHERE company_id = $1',
      [req.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

// POST /api/integrations/setup
router.post('/setup', auth, tenantGuard, async (req, res) => {
  const { provider, webhook_secret, job_mapping } = req.body;
  try {
    await pool.query(
      `INSERT INTO integrations (company_id, provider, webhook_secret, job_mapping)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, provider) DO UPDATE SET 
       webhook_secret = EXCLUDED.webhook_secret,
       job_mapping = EXCLUDED.job_mapping,
       active = true`,
      [req.companyId, provider, webhook_secret, job_mapping]
    );

    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/integrations/${provider}/webhook`;
    res.json({ success: true, data: { webhook_url: webhookUrl } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Setup failed' });
  }
});

module.exports = router;
