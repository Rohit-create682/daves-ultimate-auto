/**
 * Database initialisation — Dave's Ultimate Automotive
 *
 * • Opens (or creates) the SQLite file at server/db/daves_auto.db
 * • Runs schema.sql to ensure all tables exist
 * • Enables WAL journal mode & foreign-key enforcement
 * • Exports the synchronous better-sqlite3 instance
 */

const path = require('path');
const fs = require('fs');

// Load .env from project root (two levels up from this file)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const Database = require('better-sqlite3');

// --- paths -----------------------------------------------------------------
const DB_PATH     = path.join(__dirname, 'daves_auto.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// --- open / create database ------------------------------------------------
const db = new Database(DB_PATH);

// --- pragmas ---------------------------------------------------------------
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- run schema ------------------------------------------------------------
try {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('✅  Database initialised at', DB_PATH);
} catch (err) {
  console.error('❌  Failed to initialise database schema:', err.message);
  process.exit(1);
}

// --- graceful shutdown ------------------------------------------------------
process.on('exit', () => db.close());

module.exports = db;
