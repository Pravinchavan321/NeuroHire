const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pg');

router.post('/register', async (req, res) => {
  const { email, password, companyName, industry } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows:[co] } = await pool.query(
      'INSERT INTO companies(name,industry) VALUES($1,$2) RETURNING id',
      [companyName, industry]);
    const { rows:[u] } = await pool.query(
      `INSERT INTO users(company_id,email,password_hash,role)
       VALUES($1,$2,$3,'admin') RETURNING id,email,role`,
      [co.id, email, hash]);
    const token = jwt.sign(
      { id:u.id, company_id:co.id, role:u.role },
      process.env.JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user:{ ...u, company_id:co.id } });
  } catch(e) { res.status(400).json({ error:e.message }); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows:[u] } = await pool.query(
    `SELECT u.*,c.name as company FROM users u
     JOIN companies c ON u.company_id=c.id WHERE u.email=$1`, [email]);
  if (!u || !await bcrypt.compare(password, u.password_hash))
    return res.status(401).json({ error:'Invalid credentials' });
  const token = jwt.sign(
    { id:u.id, company_id:u.company_id, role:u.role },
    process.env.JWT_SECRET, { expiresIn:'7d' });
  res.json({ token, user:{ id:u.id, email:u.email, role:u.role, company:u.company } });
});
module.exports = router;
