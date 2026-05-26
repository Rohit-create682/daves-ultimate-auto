/**
 * Reviews routes — public & admin
 *
 * Public:
 *   GET /api/reviews — featured reviews
 *
 * Admin (auth required):
 *   POST   /api/admin/reviews      — create review
 *   PUT    /api/admin/reviews/:id  — update / toggle featured
 *   DELETE /api/admin/reviews/:id  — delete review
 */

const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * GET /api/reviews
 * Returns featured reviews, newest first.
 */
router.get('/', (req, res) => {
  try {
    const reviews = db.prepare(
      'SELECT * FROM reviews WHERE is_featured = 1 ORDER BY created_at DESC'
    ).all();
    res.json(reviews);
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin ──────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/reviews
 * Body: { customer_name, rating, text, is_featured }
 */
router.post('/admin/reviews', auth, (req, res) => {
  try {
    const { customer_name, rating, text, is_featured } = req.body;

    if (!customer_name || rating == null) {
      return res.status(400).json({ error: 'customer_name and rating are required' });
    }
    if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const result = db.prepare(`
      INSERT INTO reviews (customer_name, rating, text, is_featured)
      VALUES (?, ?, ?, ?)
    `).run(customer_name, rating, text || '', is_featured ? 1 : 0);

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(review);
  } catch (err) {
    console.error('POST /api/admin/reviews error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/reviews/:id
 * Body: { customer_name, rating, text, is_featured }
 */
router.put('/admin/reviews/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    const { customer_name, rating, text, is_featured } = req.body;

    if (rating != null && (rating < 1 || rating > 5 || !Number.isInteger(Number(rating)))) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    db.prepare(`
      UPDATE reviews
      SET customer_name = ?, rating = ?, text = ?, is_featured = ?
      WHERE id = ?
    `).run(
      customer_name ?? existing.customer_name,
      rating ?? existing.rating,
      text ?? existing.text,
      is_featured != null ? (is_featured ? 1 : 0) : existing.is_featured,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/reviews/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/reviews/:id
 */
router.delete('/admin/reviews/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/reviews/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
