const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pg');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Strict rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 10,
  message: { success: false, error: 'Too many attempts. Please wait 60s.' }
});

router.post('/register', 
  authLimiter,
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('companyName').notEmpty().withMessage('Company name is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, password, companyName, industry } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const { rows:[co] } = await pool.query(
        'INSERT INTO companies(name,industry) VALUES($1,$2) RETURNING id',
        [companyName, industry]);
      const { rows:[u] } = await pool.query(
        `INSERT INTO users(company_id,email,password_hash,role)
         VALUES($1,$2,$3,'admin') RETURNING id,email,role`,
        [co.id, email.toLowerCase(), hash]);
      
      const token = jwt.sign(
        { id:u.id, company_id:co.id, role:u.role },
        process.env.JWT_SECRET, { expiresIn:'24h' });
      
      res.status(201).json({ 
        success: true, 
        data: { token, user:{ ...u, company_id:co.id } } 
      });
    } catch(e) { 
      res.status(400).json({ success: false, error: 'Registration failed. Email may already be in use.' }); 
    }
});

router.post('/login', 
  authLimiter,
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    try {
      const { rows:[u] } = await pool.query(
        `SELECT u.*,c.name as company FROM users u
         JOIN companies c ON u.company_id=c.id WHERE u.email=$1`, [email.toLowerCase()]);
      
      if (!u || !await bcrypt.compare(password, u.password_hash)) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id:u.id, company_id:u.company_id, role:u.role },
        process.env.JWT_SECRET, { expiresIn:'24h' });
      
      res.json({ 
        success: true, 
        data: { token, user:{ id:u.id, email:u.email, role:u.role, company:u.company } } 
      });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
