const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const pool      = require('./db/pg');
const fs        = require('fs');
const path      = require('path');
const validateEnv = require('./middleware/validateEnv');

const app = express();
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use('/health', require('./routes/health.routes'));

// Stripe webhook must come before express.json
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));

// Global Rate Limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/jobs',       require('./routes/jobs'));
app.use('/api/jobs',       require('./routes/ranking.routes'));
app.use('/api',            require('./routes/applicationStatus.routes'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/resume',     require('./routes/resumeParser.routes'));
app.use('/api/analysis',   require('./routes/analysis'));
app.use('/api/screening-results', require('./routes/screeningResult.routes'));
app.use('/api/analytics',  require('./routes/analytics.routes'));
app.use('/api/interview-questions', require('./routes/interviewQuestions.routes'));
app.use('/api/interviews', require('./routes/interviewSchedule.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/feedback',   require('./routes/feedback'));
app.use('/api/billing',    require('./routes/billing'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/audit',      require('./routes/audit'));
app.use('/api/apikeys',     require('./routes/apikeys'));

// Public API with Key Auth
const { apiKeyAuth, publicApiLimiter } = require('./middleware/apiKeyAuth');
app.use('/api/public', publicApiLimiter, apiKeyAuth, require('./routes/public'));
app.use('/api/gdpr',      require('./routes/gdpr'));

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Initialize and start
async function start() {
  try {
    validateEnv();

    // Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Init Postgres schema
    const schemaFile = path.join(__dirname, 'db/schema.sql');
    if (fs.existsSync(schemaFile)) {
      const schema = fs.readFileSync(schemaFile, 'utf8');
      await pool.query(schema);
      console.log('Postgres schema initialized');
    }

    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Backend on :${port}`));
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
