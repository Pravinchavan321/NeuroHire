const router = require('express').Router();
const axios = require('axios');
const mongoose = require('mongoose');
const pool = require('../db/pg');

const timedCheck = async (check) => {
  const started = Date.now();
  try {
    await check();
    return { status: 'up', responseTime: Date.now() - started };
  } catch (error) {
    return { status: 'down', responseTime: null };
  }
};

router.get('/', async (req, res) => {
  const chromaBaseUrl = process.env.CHROMA_URL || `http://${process.env.CHROMA_HOST || 'chromadb'}:${process.env.CHROMA_PORT || 8000}`;
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

  const checks = {
    postgres: await timedCheck(() => pool.query('SELECT 1')),
    mongo: await timedCheck(async () => {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new Error('MongoDB not connected');
      await mongoose.connection.db.admin().ping();
    }),
    chroma: await timedCheck(async () => {
      try {
        await axios.get(`${chromaBaseUrl}/api/v1/heartbeat`, { timeout: 2500 });
      } catch (error) {
        await axios.get(`${chromaBaseUrl}/api/v2/heartbeat`, { timeout: 2500 });
      }
    }),
    aiService: await timedCheck(() => axios.get(`${aiServiceUrl}/health`, { timeout: 2500 }))
  };

  const services = Object.fromEntries(Object.entries(checks).map(([name, result]) => [name, result.status]));
  const responseTimes = Object.fromEntries(Object.entries(checks).map(([name, result]) => [name, result.responseTime]));
  const upCount = Object.values(services).filter((status) => status === 'up').length;
  const status = upCount === 4 ? 'healthy' : upCount === 0 ? 'down' : 'degraded';

  res.json({
    status,
    services,
    responseTimes,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
