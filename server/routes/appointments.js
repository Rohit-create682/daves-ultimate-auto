/**
 * Appointments routes — public & admin
 *
 * Public:
 *   GET  /api/appointments/slots?date=YYYY-MM-DD — available time slots
 *   POST /api/appointments                       — book an appointment
 *
 * Admin (auth required):
 *   GET  /api/admin/appointments      — list all (filterable)
 *   GET  /api/admin/appointments/:id  — single appointment detail
 *   PUT  /api/admin/appointments/:id  — update appointment
 */

const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate 30-minute time slots for a given day-of-week (0=Sun … 6=Sat).
 * Mon-Fri 7:30–18:00, Sat 8:00–14:00, Sun closed.
 */
function generateSlots(dayOfWeek) {
  if (dayOfWeek === 0) return []; // Sunday — closed

  let startHour, startMin, endHour, endMin;
  if (dayOfWeek === 6) {
    // Saturday
    startHour = 8;  startMin = 0;
    endHour   = 14; endMin   = 0;
  } else {
    // Mon–Fri
    startHour = 7;  startMin = 30;
    endHour   = 18; endMin   = 0;
  }

  const slots = [];
  let h = startHour;
  let m = startMin;

  while (h < endHour || (h === endHour && m < endMin)) {
    slots.push(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    );
    m += 30;
    if (m >= 60) { h += 1; m = 0; }
  }

  return slots;
}

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * GET /api/appointments/slots?date=YYYY-MM-DD
 */
router.get('/slots', (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A valid date parameter (YYYY-MM-DD) is required' });
    }

    const dateObj = new Date(date + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }

    const dayOfWeek = dateObj.getUTCDay(); // 0=Sun
    const allSlots = generateSlots(dayOfWeek);

    if (allSlots.length === 0) {
      return res.json({ date, slots: [], message: 'Closed on Sundays' });
    }

    // Booked slots for the date (non-cancelled)
    const booked = db.prepare(`
      SELECT appointment_time FROM appointments
      WHERE appointment_date = ? AND status != 'cancelled'
    `).all(date).map(r => r.appointment_time);

    const bookedSet = new Set(booked);
    let available = allSlots.filter(s => !bookedSet.has(s));

    // If the requested date is today, remove past slots
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (date === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      available = available.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
    }

    res.json({ date, slots: available });
  } catch (err) {
    console.error('GET /api/appointments/slots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/appointments
 * Body: { first_name, last_name, email, phone, vehicle_make, vehicle_model,
 *         vehicle_year, service_id, date, time, notes }
 */
router.post('/', (req, res) => {
  try {
    const {
      first_name, last_name, email, phone,
      vehicle_make, vehicle_model, vehicle_year,
      service_id, location_id, date, time, notes,
    } = req.body;

    // --- validation --------------------------------------------------------
    if (!first_name || !last_name || !email || !service_id || !location_id || !date || !time) {
      return res.status(400).json({
        error: 'first_name, last_name, email, service_id, location_id, date, and time are required',
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: 'time must be in HH:MM format' });
    }

    // Verify service exists
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').get(service_id);
    if (!service) {
      return res.status(400).json({ error: 'Invalid or inactive service' });
    }

    // Check slot availability
    const conflict = db.prepare(`
      SELECT id FROM appointments
      WHERE appointment_date = ? AND appointment_time = ? AND status != 'cancelled'
    `).get(date, time);

    if (conflict) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    // --- upsert customer ---------------------------------------------------
    const createAppointment = db.transaction(() => {
      let customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);

      if (customer) {
        db.prepare(`
          UPDATE customers
          SET first_name = ?, last_name = ?, phone = ?,
              vehicle_make = ?, vehicle_model = ?, vehicle_year = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          first_name, last_name, phone || customer.phone,
          vehicle_make || customer.vehicle_make,
          vehicle_model || customer.vehicle_model,
          vehicle_year || customer.vehicle_year,
          customer.id
        );
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
      } else {
        const result = db.prepare(`
          INSERT INTO customers (first_name, last_name, email, phone, vehicle_make, vehicle_model, vehicle_year)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(first_name, last_name, email, phone || '', vehicle_make || '', vehicle_model || '', vehicle_year || '');
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
      }

      // --- create appointment ------------------------------------------------
      const apptResult = db.prepare(`
        INSERT INTO appointments (customer_id, location_id, service_id, appointment_date, appointment_time, status, notes)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).run(customer.id, location_id, service_id, date, time, notes || '');

      const appointment = db.prepare(`
        SELECT a.*, s.name AS service_name, s.duration_minutes, l.name AS location_name
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        JOIN locations l ON l.id = a.location_id
        WHERE a.id = ?
      `).get(apptResult.lastInsertRowid);

      return { appointment, customer };
    });

    const result = createAppointment();
    res.status(201).json(result);
  } catch (err) {
    console.error('POST /api/appointments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/appointments
 * Query params: ?status=pending&date=2025-06-01
 */
router.get('/admin/appointments', auth, (req, res) => {
  try {
    let sql = `
      SELECT a.*,
             c.first_name, c.last_name, c.email, c.phone,
             c.vehicle_make, c.vehicle_model, c.vehicle_year,
             s.name AS service_name, s.duration_minutes,
             l.name AS location_name
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services  s ON s.id = a.service_id
      JOIN locations l ON l.id = a.location_id
      WHERE 1=1
    `;
    const params = [];

    if (req.query.status) {
      sql += ' AND a.status = ?';
      params.push(req.query.status);
    }
    if (req.query.date) {
      sql += ' AND a.appointment_date = ?';
      params.push(req.query.date);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';

    const appointments = db.prepare(sql).all(...params);
    res.json(appointments);
  } catch (err) {
    console.error('GET /api/admin/appointments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/appointments/:id
 */
router.get('/admin/appointments/:id', auth, (req, res) => {
  try {
    const appointment = db.prepare(`
      SELECT a.*,
             c.first_name, c.last_name, c.email, c.phone,
             c.vehicle_make, c.vehicle_model, c.vehicle_year,
             s.name AS service_name, s.duration_minutes, s.category AS service_category,
             l.name AS location_name
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services  s ON s.id = a.service_id
      JOIN locations l ON l.id = a.location_id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    console.error('GET /api/admin/appointments/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/appointments/:id
 * Body: { status, appointment_date, appointment_time, notes }
 */
router.put('/admin/appointments/:id', auth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    const { status, appointment_date, appointment_time, notes } = req.body;

    // Validate status if provided
    const validStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // If changing date/time, check for conflicts
    const newDate = appointment_date || existing.appointment_date;
    const newTime = appointment_time || existing.appointment_time;

    if (appointment_date || appointment_time) {
      const conflict = db.prepare(`
        SELECT id FROM appointments
        WHERE appointment_date = ? AND appointment_time = ? AND status != 'cancelled' AND id != ?
      `).get(newDate, newTime, req.params.id);

      if (conflict) {
        return res.status(409).json({ error: 'This time slot is already booked' });
      }
    }

    db.prepare(`
      UPDATE appointments
      SET status = ?, appointment_date = ?, appointment_time = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status ?? existing.status,
      newDate,
      newTime,
      notes ?? existing.notes,
      req.params.id
    );

    // Return full details
    const updated = db.prepare(`
      SELECT a.*,
             c.first_name, c.last_name, c.email, c.phone,
             c.vehicle_make, c.vehicle_model, c.vehicle_year,
             s.name AS service_name, s.duration_minutes,
             l.name AS location_name
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services  s ON s.id = a.service_id
      JOIN locations l ON l.id = a.location_id
      WHERE a.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/appointments/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
