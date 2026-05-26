const express = require('express');
const db = require('../db/database');

const router = express.Router();

/**
 * GET /api/locations
 * Returns all active locations
 */
router.get('/', (req, res) => {
  try {
    const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY id').all();
    res.json(locations);
  } catch (err) {
    console.error('GET /api/locations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
