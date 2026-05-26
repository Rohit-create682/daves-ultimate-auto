/**
 * Services routes — public & admin
 *
 * Public:
 *   GET  /api/services      — list all active services
 *   GET  /api/services/:id  — single service
 *
 * Admin (auth required):
 *   POST   /api/admin/services      — create service
 *   PUT    /api/admin/services/:id  — update service
 *   DELETE /api/admin/services/:id  — soft-delete (is_active = 0)
 */

const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * GET /api/services
 * Returns all active services, ordered by category then name.
 */
router.get('/', (req, res) => {
  try {
    const services = db.prepare(
      'SELECT * FROM services WHERE is_active = 1 ORDER BY category, name'
    ).all();
    res.json(services);
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/services/:id
 */
router.get('/:id', (req, res) => {
  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    console.error('GET /api/services/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin ──────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/services
 */
router.post('/admin/services', auth, (req, res) => {
  try {
    const { name, description, duration_minutes, category, icon } = req.body;

    if (!name || !duration_minutes) {
      return res.status(400).json({ error: 'name, and duration_minutes are required' });
    }

    const result = db.prepare(`
      INSERT INTO services (name, description, duration_minutes, category, icon)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name,
      description || '',
      duration_minutes,
      category || 'General',
      icon || 'wrench'
    );

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(service);
  } catch (err) {
    console.error('POST /api/admin/services error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/services/:id
 */
router.put('/admin/services/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Service not found' });

    const { name, description, duration_minutes, category, icon, is_active } = req.body;

    db.prepare(`
      UPDATE services
      SET name = ?, description = ?, duration_minutes = ?,
          category = ?, icon = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      duration_minutes ?? existing.duration_minutes,
      category ?? existing.category,
      icon ?? existing.icon,
      is_active ?? existing.is_active,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/services/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/services/:id  (soft delete)
 */
router.delete('/admin/services/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Service not found' });

    db.prepare(
      "UPDATE services SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).run(req.params.id);

    res.json({ message: 'Service deactivated' });
  } catch (err) {
    console.error('DELETE /api/admin/services/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
