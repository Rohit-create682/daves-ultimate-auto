/**
 * Customers routes — admin only (all endpoints require auth)
 *
 *   GET /api/admin/customers      — list with appointment count & last visit
 *   GET /api/admin/customers/:id  — full detail with appointment history
 *   PUT /api/admin/customers/:id  — update customer info
 */

const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/customers
 * Query: ?search=term (matches first_name, last_name, email, phone)
 */
router.get('/', auth, (req, res) => {
  try {
    let sql = `
      SELECT c.*,
             COUNT(a.id) AS appointment_count,
             MAX(a.appointment_date) AS last_visit
      FROM customers c
      LEFT JOIN appointments a ON a.customer_id = c.id AND a.status != 'cancelled'
    `;
    const params = [];

    if (req.query.search) {
      const term = `%${req.query.search}%`;
      sql += `
        WHERE (c.first_name LIKE ? OR c.last_name LIKE ?
               OR c.email LIKE ? OR c.phone LIKE ?)
      `;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY c.id ORDER BY c.last_name, c.first_name';

    const customers = db.prepare(sql).all(...params);
    res.json(customers);
  } catch (err) {
    console.error('GET /api/admin/customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/customers/:id
 * Returns customer info plus full appointment history with service names.
 */
router.get('/:id', auth, (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const appointments = db.prepare(`
      SELECT a.*, s.name AS service_name, s.duration_minutes
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      WHERE a.customer_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time ASC
    `).all(req.params.id);

    res.json({ ...customer, appointments });
  } catch (err) {
    console.error('GET /api/admin/customers/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/customers/:id
 */
router.put('/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const {
      first_name, last_name, email, phone,
      vehicle_make, vehicle_model, vehicle_year, notes,
    } = req.body;

    db.prepare(`
      UPDATE customers
      SET first_name = ?, last_name = ?, email = ?, phone = ?,
          vehicle_make = ?, vehicle_model = ?, vehicle_year = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      first_name ?? existing.first_name,
      last_name ?? existing.last_name,
      email ?? existing.email,
      phone ?? existing.phone,
      vehicle_make ?? existing.vehicle_make,
      vehicle_model ?? existing.vehicle_model,
      vehicle_year ?? existing.vehicle_year,
      notes ?? existing.notes,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/customers/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
