/**
 * Contact routes — public submission & admin management
 *
 * Public:
 *   POST /api/contact — submit a contact form message
 *
 * Admin (auth required):
 *   GET /api/admin/contact-messages         — list all messages
 *   PUT /api/admin/contact-messages/:id/read — mark as read
 */

const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * POST /api/contact
 * Body: { name, email, phone, message }
 */
router.post('/', (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // --- validation --------------------------------------------------------
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = db.prepare(`
      INSERT INTO contact_messages (name, email, phone, message)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), email.trim(), (phone || '').trim(), message.trim());

    const msg = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Message sent successfully', data: msg });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/contact-messages
 */
router.get('/admin/contact-messages', auth, (req, res) => {
  try {
    const messages = db.prepare(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    ).all();
    res.json(messages);
  } catch (err) {
    console.error('GET /api/admin/contact-messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/contact-messages/:id/read
 */
router.put('/admin/contact-messages/:id/read', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    db.prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?').run(req.params.id);

    const updated = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/contact-messages/:id/read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
