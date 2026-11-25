import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMA_PATH = path.join(__dirname, 'database.sql');

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, originalHex] = String(stored).split(':');
  if (!salt || !originalHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  return derived.length === original.length && crypto.timingSafeEqual(derived, original);
}

export function createDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(schemaSql);
  seedDefaults(db);
  return db;
}

function seedDefaults(db) {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  if (count > 0) return;

  const demoEmail = 'demo@medbuddy.local';
  db.prepare(
    'INSERT INTO users (username, email, password_hash, address, phone) VALUES (?, ?, ?, ?, ?)',
  ).run('demo', demoEmail, hashPassword('Demo@1234'), '12 Wellness Ave, Chennai', '9876543210');

  db.prepare(
    'INSERT INTO appointments (user_email, doctor_name, department, appt_date, appt_time, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(demoEmail, 'Dr. Ramesh Kumar', 'Cardiology', '2026-12-02', '10:30', 'Confirmed', 'Annual checkup');

  db.prepare(
    'INSERT INTO medications (user_email, name, dosage, status) VALUES (?, ?, ?, ?)',
  ).run(demoEmail, 'Vitamin D 2000IU', 'Once daily after lunch', 'active');

  db.prepare(
    'INSERT INTO symptoms (user_email, symptom, notes, severity) VALUES (?, ?, ?, ?)',
  ).run(demoEmail, 'Mild headache', 'Hydrated and rested', 'mild');
}
