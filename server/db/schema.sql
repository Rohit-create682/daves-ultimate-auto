-- ============================================================
-- Dave's Ultimate Automotive — Database Schema
-- ============================================================

-- Services offered by the shop
CREATE TABLE IF NOT EXISTS services (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  category        TEXT    NOT NULL DEFAULT 'General',
  icon            TEXT    NOT NULL DEFAULT 'wrench',
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
-- Locations / Shops
CREATE TABLE IF NOT EXISTS locations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  phone           TEXT    NOT NULL,
  address         TEXT    NOT NULL,
  city_state_zip  TEXT    NOT NULL,
  hours           TEXT    NOT NULL,
  rating_count    TEXT    NOT NULL DEFAULT '',
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
-- Customer records
CREATE TABLE IF NOT EXISTS customers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name      TEXT    NOT NULL,
  last_name       TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  phone           TEXT    NOT NULL DEFAULT '',
  vehicle_make    TEXT    NOT NULL DEFAULT '',
  vehicle_model   TEXT    NOT NULL DEFAULT '',
  vehicle_year    TEXT    NOT NULL DEFAULT '',
  notes           TEXT    NOT NULL DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Appointments linking customers to services
CREATE TABLE IF NOT EXISTS appointments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id      INTEGER NOT NULL,
  location_id      INTEGER NOT NULL,
  service_id       INTEGER NOT NULL,
  appointment_date TEXT    NOT NULL,  -- YYYY-MM-DD
  appointment_time TEXT    NOT NULL,  -- HH:MM
  status           TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'in-progress', 'completed', 'cancelled')),
  notes            TEXT    NOT NULL DEFAULT '',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id)  REFERENCES services  (id) ON DELETE CASCADE
);

-- Customer reviews / testimonials
CREATE TABLE IF NOT EXISTS reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name   TEXT    NOT NULL,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text            TEXT    NOT NULL DEFAULT '',
  is_featured     INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Admin / employee user accounts
CREATE TABLE IF NOT EXISTS admin_users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  full_name       TEXT    NOT NULL DEFAULT '',
  role            TEXT    NOT NULL DEFAULT 'employee'
                     CHECK (role IN ('admin', 'employee')),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  phone           TEXT    NOT NULL DEFAULT '',
  message         TEXT    NOT NULL,
  is_read         INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_customers_email     ON customers (email);
CREATE INDEX IF NOT EXISTS idx_services_active     ON services (is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_featured    ON reviews (is_featured);
CREATE INDEX IF NOT EXISTS idx_contact_read        ON contact_messages (is_read);
