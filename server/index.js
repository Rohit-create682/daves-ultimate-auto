/**
 * Dave's Ultimate Automotive — Express Server
 *
 * Main entry point.  Sets up middleware, mounts routes, serves static
 * files, and provides the admin dashboard stats endpoint.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// --- Initialise database (runs schema on first require) --------------------
const db = require('./db/database');

// --- Express app -----------------------------------------------------------
const app = express();

// --- Global middleware -----------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in static HTML for now
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// --- Auth middleware (imported by routes that need it) ----------------------
const auth = require('./middleware/auth');

// --- Mount API routes ------------------------------------------------------
const authRoutes         = require('./routes/auth');
const servicesRoutes     = require('./routes/services');
const appointmentsRoutes = require('./routes/appointments');
const customersRoutes    = require('./routes/customers');
const reviewsRoutes      = require('./routes/reviews');
const contactRoutes      = require('./routes/contact');
const locationsRoutes    = require('./routes/locations');

// Public routes
app.use('/api/auth',         authRoutes);
app.use('/api/services',     servicesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/reviews',      reviewsRoutes);
app.use('/api/contact',      contactRoutes);
app.use('/api/locations',    locationsRoutes);

// Admin routes — the routers define their own sub-paths under /admin/*
// Services admin routes are mounted with a prefix so they resolve to /api/admin/services
app.use('/api',              servicesRoutes);      // handles /api/admin/services via router
app.use('/api',              appointmentsRoutes);   // handles /api/admin/appointments via router
app.use('/api/admin/customers',    customersRoutes);
app.use('/api',              reviewsRoutes);        // handles /api/admin/reviews via router
app.use('/api',              contactRoutes);        // handles /api/admin/contact-messages via router

// --- Admin Dashboard Stats -------------------------------------------------
app.get('/api/admin/dashboard', auth, (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Today's appointment count (non-cancelled)
    const todayAppointments = db.prepare(`
      SELECT COUNT(*) AS count FROM appointments
      WHERE appointment_date = ? AND status != 'cancelled'
    `).get(todayStr).count;

    // Pending appointments
    const pendingCount = db.prepare(`
      SELECT COUNT(*) AS count FROM appointments WHERE status = 'pending'
    `).get().count;

    // Total customers
    const totalCustomers = db.prepare(
      'SELECT COUNT(*) AS count FROM customers'
    ).get().count;

    // Unread contact messages
    const unreadMessages = db.prepare(
      'SELECT COUNT(*) AS count FROM contact_messages WHERE is_read = 0'
    ).get().count;

    // Recent appointments for today (with joined data)
    const recentAppointments = db.prepare(`
      SELECT a.*,
             c.first_name, c.last_name, c.phone,
             c.vehicle_make, c.vehicle_model, c.vehicle_year,
             s.name AS service_name, s.duration_minutes
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      JOIN services  s ON s.id = a.service_id
      WHERE a.appointment_date = ? AND a.status != 'cancelled'
      ORDER BY a.appointment_time ASC
    `).all(todayStr);

    res.json({
      todayAppointments,
      pendingCount,
      totalCustomers,
      unreadMessages,
      recentAppointments,
    });
  } catch (err) {
    console.error('GET /api/admin/dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Serve static files from public/ --------------------------------------
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Serve index.html for root and any unmatched GET (SPA fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- 404 for unknown API routes -------------------------------------------
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// --- Global error handler --------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start server ----------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚗  Dave's Ultimate Automotive server running on http://localhost:${PORT}`);
});
