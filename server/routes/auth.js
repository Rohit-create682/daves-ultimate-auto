/**
 * Auth routes — POST /api/auth/login
 *
 * Validates username + password, returns a JWT token and user info.
 * Rate-limited to 5 attempts per 15 minutes per IP.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = req.body;

    // --- validation --------------------------------------------------------
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // --- look up user ------------------------------------------------------
    const user = db.prepare(
      'SELECT * FROM admin_users WHERE username = ? AND is_active = 1'
    ).get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // --- verify password ---------------------------------------------------
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // --- issue token -------------------------------------------------------
    const payload = { id: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
