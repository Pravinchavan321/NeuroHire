const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const pool      = require('./db/pg');
const fs        = require('fs');
const path      = require('path');

const app = express();
app.use(cors(), helmet(), express.json({ limit: '50mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/jobs',       require('./routes/jobs'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/analysis',   require('./routes/analysis'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
async function start() {
  try {
    // Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Init Postgres schema
    const schemaFile = path.join(__dirname, 'db/schema.sql');
    if (fs.existsSync(schemaFile)) {
      const schema = fs.readFileSync(schemaFile, 'utf8');
      await pool.query(schema);
      console.log('Postgres schema initialized');
    }

    app.listen(5000, () => console.log('Backend on :5000'));
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
