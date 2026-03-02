const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, phone_number FROM kc_agents WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const agent = result.rows[0];
    const valid = await bcrypt.compare(password, agent.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { id: agent.id, name: agent.name, email: agent.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      { id: agent.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      agent: { id: agent.id, name: agent.name, email: agent.email, phone_number: agent.phone_number },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await db.query(
      'SELECT id, name, email FROM kc_agents WHERE id = $1 AND is_active = true',
      [payload.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];
    const accessToken = jwt.sign(
      { id: agent.id, name: agent.name, email: agent.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
